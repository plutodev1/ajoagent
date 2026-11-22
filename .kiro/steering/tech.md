# Tech

- Node 22, TypeScript (strict), ESM. Run with `tsx`.
- Chain: Celo mainnet (42220) via viem. No testnet in the product flow.
- Every transaction goes through `sendTagged()` in `src/chain.ts` (ERC-8021 attribution tag). Never call `sendTransaction` directly.
- FX: Textile FX v2 RFQ (`src/textile.ts`). Always broadcast `transactions.swap` exactly as returned.
- State: `data/circle.json` (single source of truth for rounds). The dashboard reads it; it never writes chain state.
- No private keys in frontend code, ever. Keys live only in `.env` on the machine running the agent.
