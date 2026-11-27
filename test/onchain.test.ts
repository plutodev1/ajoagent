import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { verifyTx } from '@celo/attribution-tags'
import { erc20Abi, type Hex } from 'viem'
import { CHAIN_ID, ERC8004_IDENTITY_REGISTRY, TOKENS } from '../src/config.js'
import { pub } from '../src/chain.js'

/**
 * Read-only checks against Celo mainnet. No key, no funds, nothing is sent.
 * These assert that the real payment flow happened and is correctly tagged.
 */

const AGENT = '0xd3775dF8985310aCa976d4ed9413664d208f0d00'
const TAG = 'celo_e6beca1e3d05'
const AGENT_ID = 10105n

const TXS: Record<string, Hex> = {
  'ERC-8004 registration': '0xf334706a1f711841698e8dfd1832222d65347f058fdf5019c249259522b88a07',
  'approve USD₮': '0x08172495da8bdeabc51e9043ce74f629a78b1c2f25abb083626f614c60847b91',
  'Textile FX swap': '0x779311efad7c3c0613326d5d93e7427303827098f676e8a4190ff07926cf33ae',
  'cNGN payout': '0x8c8c44e877e3e4eb643409c1233d0b0c6bc3caf6e10c0b8dd23b6ac1bd826777',
}

let online = true

describe('onchain: the real circle', () => {
  before(async () => {
    try {
      await pub.getBlockNumber()
    } catch {
      online = false
      console.log('  (no network — skipping onchain checks)')
    }
  })

  test('connected to Celo mainnet', { skip: !online }, async () => {
    assert.equal(await pub.getChainId(), CHAIN_ID)
  })

  for (const [label, hash] of Object.entries(TXS)) {
    test(`${label} succeeded and carries the attribution tag`, { skip: !online }, async () => {
      const receipt = await pub.getTransactionReceipt({ hash })
      assert.equal(receipt.status, 'success', `${label} reverted`)

      const { codes } = await verifyTx({ client: pub, hash })
      assert.ok(codes.includes(TAG), `${label} is missing the ERC-8021 tag: got ${JSON.stringify(codes)}`)
    })
  }

  test('the agent owns ERC-8004 identity 10105', { skip: !online }, async () => {
    const owner = await pub.readContract({
      address: ERC8004_IDENTITY_REGISTRY,
      abi: [{ type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] }] as const,
      functionName: 'ownerOf',
      args: [AGENT_ID],
    })
    assert.equal(owner.toLowerCase(), AGENT.toLowerCase())
  })

  test('USD₮ and cNGN are both 6 decimals', { skip: !online }, async () => {
    // The dashboard formats amounts with these; a change here silently corrupts every figure shown.
    for (const token of [TOKENS.USDT, TOKENS.cNGN]) {
      const d = await pub.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' })
      assert.equal(d, 6)
    }
  })

  test('the agent wallet settled clean — no funds stranded', { skip: !online }, async () => {
    for (const token of [TOKENS.USDT, TOKENS.cNGN]) {
      const bal = await pub.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [AGENT] })
      assert.equal(bal, 0n, 'payout should leave nothing behind in the agent wallet')
    }
  })
})
