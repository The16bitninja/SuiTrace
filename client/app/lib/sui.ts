import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

// Single testnet client reused across server components.
export const suiClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
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
