import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

// Network is overridable (defaults to testnet) so the UI can also point at a
// local node: SUI_NETWORK=localnet SUI_RPC_URL=http://127.0.0.1:9000
const SUI_NETWORK = (process.env.SUI_NETWORK ?? "testnet") as
  | "testnet"
  | "mainnet"
  | "devnet"
  | "localnet";
const SUI_RPC_URL = process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl(SUI_NETWORK);

// Single client reused across server components.
export const suiClient = new SuiJsonRpcClient({
  url: SUI_RPC_URL,
  network: SUI_NETWORK,
});

// Shared AgentRegistry object id. Server-only env var; empty until deployed.
// (See TODO.md — deploy is blocked on testnet gas.)
export const REGISTRY_ID =
  process.env.SUITRACE_REGISTRY_ID ??
  process.env.NEXT_PUBLIC_SUITRACE_REGISTRY_ID ??
  "";

export const WALRUS_AGGREGATOR =
  "https://aggregator.walrus-testnet.walrus.space";

export function isDeployed(): boolean {
  return REGISTRY_ID.length > 0;
}
