import { encodeFunctionData, parseEventLogs, type Hex } from 'viem'
import { DRY_RUN, ERC8004_IDENTITY_REGISTRY } from './config.js'
import { pub, sendTagged } from './chain.js'

const abi = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setAgentURI',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
    ],
  },
] as const

/**
 * Register AjoAgent on the ERC-8004 Identity Registry (Celo mainnet).
 * agentURI must be a public URL serving agent.json (e.g. the raw GitHub URL of agent.json in your repo).
 * The registering wallet becomes the agent's owner and payment wallet, so run this with the agent key.
 */
export async function registerAgent(agentURI: string) {
  if (!/^https?:\/\//.test(agentURI)) throw new Error('Pass a public URL to agent.json')
  const data = encodeFunctionData({ abi, functionName: 'register', args: [agentURI] })
  const hash = await sendTagged('ERC-8004 register', ERC8004_IDENTITY_REGISTRY, data)
  if (DRY_RUN || !hash) return
  const receipt = await pub.getTransactionReceipt({ hash: hash as Hex })
  const [evt] = parseEventLogs({ abi, eventName: 'Registered', logs: receipt.logs })
  console.log(`Agent ID: ${evt.args.agentId}`)
  console.log('Next: add this to agent.json "registrations", push it, and you are done:')
  console.log(JSON.stringify({ agentId: Number(evt.args.agentId), agentRegistry: `eip155:42220:${ERC8004_IDENTITY_REGISTRY}` }))
}

export async function updateAgentURI(agentId: bigint, newURI: string) {
  const data = encodeFunctionData({ abi, functionName: 'setAgentURI', args: [agentId, newURI] })
  await sendTagged('ERC-8004 setAgentURI', ERC8004_IDENTITY_REGISTRY, data)
}
