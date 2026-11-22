import crypto from 'node:crypto'
import { toHex, type Address, type Hex } from 'viem'
import { CHAIN_ID, TEXTILE_API, TEXTILE_API_KEY } from './config.js'
import { agentAccount } from './chain.js'

/** Shapes from the Textile FX v2 RFQ reference (fx-docs.textilecredit.com/api/v2/rfq.html). */
export type TxReq = { to: Address; data: Hex; value: string; chainId: number }
export type FirmQuote = {
  rfqId: string
  claimToken: string
  status: string
  reason?: string
  quote?: {
    sellAmount: string
    buyAmount: string
    feeAmount: string
    takerPays: string
    rateRay: string
    expiresAt: string
    reactor: Address
    taker: Address
  }
  transactions?: { approval?: TxReq; swap: TxReq }
}

function headers(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (TEXTILE_API_KEY) h.Authorization = `Bearer ${TEXTILE_API_KEY}`
  return h
}

async function signTakerControl(chainId: number) {
  const account = agentAccount()
  const nonce = toHex(crypto.randomBytes(32))
  const issuedAt = Date.now() // ms
  const signature = await account.signTypedData({
    domain: { name: 'Textile Taker Control', version: '1', chainId },
    types: {
      TakerControl: [
        { name: 'taker', type: 'address' },
        { name: 'chainId', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'issuedAt', type: 'uint256' },
      ],
    },
    primaryType: 'TakerControl',
    message: { taker: account.address, chainId: BigInt(chainId), nonce, issuedAt: BigInt(issuedAt) },
  })
  return { nonce, issuedAt, signature }
}

/** Free indicative price. Nothing reserved. */
export async function preview(sellToken: Address, buyToken: Address, sellAmount: bigint) {
  const res = await fetch(`${TEXTILE_API}/rfq/preview`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ chainId: CHAIN_ID, sellToken, buyToken, sellAmount: sellAmount.toString() }),
    signal: AbortSignal.timeout(75_000),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Textile preview ${res.status}: ${JSON.stringify(body)}`)
  return body
}

/** Firm quote bound to the agent wallet. Signs a wallet proof only when Textile asks for one. */
export async function requestFirmQuote(sellToken: Address, buyToken: Address, sellAmount: bigint): Promise<FirmQuote> {
  const taker = agentAccount().address
  const base = { chainId: CHAIN_ID, sellToken, buyToken, sellAmount: sellAmount.toString(), taker }
  const send = (extra: object = {}) =>
    fetch(`${TEXTILE_API}/rfq/request`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ...base, ...extra }),
      signal: AbortSignal.timeout(75_000),
    })

  let res = await send()
  if (res.status === 401 && !TEXTILE_API_KEY) {
    const { error } = await res.clone().json()
    if (error?.details?.reason === 'proof_of_control_required') {
      res = await send({ takerProof: await signTakerControl(CHAIN_ID) })
    }
  }
  const body = await res.json()
  if (!res.ok) throw new Error(`Textile request ${res.status}: ${JSON.stringify(body)}`)
  const q = (body.data ?? body) as FirmQuote
  if (q.status === 'no_quote') throw new Error(`Textile: no quote (${q.reason ?? 'no reason given'})`)
  return q
}

export async function submitTx(rfqId: string, claimToken: string, txHash: Hex) {
  const res = await fetch(`${TEXTILE_API}/rfq/${rfqId}/submit`, {
    method: 'POST',
    headers: headers(TEXTILE_API_KEY ? {} : { 'X-Rfq-Claim': claimToken }),
    body: JSON.stringify({ txHash }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) console.warn(`Textile submit ${res.status}: ${await res.text()}`)
}

export async function rfqStatus(rfqId: string, claimToken: string) {
  const res = await fetch(`${TEXTILE_API}/rfq/${rfqId}`, {
    headers: headers(TEXTILE_API_KEY ? {} : { 'X-Rfq-Claim': claimToken }),
    signal: AbortSignal.timeout(30_000),
  })
  return res.json()
}
