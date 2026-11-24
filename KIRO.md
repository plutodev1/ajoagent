# How I used Kiro

AjoAgent has two halves: an agent that runs Ajo savings circles on Celo mainnet, and a
member-facing dashboard that makes what the agent does visible to people who don't read
block explorers. **Kiro built the dashboard, spec-first, from a written specification and
three steering files.** 609 words of spec became 810 lines of working, deployed frontend.

Live: https://ajoagent-dashboard.vercel.app

## Steering: the constraints that mattered

Before writing any spec I put three steering files in `.kiro/steering/`. They are short on
purpose — they describe the things that are easy to get wrong and expensive to undo.

- **`product.md`** — who this is for. "Nigerian savings groups, many new to crypto. Plain
  language, naira-first, mobile-first. Trust is the product: every contribution and payout
  must be visible and verifiable."
- **`tech.md`** — the hard rules. Celo mainnet only, no testnet in the product flow. Every
  transaction goes through `sendTagged()` for its ERC-8021 attribution tag, never
  `sendTransaction` directly. **No private keys in frontend code, ever.**
- **`structure.md`** — where things live, and specifically that `web/` is built from the
  spec while `src/` is the agent core.

These did real work. The dashboard Kiro produced reads `circle.json` and renders it — it
has no wallet connection, no signing, no write path of any kind. That wasn't something I
had to correct; it fell out of the steering rules.

## Specs: requirements → design → tasks

`.kiro/specs/ajo-dashboard/` holds the three-document flow.

**`requirements.md`** states five requirements as user stories with testable acceptance
criteria, e.g.

> WHEN all members have paid THEN it SHALL show "Pot complete, payout pending".

**`design.md`** deliberately left choices open — "Vite + vanilla TS or React, your call" —
so Kiro could decide. It picked vanilla TypeScript. Given Requirement 5 ("usable on a
low-end Android phone on 3G") that was the right call, and the result is **2.4 kB of JS and
1.5 kB of CSS gzipped**.

**`tasks.md`** broke it into 8 tasks. Kiro checked each one off as it completed it, so the
file is an honest record of the build rather than something written afterwards.

The whole dashboard — `types.ts`, `format.ts`, `main.ts`, `style.css`, the exercise-book
visual theme — came out of one Kiro session against that spec.

## Hooks: wiring the agent to the dashboard

`.kiro/hooks/rebuild-dashboard.json` watches `data/circle.json` — the file the agent writes
after every payout — and rebuilds the dashboard when it changes. The agent finishes a round,
the dashboard updates itself. No manual step in between.

## Where Kiro's judgement showed

Three decisions I didn't specify:

1. **Vanilla TS over React**, weighed against the 3G requirement.
2. **A demo-data banner.** The dashboard currently renders a fixture whose transaction
   hashes are fake. Rather than hide that, Kiro detects the fixture's `_comment` field and
   shows "Demo data — transaction links will 404 on Celoscan. This is expected." It appears
   only when the data is demo data. For a product whose entire pitch is verifiability,
   quietly showing unverifiable links would have been the worse failure.
3. **Self-hosting the font.** The exercise-book theme uses a handwriting face, originally
   pulled from Google Fonts. Asked to reconsider against the 3G requirement, Kiro replaced
   it with a 74 kB local `@font-face`. The deployed page now makes **zero third-party
   requests**.

## What Kiro did not build

The agent core in `src/` — the Celo client, the Textile FX RFQ integration, the ERC-8004
registration, the payout state machine — predates the dashboard work and was not written in
Kiro. I'm saying so plainly because the git history shows it.

What Kiro contributed is the entire member-facing product: the thing an Ajo member actually
opens, and the only part of this project a non-technical user ever touches. The steering
files are also what kept the two halves coherent — the dashboard reads the agent's state
format correctly, links to the right explorers, and renders the agent's real ERC-8004
identity (#10105), because the steering files told it how this system is shaped.

## Verified, not assumed

Every claim above is checkable:

- Dashboard: https://ajoagent-dashboard.vercel.app
- Agent on ERC-8004: https://8004scan.io/agents/celo/10105
- Registration transaction: https://celoscan.io/tx/0xf334706a1f711841698e8dfd1832222d65347f058fdf5019c249259522b88a07
- Source: https://github.com/plutodev1/ajoagent
