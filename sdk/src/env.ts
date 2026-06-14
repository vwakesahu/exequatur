import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { http, type Chain, type Hex, createPublicClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { DEPLOYED } from "./config.js";

// Load sdk/.env first (takes precedence), then the repo-root .env. Both are gitignored.
const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, "../.env") });
loadDotenv({ path: resolve(here, "../../.env") });
// ENV_FILE lets a consumer point at an absolute .env. Needed when this package is resolved from a
// copied location (pnpm `file:` store) where the relative paths above no longer find sdk/.env.
if (process.env.ENV_FILE) loadDotenv({ path: process.env.ENV_FILE });

/**
 * Generate FRESH keys per run by default, so the e2e runs against a Base Sepolia *fork*
 * (`anvil --fork-url https://sepolia.base.org`) with no secrets - setup funds them via
 * anvil_setBalance. We deliberately avoid the well-known Anvil dev keys: those addresses carry
 * leftover EIP-7702 delegations on real Base Sepolia, which makes the DelegationManager treat an
 * EOA *redelegator* as a contract (ERC-1271) and breaks A2A. Override any key via .env to run
 * against real Base Sepolia with your own funded keys.
 */
function envKey(...names: string[]): Hex | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.length > 0) return v as Hex;
  }
  return undefined;
}

function key(...names: string[]): Hex {
  return envKey(...names) ?? generatePrivateKey();
}

// The funded deployer / delegator owner. DELEGATOR_PRIVATE_KEY or PRIVATE_KEY (with real testnet
// ETH) selects real Base Sepolia; otherwise a fresh key is generated for fork runs.
const ownerKey = envKey("DELEGATOR_PRIVATE_KEY", "PRIVATE_KEY");

export const env = {
  // Default to real Base Sepolia when a funded owner key is provided, else a local fork.
  rpcUrl: process.env.RPC_URL ?? (ownerKey ? "https://sepolia.base.org" : "http://127.0.0.1:8545"),
  chain: baseSepolia as Chain,
  /** True when running against real Base Sepolia (funded owner key, no local fork). */
  realNetwork: Boolean(ownerKey) && !process.env.RPC_URL?.includes("127.0.0.1"),
  // owner behind the user's MetaMask smart account (the delegator)
  delegatorOwnerKey: ownerKey ?? generatePrivateKey(),
  agentKey: key("AGENT_PRIVATE_KEY"),
  workerKey: key("WORKER_PRIVATE_KEY"),
  policyKey: key("POLICY_PRIVATE_KEY"),
  merchant: privateKeyToAccount(key("MERCHANT_PRIVATE_KEY")).address,
  attacker: privateKeyToAccount(key("ATTACKER_PRIVATE_KEY")).address,
  /** The legit gift-card vendor agent that receives payment and issues a code. */
  giftCardVendor: privateKeyToAccount(key("GIFT_CARD_VENDOR_KEY")).address,
  /** A second, untrusted gift-card seller agent (the bad actor in the demo). */
  giftCardScammer: privateKeyToAccount(key("GIFT_CARD_SCAMMER_KEY")).address,
  // Pinned Base Sepolia fixtures (src/config.ts). Env vars override for local forks.
  mockUsdc: (process.env.MOCK_USDC_ADDRESS as Hex | undefined) ?? DEPLOYED.mockUsdc,
  attestationEnforcer: (process.env.ATTESTATION_ENFORCER_ADDRESS as Hex | undefined) ?? DEPLOYED.attestationEnforcer,
  // Venice (M4): if a key is present, the real brain is used; otherwise the deterministic stub
  veniceApiKey: process.env.VENICE_API_KEY,
  veniceBaseUrl: process.env.VENICE_BASE_URL ?? "https://api.venice.ai/api/v1",
  /** Authorizer (firewall policy) model - structured JSON verdict, no tools needed. */
  veniceModel: process.env.VENICE_MODEL ?? "qwen3-4b",
  /** Agent brain model - must support tool calling (the `pay`/`redelegate` tools). */
  veniceAgentModel: process.env.VENICE_AGENT_MODEL ?? "qwen3-6-27b",
  /** Authorizer call timeout (ms). Larger models need more headroom; the firewall fails closed on timeout. */
  veniceTimeoutMs: Number(process.env.VENICE_TIMEOUT_MS ?? 30_000),
};

export function publicClient() {
  return createPublicClient({ chain: env.chain, transport: http(env.rpcUrl) });
}
