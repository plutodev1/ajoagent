# AjoAgent

**An agent that runs Ajo/Esusu savings circles on Celo and pays each member out in naira stablecoin.**

Ajo and Esusu circles move money for millions of Nigerians every month, and most still run on an exercise book and trust. AjoAgent does the organiser's hardest job for them:

1. Members contribute a fixed amount of **USD₮** each round to the agent wallet.
2. The agent watches the chain and marks who has paid.
3. When the pot is complete, it gets a **Textile FX** quote, converts the pot **USD₮ → cNGN** in one transaction, and pays the member whose turn it is.
4. It opens the next round and rotates until every member has been paid.

Every transaction AjoAgent sends carries an ERC-8021 attribution tag, and the agent is registered on the **ERC-8004** identity registry.

Built for Celo's *Agents Open for Business* hackathon (Stablecoin Corridors track). It follows on from [AjoBook](https://github.com/plutodev1/ajobook-stellar), my earlier onchain Ajo ledger. AjoAgent is new code, written from 20 Nov 2026.

## How it works

```
member wallets ──USD₮──▶ agent wallet ──Textile FX RFQ (USD₮→cNGN)──▶ agent wallet ──cNGN──▶ this round's recipient
                         (sync scans                                     (amount actually received
                          Transfer logs)                                  is what gets paid out)
```

| File | What it does |
|---|---|
| `src/chain.ts` | viem clients; `sendTagged()` appends the attribution tag to every tx |
| `src/textile.ts` | Textile FX v2 RFQ: preview, firm quote with keyless wallet proof, submit |
| `src/circle.ts` | circle state, contribution sync from USD₮ `Transfer` logs |
| `src/payout.ts` | quote → approve → swap → report → pay recipient → next round |
| `src/register.ts` | ERC-8004 `register` / `setAgentURI` |
| `src/cli.ts` | commands + the autonomous `run` loop |

## Setup

Needs Node 22+.

```bash
npm install
cp .env.example .env      # fill in AGENT_PRIVATE_KEY and ATTRIBUTION_CODE
npm run ajo -- whoami     # prints the agent wallet address
```

Use a **fresh wallet** for the agent. Fund it with a little CELO for gas. Members fund the pot.

Keep `DRY_RUN=1` until you've checked the output. Every transaction is printed instead of sent.

## Run a circle

```bash
cp data/circle.example.json data/my-circle.json   # edit names, wallets, contribution
npm run ajo -- init data/my-circle.json
npm run ajo -- preview 2          # check the USD₮→cNGN rate for 2 USD₮
npm run ajo -- status
npm run ajo -- run 60             # sync every 60s, pay out automatically when the pot is full
```

Or step by step: `sync`, `status`, `payout`.

## Register the agent (ERC-8004)

```bash
# after pushing, agent.json is public at:
npm run ajo -- register https://raw.githubusercontent.com/plutodev1/ajoagent/main/agent.json
```

Copy the printed `registrations` entry into `agent.json`, then push again.

## Verify a transaction is tagged

```bash
npm run ajo -- verify 0x<txHash>
```

## Hackathon rules this follows

- Celo mainnet only. Corridor: USD₮ ↔ cNGN on Textile FX.
- Attribution tag on every transaction (`sendTagged`).
- ERC-8004 registration from the agent wallet.
- Payouts go to circle members outside the team.

## License

MIT
