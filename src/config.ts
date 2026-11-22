import 'dotenv/config'
import type { Address, Hex } from 'viem'

export const CHAIN_ID = 42220 // Celo mainnet

// Token + contract addresses on Celo mainnet (from the Agents Open for Business brief)
export const TOKENS = {
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as Address,
  cNGN: '0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f' as Address,
}
export const TEXTILE_REACTOR = '0xa9AA0a64769cBed4d3B1Ceb4Df01CdE915C235b3' as Address
export const ERC8004_IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as Address
export const TEXTILE_API = 'https://api.textilecredit.com/v2'

export const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org'
export const DRY_RUN = process.env.DRY_RUN === '1'
export const TEXTILE_API_KEY = process.env.TEXTILE_API_KEY || ''

export function attributionCode(): string {
  const code = (process.env.ATTRIBUTION_CODE || '').trim()
  if (!/^[a-z0-9_]{1,32}$/.test(code)) {
    throw new Error(
      'ATTRIBUTION_CODE missing or invalid. Enroll on Loops House, copy your tag into .env (lowercase a-z 0-9 _ only).',
    )
  }
  return code
}

export function agentKey(): Hex {
  const k = (process.env.AGENT_PRIVATE_KEY || '').trim()
  if (!/^0x[0-9a-fA-F]{64}$/.test(k)) throw new Error('AGENT_PRIVATE_KEY missing or invalid in .env')
  return k as Hex
}
