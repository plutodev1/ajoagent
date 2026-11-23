export interface Contribution {
  from: string;
  amount: string; // base units (6 decimals)
  txHash: string;
  block: string;
}

export interface Payout {
  rfqId: string;
  usdtIn: string;  // base units (6 decimals)
  cngnOut: string; // base units (6 decimals)
  swapTx: string;
  payoutTx: string;
  at: string; // ISO 8601
}

export interface Round {
  index: number;
  recipient: string;
  contributions: Contribution[];
  payout?: Payout; // absent means round is open
}

export interface Member {
  name: string;
  wallet: string;
}

export interface Circle {
  _comment?: string;
  name: string;
  organiser: string;
  contributionUsdt: string; // human-readable dollars, e.g. "2"
  agent: string;   // agent wallet address
  agentId: string; // ERC-8004 agent ID
  members: Member[];
  startBlock: string;
  lastScannedBlock: string;
  rounds: Round[];
}
