const USDT_DECIMALS = 6;
const CNGN_DECIMALS = 6;
const CELOSCAN = "https://celoscan.io/tx/";
const SCAN_8004 = "https://8004scan.io/agents/celo/";
const CELOSCAN_ADDR = "https://celoscan.io/address/";
const CELO_CHAIN_ID = 42220;
const REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

/** Format a bigint-string of base units into a human decimal string. */
export function formatUnits(raw: string, decimals: number): string {
  const n = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === 0n) return whole.toLocaleString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toLocaleString()}.${fracStr}`;
}

export function formatUsdt(raw: string): string {
  return `${formatUnits(raw, USDT_DECIMALS)} USD₮`;
}

export function formatCngn(raw: string): string {
  return `${formatUnits(raw, CNGN_DECIMALS)} cNGN`;
}

/** Shorten a wallet address: 0x1f98…f984 */
export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function celoscanTxUrl(hash: string): string {
  return `${CELOSCAN}${hash}`;
}

export function celoscanAddrUrl(addr: string): string {
  return `${CELOSCAN_ADDR}${addr}`;
}

export function scan8004Url(agentId: string): string {
  return `${SCAN_8004}${agentId}`;
}

export function registryUrl(): string {
  return `${CELOSCAN_ADDR}${REGISTRY}?chainId=${CELO_CHAIN_ID}`;
}

/** Format an ISO 8601 timestamp to a readable local date. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
