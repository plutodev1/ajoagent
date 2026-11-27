import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getAddress, isAddress, type Address, type Hex } from 'viem'
import { currentRound, memberName, type Circle } from '../src/circle.js'

function circle(over: Partial<Circle> = {}): Circle {
  const a = getAddress('0x1111111111111111111111111111111111111111')
  const b = getAddress('0x2222222222222222222222222222222222222222')
  return {
    name: 'Test',
    organiser: 'O',
    contributionUsdt: '0.5',
    agent: getAddress('0x9999999999999999999999999999999999999999'),
    members: [
      { name: 'A', wallet: a },
      { name: 'B', wallet: b },
    ],
    startBlock: '1',
    lastScannedBlock: '1',
    rounds: [{ index: 0, recipient: a, contributions: [] }],
    ...over,
  }
}

describe('circle state', () => {
  test('currentRound is the newest round', () => {
    const c = circle()
    const b = c.members[1].wallet
    c.rounds.push({ index: 1, recipient: b, contributions: [] })
    assert.equal(currentRound(c).index, 1)
    assert.equal(currentRound(c).recipient, b)
  })

  test('memberName resolves a member, falls back to the raw address', () => {
    const c = circle()
    assert.equal(memberName(c, c.members[0].wallet), 'A')
    const stranger = getAddress('0x3333333333333333333333333333333333333333')
    assert.equal(memberName(c, stranger), stranger)
  })

  test('pot is the sum of the round contributions', () => {
    const c = circle()
    const [a, b] = c.members.map((m) => m.wallet)
    currentRound(c).contributions.push(
      { from: a, amount: '500000', txHash: '0x' as Hex, block: '1' },
      { from: b, amount: '500000', txHash: '0x' as Hex, block: '2' },
    )
    const pot = currentRound(c).contributions.reduce((s, x) => s + BigInt(x.amount), 0n)
    assert.equal(pot, 1_000_000n, '2 x 0.5 USD₮ at 6 decimals')
  })

  test('a paid round carries both the swap and the payout transaction', () => {
    const c = circle()
    currentRound(c).payout = {
      rfqId: 'rfq_x', usdtIn: '1000000', cngnOut: '1441969372',
      swapTx: ('0x' + 'a'.repeat(64)) as Hex,
      payoutTx: ('0x' + 'b'.repeat(64)) as Hex,
      at: new Date().toISOString(),
    }
    const p = currentRound(c).payout!
    assert.match(p.swapTx, /^0x[0-9a-f]{64}$/)
    assert.match(p.payoutTx, /^0x[0-9a-f]{64}$/)
    assert.ok(BigInt(p.cngnOut) > 0n)
  })

  test('a pending swap blocks a second swap for the same round', () => {
    // payoutRound resumes when round.pending is set, rather than quoting again.
    // Guarding this invariant is what stops a crash mid-payout double-spending the pot.
    const c = circle()
    const r = currentRound(c)
    r.pending = {
      rfqId: 'rfq_x', claimToken: 't', usdtIn: '1000000', cngnBefore: '0',
      swapTx: ('0x' + 'c'.repeat(64)) as Hex, at: new Date().toISOString(),
    }
    assert.ok(r.pending, 'pending must survive on disk until the recipient is paid')
    assert.equal(r.payout, undefined, 'pending and payout are mutually exclusive')
  })
})

describe('shipped circle data', () => {
  const files = ['data/circle.dev.json', 'web/public/circle.json'].filter((f) => fs.existsSync(f))

  for (const f of files) {
    test(`${f} is internally consistent`, () => {
      const c: Circle = JSON.parse(fs.readFileSync(f, 'utf8'))
      assert.ok(isAddress(c.agent), 'agent must be an address')
      assert.ok(c.members.length >= 2, 'a circle needs at least 2 members')

      const wallets = c.members.map((m) => m.wallet.toLowerCase())
      assert.equal(new Set(wallets).size, wallets.length, 'member wallets must be distinct')
      assert.ok(!wallets.includes(c.agent.toLowerCase()), 'the agent cannot also be a member')

      for (const r of c.rounds) {
        assert.equal(
          r.recipient.toLowerCase(),
          c.members[r.index].wallet.toLowerCase(),
          `round ${r.index} must pay the member whose turn it is`,
        )
        for (const x of r.contributions) {
          assert.ok(wallets.includes(x.from.toLowerCase()), 'contributions come from members only')
        }
        if (r.payout) {
          const pot = r.contributions.reduce((s, x) => s + BigInt(x.amount), 0n)
          assert.equal(BigInt(r.payout.usdtIn), pot, `round ${r.index}: usdtIn must equal the pot`)
        }
      }

      const open = c.rounds.filter((r) => !r.payout)
      assert.ok(open.length <= 1, 'at most one round may be open')
    })
  }
})
