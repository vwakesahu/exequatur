import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { http, type Hex, createPublicClient } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Load sdk/.env first (takes precedence), then the repo-root .env. Both are gitignored.
const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, "../.env") });
loadDotenv({ path: resolve(here, "../../.env") });

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
  chain: baseSepolia,
  /** True when running against real Base Sepolia (funded owner key, no local fork). */
  realNetwork: Boolean(ownerKey) && !process.env.RPC_URL?.includes("127.0.0.1"),
  // owner behind the user's MetaMask smart account (the delegator)
  delegatorOwnerKey: ownerKey ?? generatePrivateKey(),
  agentKey: key("AGENT_PRIVATE_KEY"),
  workerKey: key("WORKER_PRIVATE_KEY"),
  policyKey: key("POLICY_PRIVATE_KEY"),
  merchant: privateKeyToAccount(key("MERCHANT_PRIVATE_KEY")).address,
  attacker: privateKeyToAccount(key("ATTACKER_PRIVATE_KEY")).address,
  // pre-deployed addresses (optional - setup deploys fresh ones if empty)
  mockUsdc: process.env.MOCK_USDC_ADDRESS as Hex | undefined,
  attestationEnforcer: process.env.ATTESTATION_ENFORCER_ADDRESS as Hex | undefined,
  // Venice (M4): if a key is present, the real brain is used; otherwise the deterministic stub
  veniceApiKey: process.env.VENICE_API_KEY,
  veniceBaseUrl: process.env.VENICE_BASE_URL ?? "https://api.venice.ai/api/v1",
  veniceModel: process.env.VENICE_MODEL ?? "llama-3.3-70b",
};

export function publicClient() {
  return createPublicClient({ chain: env.chain, transport: http(env.rpcUrl) });
}
