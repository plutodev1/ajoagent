# Ajo Dashboard

Read-only web UI for an Ajo savings circle. Exercise-book aesthetic, phone-first.

## Dev

```bash
# From web/
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # preview the dist/ build
```

## Data

The page fetches `circle.json` from the same origin (`public/circle.json` in dev,
`dist/circle.json` in production). In production, copy the agent's `data/circle.json`
into `web/public/` and rebuild on each payout — or serve the file directly from the
agent host at `/circle.json`.

For local development, `public/circle.json` is a copy of `data/circle.dev.json`
(the fixture with 2 completed rounds and 1 open round).

## Deploy

### Vercel

```bash
# Root: web/
# Build command: npm run build
# Output dir: dist
```

### GitHub Pages

```bash
npm run build
# commit dist/ or use gh-pages action
```

After deploying, update `agent.json` → `services[name=web].endpoint` to the live URL.
