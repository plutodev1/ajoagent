import { erc20Abi, type Address, type Hex } from 'viem'
import { DRY_RUN, TOKENS } from './config.js'
import { agentAccount, approveData, balanceOf, fmt, pub, sendTagged, transferData } from './chain.js'
import { currentRound, memberName, outstanding, saveCircle, type Circle } from './circle.js'
import { requestFirmQuote, submitTx } from './textile.js'

/**
 * Pay the current round's recipient:
 *   1. firm quote USD₮ -> cNGN on Textile FX for the whole pot
 *   2. approve takerPays to the reactor (reset to 0 first, USD₮-style)
 *   3. broadcast transactions.swap exactly as returned (+ our attribution tag)
 *   4. report the hash to Textile
 *   5. transfer the cNGN received to the recipient (tagged)
 *   6. open the next round
 */
export async function payoutRound(c: Circle, opts: { force?: boolean } = {}) {
  const r = currentRound(c)
  if (r.payout) throw new Error(`Round ${r.index + 1} already paid`)
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

  // 4. report
  await submitTx(q.rfqId, q.claimToken, swapTx as Hex)

  // 5. pay recipient what actually arrived
  const received = (await balanceOf(TOKENS.cNGN, agent)) - cngnBefore
  if (received <= 0n) throw new Error(`Swap confirmed but no cNGN arrived yet. Check rfq ${q.rfqId} status.`)
  const payoutTx = await sendTagged('cNGN payout', TOKENS.cNGN, transferData(recipient, received))

  r.payout = {
    rfqId: q.rfqId,
    usdtIn: takerPays.toString(),
    cngnOut: received.toString(),
    swapTx: swapTx as Hex,
    payoutTx: payoutTx as Hex,
    at: new Date().toISOString(),
  }
  // 6. next round (rotation)
  const nextIndex = r.index + 1
  if (nextIndex < c.members.length) {
    c.rounds.push({ index: nextIndex, recipient: c.members[nextIndex].wallet as Address, contributions: [] })
  } else {
    console.log('Every member has now been paid. Circle complete.')
  }
  saveCircle(c)
  console.log(`Paid ${memberName(c, recipient)} ${await fmt(TOKENS.cNGN, received)}. https://celoscan.io/tx/${payoutTx}`)
}
