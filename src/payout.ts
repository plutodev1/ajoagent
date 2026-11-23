import { erc20Abi, type Address, type Hex } from 'viem'
import { DRY_RUN, TOKENS } from './config.js'
import { agentAccount, approveData, balanceOf, fmt, pub, sendTagged, transferData } from './chain.js'
import { currentRound, memberName, outstanding, saveCircle, type Circle, type Round } from './circle.js'
import { requestFirmQuote, rfqStatus, submitTx } from './textile.js'

/** An RFQ maker can fill a few blocks after our swap lands, so don't read the balance once and give up. */
const SETTLE_TIMEOUT_MS = 120_000
const SETTLE_POLL_MS = 5_000

async function waitForCngn(agent: Address, before: bigint): Promise<bigint> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS
  for (;;) {
    const received = (await balanceOf(TOKENS.cNGN, agent)) - before
    if (received > 0n) return received
    if (Date.now() >= deadline) return 0n
    console.log(`  waiting for cNGN to settle… (${Math.round((deadline - Date.now()) / 1000)}s left)`)
    await new Promise((r) => setTimeout(r, SETTLE_POLL_MS))
  }
}

/**
 * Finish a round whose swap is already onchain: report it to Textile, wait for the
 * cNGN to arrive, pay the recipient, record the payout and open the next round.
 *
 * Safe to run again after any failure. `round.pending` stays on disk until the
 * recipient has actually been paid, so a retry resumes here instead of swapping twice.
 */
async function settle(c: Circle, r: Round) {
  const p = r.pending!
  const agent = agentAccount().address

  await submitTx(p.rfqId, p.claimToken, p.swapTx)

  const received = await waitForCngn(agent, BigInt(p.cngnBefore))
  if (received <= 0n) {
    const status = await rfqStatus(p.rfqId, p.claimToken).catch(() => null)
    throw new Error(
      `Swap ${p.swapTx} is onchain but no cNGN arrived within ${SETTLE_TIMEOUT_MS / 1000}s. ` +
        `Nothing is lost - run payout again to resume from here. ` +
        `RFQ ${p.rfqId}${status ? `: ${JSON.stringify(status)}` : ''}`,
    )
  }

  const payoutTx = await sendTagged('cNGN payout', TOKENS.cNGN, transferData(r.recipient, received))

  r.payout = {
    rfqId: p.rfqId,
    usdtIn: p.usdtIn,
    cngnOut: received.toString(),
    swapTx: p.swapTx,
    payoutTx: payoutTx as Hex,
    at: new Date().toISOString(),
  }
  delete r.pending

  // rotation
  const nextIndex = r.index + 1
  if (nextIndex < c.members.length) {
    c.rounds.push({ index: nextIndex, recipient: c.members[nextIndex].wallet as Address, contributions: [] })
  } else {
    console.log('Every member has now been paid. Circle complete.')
  }
  saveCircle(c)
  console.log(`Paid ${memberName(c, r.recipient)} ${await fmt(TOKENS.cNGN, received)}. https://celoscan.io/tx/${payoutTx}`)
}

/**
 * Pay the current round's recipient:
 *   1. firm quote USD₮ -> cNGN on Textile FX for the whole pot
 *   2. approve takerPays to the reactor (reset to 0 first, USD₮-style)
 *   3. broadcast transactions.swap exactly as returned (+ our attribution tag)
 *   4. record the swap to disk, then settle: report it, wait for cNGN, pay the recipient
 */
export async function payoutRound(c: Circle, opts: { force?: boolean } = {}) {
  const r = currentRound(c)
  if (r.payout) throw new Error(`Round ${r.index + 1} already paid`)

  // A previous run broadcast the swap but never finished paying out. Resume; do not swap again.
  if (r.pending) {
    console.log(`Round ${r.index + 1}: resuming swap ${r.pending.swapTx} (rfq ${r.pending.rfqId})`)
    return settle(c, r)
  }

  const owing = await outstanding(c)
  if (owing.length && !opts.force) {
    throw new Error(`Still waiting on: ${owing.map((m) => m.name).join(', ')}. Use --force to pay out early.`)
  }
  const pot = r.contributions.reduce((s, x) => s + BigInt(x.amount), 0n)
  if (pot === 0n) throw new Error('Pot is empty')
  const agent = agentAccount().address
  const recipient = r.recipient
  console.log(`Round ${r.index + 1}: paying ${memberName(c, recipient)} a pot of ${await fmt(TOKENS.USDT, pot)}`)

  const usdtBal = await balanceOf(TOKENS.USDT, agent)
  if (usdtBal < pot) throw new Error(`Agent holds ${await fmt(TOKENS.USDT, usdtBal)}, less than the pot`)

  // 1. firm quote
  const q = await requestFirmQuote(TOKENS.USDT, TOKENS.cNGN, pot)
  if (!q.quote || !q.transactions?.swap) throw new Error(`Unexpected Textile response: ${JSON.stringify(q)}`)
  const takerPays = BigInt(q.quote.takerPays)
  console.log(`Quote ${q.rfqId}: pay ${await fmt(TOKENS.USDT, takerPays)} -> get ${await fmt(TOKENS.cNGN, BigInt(q.quote.buyAmount))} (expires ${q.quote.expiresAt})`)

  // 2. approval
  const reactor = q.quote.reactor
  const allowance = await pub.readContract({ address: TOKENS.USDT, abi: erc20Abi, functionName: 'allowance', args: [agent, reactor] })
  if (allowance < takerPays) {
    if (allowance > 0n) await sendTagged('reset allowance', TOKENS.USDT, approveData(reactor, 0n))
    await sendTagged('approve USD₮', TOKENS.USDT, approveData(reactor, takerPays))
  }

  // 3. swap
  if (Date.now() >= Date.parse(q.quote.expiresAt)) throw new Error('Quote expired before broadcast. Run payout again for a fresh quote.')
  const cngnBefore = await balanceOf(TOKENS.cNGN, agent)
  const swap = q.transactions.swap
  const swapTx = await sendTagged('Textile FX swap', swap.to, swap.data, BigInt(swap.value || '0'))
  if (DRY_RUN) {
    await sendTagged('cNGN payout', TOKENS.cNGN, transferData(recipient, BigInt(q.quote.buyAmount)))
    console.log('[dry-run] done. Nothing was sent.')
    return
  }

  // 4. Persist before anything else can fail. This is what makes a retry safe:
  //    from here on the swap is onchain and must not be repeated.
  r.pending = {
    rfqId: q.rfqId,
    claimToken: q.claimToken,
    usdtIn: takerPays.toString(),
    cngnBefore: cngnBefore.toString(),
    swapTx: swapTx as Hex,
    at: new Date().toISOString(),
  }
  saveCircle(c)

  await settle(c, r)
}
