import { verifyTx } from '@celo/attribution-tags'
import { parseUnits, type Hex } from 'viem'
import { DRY_RUN, TOKENS } from './config.js'
import { agentAccount, balanceOf, fmt, pub } from './chain.js'
import { currentRound, initCircle, loadCircle, memberName, outstanding, syncContributions, contributionUnits } from './circle.js'
import { payoutRound } from './payout.js'
import { registerAgent, updateAgentURI } from './register.js'
import { preview } from './textile.js'

const [cmd, ...args] = process.argv.slice(2)

async function status() {
  const c = loadCircle()
  const agent = agentAccount().address
  const r = currentRound(c)
  const need = await contributionUnits(c)
  console.log(`\n${c.name}  (organiser: ${c.organiser})`)
  console.log(`Agent wallet: ${agent}`)
  console.log(`Holds: ${await fmt(TOKENS.USDT, await balanceOf(TOKENS.USDT, agent))}, ${await fmt(TOKENS.cNGN, await balanceOf(TOKENS.cNGN, agent))}`)
  console.log(`Contribution: ${await fmt(TOKENS.USDT, need)} per member per round\n`)
  for (const round of c.rounds) {
    const label = round.payout ? `PAID ${await fmt(TOKENS.cNGN, BigInt(round.payout.cngnOut))}` : 'open'
    console.log(`Round ${round.index + 1} -> ${memberName(c, round.recipient)}  [${label}]`)
  }
  const owing = await outstanding(c)
  console.log(`\nRound ${r.index + 1}: ${c.members.length - owing.length}/${c.members.length} paid in.` + (owing.length ? ` Waiting on ${owing.map((m) => m.name).join(', ')}.` : ' Ready to pay out.'))
}

async function run(intervalSec: number) {
  console.log(`AjoAgent running every ${intervalSec}s${DRY_RUN ? ' (DRY RUN)' : ''}. Ctrl+C to stop.`)
  for (;;) {
    try {
      const c = loadCircle()
      if (currentRound(c).payout) { console.log('Circle complete.'); return }
      const n = await syncContributions(c)
      if (n) console.log(`Credited ${n} new contribution(s).`)
      if ((await outstanding(c)).length === 0) await payoutRound(c)
    } catch (e) {
      console.error('tick error:', (e as Error).message)
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000))
  }
}

const help = `AjoAgent: pays Ajo circles out in cNGN on Celo

  npm run ajo -- init <template.json>      create data/circle.json from a template
  npm run ajo -- status                    show rounds, who has paid, balances
  npm run ajo -- sync                      scan USD₮ contributions into the agent wallet
  npm run ajo -- preview <usdtAmount>      free Textile FX USD₮->cNGN price check
  npm run ajo -- payout [--force]          convert the pot and pay this round's recipient
  npm run ajo -- run [seconds]             autonomous loop: sync, pay out when everyone has paid
  npm run ajo -- register <agentJsonUrl>   register on ERC-8004 identity registry
  npm run ajo -- set-uri <agentId> <url>   update the ERC-8004 agent URI
  npm run ajo -- verify <txHash>           check a tx carries our attribution tag
  npm run ajo -- whoami                    print the agent wallet address

DRY_RUN=1 in .env prints every transaction without sending it.`

async function main() {
  switch (cmd) {
    case 'init': {
      const c = await initCircle(args[0] ?? 'data/circle.example.json')
      console.log(`Created circle "${c.name}" with ${c.members.length} members. Members send USD₮ to ${agentAccount().address}`)
      break
    }
    case 'status': await status(); break
    case 'sync': {
      const c = loadCircle()
      console.log(`Credited ${await syncContributions(c)} new contribution(s).`)
      await status()
      break
    }
    case 'preview': {
      const amt = parseUnits(args[0] ?? '1', 6)
      console.log(JSON.stringify(await preview(TOKENS.USDT, TOKENS.cNGN, amt), null, 2))
      break
    }
    case 'payout': await payoutRound(loadCircle(), { force: args.includes('--force') }); break
    case 'run': await run(Number(args[0] ?? 60)); break
    case 'register': await registerAgent(args[0]); break
    case 'set-uri': await updateAgentURI(BigInt(args[0]), args[1]); break
    case 'verify': console.log(await verifyTx({ client: pub, hash: args[0] as Hex })); break
    case 'whoami': console.log(agentAccount().address); break
    default: console.log(help)
  }
}

main().catch((e) => { console.error((e as Error).message); process.exit(1) })
