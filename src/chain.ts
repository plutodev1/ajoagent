import {
  concat,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  http,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { toDataSuffix } from '@celo/attribution-tags'
import { DRY_RUN, RPC_URL, agentKey, attributionCode } from './config.js'

export const pub = createPublicClient({ chain: celo, transport: http(RPC_URL) })

export function agentAccount() {
  return privateKeyToAccount(agentKey())
}

export function agentWallet() {
  return createWalletClient({ account: agentAccount(), chain: celo, transport: http(RPC_URL) })
}

/** ERC-8021 suffix for this project's attribution code. */
export function tag(): Hex {
  return toDataSuffix(attributionCode()) as Hex
}

/**
 * Send a transaction with our attribution tag appended to calldata.
 * Every onchain action AjoAgent takes goes through here, so nothing is ever sent untagged.
 */
export async function sendTagged(label: string, to: Address, data: Hex, value: bigint = 0n): Promise<Hex | null> {
  const tagged = concat([data, tag()])
  if (DRY_RUN) {
    console.log(`[dry-run] ${label}: to=${to} data=${tagged.slice(0, 26)}… (${(tagged.length - 2) / 2} bytes, tagged)`)
    return null
  }
  const wallet = agentWallet()
  const hash = await wallet.sendTransaction({ to, data: tagged, value })
  console.log(`${label}: sent ${hash}`)
  const receipt = await pub.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error(`${label} reverted: ${hash}`)
  console.log(`${label}: confirmed in block ${receipt.blockNumber}`)
  return hash
}

export async function tokenInfo(token: Address) {
  const [decimals, symbol] = await Promise.all([
    pub.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
    pub.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
  ])
  return { decimals, symbol }
}

export async function balanceOf(token: Address, who: Address) {
  return pub.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [who] })
}

export async function fmt(token: Address, amount: bigint) {
  const { decimals, symbol } = await tokenInfo(token)
  return `${formatUnits(amount, decimals)} ${symbol}`
}

export function transferData(to: Address, amount: bigint): Hex {
  return encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [to, amount] })
}

export function approveData(spender: Address, amount: bigint): Hex {
  return encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender, amount] })
}

