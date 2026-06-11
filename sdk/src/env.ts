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
 * (`anvil --fork-url https://sepolia.base.org`) with no secrets — setup funds them via
 * anvil_setBalance. We deliberately avoid the well-known Anvil dev keys: those addresses carry
 * leftover EIP-7702 delegations on real Base Sepolia, which makes the DelegationManager treat an
 * EOA *redelegator* as a contract (ERC-1271) and breaks A2A. Override any key via .env to run
 * against real Base Sepolia with your own funded keys.
 */
function key(name: string): Hex {
  const v = process.env[name];
  return v && v.length > 0 ? (v as Hex) : generatePrivateKey();
}

export const env = {
  rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
  chain: baseSepolia,
  // owner behind the user's MetaMask smart account (the delegator)
  delegatorOwnerKey: key("DELEGATOR_PRIVATE_KEY"),
  agentKey: key("AGENT_PRIVATE_KEY"),
  workerKey: key("WORKER_PRIVATE_KEY"),
  policyKey: key("POLICY_PRIVATE_KEY"),
  merchant: privateKeyToAccount(key("MERCHANT_PRIVATE_KEY")).address,
  attacker: privateKeyToAccount(key("ATTACKER_PRIVATE_KEY")).address,
  // pre-deployed addresses (optional — setup deploys fresh ones if empty)
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
