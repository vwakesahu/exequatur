import type { Address, Hex } from "viem";

/** Public, non-secret config served by /api/info (read by the browser, never holds keys). */
export interface Info {
  chainId: number;
  rpcUrl: string;
  explorerTxBase: string;
  explorerAddressBase: string;
  agent: Address;
  policySigner: Address;
  usdc: Address | null;
  attestationEnforcer: Address | null;
  delegationManager: Address;
  merchant: Address;
  configured: boolean;
}

/** Same deterministic salt the SDK uses, so a wallet maps to one smart-account address. */
export const DEPLOY_SALT = "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

export async function fetchJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `${url} failed (${res.status})`);
  return json as T;
}

export function short(addr?: string | null): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
}
