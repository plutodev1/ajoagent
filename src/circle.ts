import fs from 'node:fs'
import path from 'node:path'
import { getAddress, isAddress, parseAbiItem, type Address, type Hex } from 'viem'
import { TOKENS } from './config.js'
import { pub, agentAccount, tokenInfo } from './chain.js'

/**
 * An Ajo circle: N members each contribute a fixed amount of USD₮ every round.
 * Each round, one member (in rotation order) receives the whole pot, paid out in cNGN.
 */
export type Member = { name: string; wallet: Address }
export type Contribution = { from: Address; amount: string; txHash: Hex; block: string }
export type Payout = {
  rfqId: string
  usdtIn: string
  cngnOut: string
  swapTx: Hex
  payoutTx: Hex
  at: string
}
export type Round = { index: number; recipient: Address; contributions: Contribution[]; payout?: Payout }
export type Circle = {
  name: string
  organiser: string
  contributionUsdt: string // human units, e.g. "5"
  agent: Address // agent wallet; members send their USD₮ here
  agentId?: string // ERC-8004 agent ID, once `register` has run
  members: Member[] // rotation order
  startBlock: string
  lastScannedBlock: string
  rounds: Round[]
}

export const CIRCLE_FILE = path.resolve('data/circle.json')

export function loadCircle(): Circle {
  if (!fs.existsSync(CIRCLE_FILE)) throw new Error('No circle yet. Run: npm run ajo -- init data/circle.example.json')
  return JSON.parse(fs.readFileSync(CIRCLE_FILE, 'utf8'))
}

export function saveCircle(c: Circle) {
  fs.mkdirSync(path.dirname(CIRCLE_FILE), { recursive: true })
  fs.writeFileSync(CIRCLE_FILE, JSON.stringify(c, null, 2))
}

export async function initCircle(templatePath: string) {
  const t = JSON.parse(fs.readFileSync(templatePath, 'utf8'))
  if (!t.members?.length || t.members.length < 2) throw new Error('A circle needs at least 2 members')
  const members: Member[] = t.members.map((m: { name: string; wallet: string }) => {
    if (!isAddress(m.wallet)) throw new Error(`Bad wallet for ${m.name}: ${m.wallet}`)
    return { name: m.name, wallet: getAddress(m.wallet) }
  })
  const agent = agentAccount().address
  if (members.some((m) => m.wallet === agent)) throw new Error('The agent wallet cannot also be a member')
  const block = await pub.getBlockNumber()
  const c: Circle = {
    name: t.name,
    organiser: t.organiser,
    contributionUsdt: String(t.contributionUsdt),
    agent,
    members,
    startBlock: block.toString(),
    lastScannedBlock: block.toString(),
    rounds: [{ index: 0, recipient: members[0].wallet, contributions: [] }],
  }
  saveCircle(c)
  return c
}

export function currentRound(c: Circle): Round {
  return c.rounds[c.rounds.length - 1]
}

export function memberName(c: Circle, w: Address) {
  return c.members.find((m) => m.wallet === w)?.name ?? w
}

export async function contributionUnits(c: Circle): Promise<bigint> {
  const { decimals } = await tokenInfo(TOKENS.USDT)
  const [whole, frac = ''] = c.contributionUsdt.split('.')
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0')
}

/** Members who still owe this round. */
export async function outstanding(c: Circle): Promise<Member[]> {
  const need = await contributionUnits(c)
  const r = currentRound(c)
  return c.members.filter((m) => {
    const paid = r.contributions.filter((x) => x.from === m.wallet).reduce((s, x) => s + BigInt(x.amount), 0n)
    return paid < need
  })
}

const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

/** Scan USD₮ transfers from members into the agent wallet and credit them to the open round. */
export async function syncContributions(c: Circle): Promise<number> {
  const agent = agentAccount().address
  const head = await pub.getBlockNumber()
  let from = BigInt(c.lastScannedBlock) + 1n
  let credited = 0
  const memberSet = new Set(c.members.map((m) => m.wallet))
  const seen = new Set(c.rounds.flatMap((r) => r.contributions.map((x) => x.txHash)))
  const STEP = 5_000n
  while (from <= head) {
    const to = from + STEP - 1n > head ? head : from + STEP - 1n
    const logs = await pub.getLogs({ address: TOKENS.USDT, event: transferEvent, args: { to: agent }, fromBlock: from, toBlock: to })
    for (const l of logs) {
      const sender = getAddress(l.args.from!)
      if (!memberSet.has(sender) || seen.has(l.transactionHash)) continue
      currentRound(c).contributions.push({
        from: sender,
        amount: l.args.value!.toString(),
        txHash: l.transactionHash,
        block: l.blockNumber.toString(),
      })
      seen.add(l.transactionHash)
      credited++
    }
    c.lastScannedBlock = to.toString()
    from = to + 1n
  }
  saveCircle(c)
  return credited
}
