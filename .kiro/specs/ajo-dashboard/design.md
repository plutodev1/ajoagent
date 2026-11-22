# Design: Ajo Dashboard

- Static site in `web/` (Vite + vanilla TS or React, your call in Kiro).
- Data: fetch `circle.json`. Amounts are base units; format USD₮ with 6 decimals and cNGN using its token decimals.
- Visual: "exercise book" look: ruled lines, margin line, handwritten-style headings, one table per round.
- Deploy: Vercel or GitHub Pages. Copy `data/circle.json` into the build on each payout (or serve it from the agent host).
