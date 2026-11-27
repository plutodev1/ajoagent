# AjoAgent

**An agent that runs Ajo/Esusu savings circles on Celo and pays each member out in naira stablecoin.**

Ajo and Esusu circles move money for millions of Nigerians every month, and most still run on an exercise book and trust. AjoAgent does the organiser's hardest job for them:

1. Members contribute a fixed amount of **USD₮** each round to the agent wallet.
2. The agent watches the chain and marks who has paid.
3. When the pot is complete, it gets a **Textile FX** quote, converts the pot **USD₮ → cNGN** in one transaction, and pays the member whose turn it is.
4. It opens the next round and rotates until every member has been paid.

Every transaction AjoAgent sends carries an ERC-8021 attribution tag, and the agent is registered on the **ERC-8004** identity registry.

Built for Celo's *Agents Open for Business* hackathon (Stablecoin Corridors track). It follows on from [AjoBook](https://github.com/plutodev1/ajobook-stellar), my earlier onchain Ajo ledger. AjoAgent is new code, written from 20 Nov 2026.

## Live on Celo mainnet

**Member dashboard: https://ajoagent-dashboard.vercel.app** — read-only, no wallet connection, works on a cheap phone. It is showing a real circle.

| | |
|---|---|
| Agent wallet | [`0xd3775dF8985310aCa976d4ed9413664d208f0d00`](https://celoscan.io/address/0xd3775dF8985310aCa976d4ed9413664d208f0d00) |
| ERC-8004 agent ID | [**10105** on 8004scan](https://8004scan.io/agents/celo/10105) |
| Attribution tag | `celo_e6beca1e3d05` — on every transaction below |

Round 1 of "Pluto Circle" collected 1 USD₮ from two members and paid out **1,441.969372 cNGN**:

| Step | Transaction |
|---|---|
| ERC-8004 registration | [`0xf334706a…`](https://celoscan.io/tx/0xf334706a1f711841698e8dfd1832222d65347f058fdf5019c249259522b88a07) |
| Approve USD₮ to the Textile reactor | [`0x08172495…`](https://celoscan.io/tx/0x08172495da8bdeabc51e9043ce74f629a78b1c2f25abb083626f614c60847b91) |
| Textile FX swap USD₮ → cNGN | [`0x779311ef…`](https://celoscan.io/tx/0x779311efad7c3c0613326d5d93e7427303827098f676e8a4190ff07926cf33ae) |
| cNGN payout to the member | [`0x8c8c44e8…`](https://celoscan.io/tx/0x8c8c44e877e3e4eb643409c1233d0b0c6bc3caf6e10c0b8dd23b6ac1bd826777) |

Check any of them yourself: `npm test` verifies the attribution tag on all four onchain.

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

## Tests

```bash
npm test
```

Covers the circle state machine (rotation order, pot arithmetic, the `pending` guard that
stops a crashed payout from swapping twice), the integrity of the shipped circle data, and
read-only checks against Celo mainnet: that all four transactions of the real payout
succeeded and carry the attribution tag, that the agent owns ERC-8004 identity 10105, and
that the agent wallet settled clean. No key and no funds are needed — nothing is sent.
Onchain checks skip automatically when offline.

## Hackathon rules this follows

- Celo mainnet only. Corridor: USD₮ ↔ cNGN on Textile FX.
- Attribution tag on every transaction (`sendTagged`).
- ERC-8004 registration from the agent wallet.
- Payouts go to circle members outside the team.

## License

MIT
