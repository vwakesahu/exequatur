import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { http, type Hex, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

/**
 * Default to the well-known Anvil dev keys so the e2e runs against a Base Sepolia *fork*
 * (`anvil --fork-url https://sepolia.base.org`) with no secrets at all. Override any of them via
 * .env to run against real Base Sepolia with your own funded keys.
 */
const ANVIL = {
  k0: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  k1: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  k2: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  k3: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  k4: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  k5: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
} as const;

function key(name: string, fallback: Hex): Hex {
  const v = process.env[name];
  return v && v.length > 0 ? (v as Hex) : fallback;
}

export const env = {
  rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
  chain: baseSepolia,
  // owner behind the user's MetaMask smart account (the delegator)
  delegatorOwnerKey: key("DELEGATOR_PRIVATE_KEY", ANVIL.k0),
  agentKey: key("AGENT_PRIVATE_KEY", ANVIL.k1),
  workerKey: key("WORKER_PRIVATE_KEY", ANVIL.k2),
  policyKey: key("POLICY_PRIVATE_KEY", ANVIL.k3),
  merchant: privateKeyToAccount(key("MERCHANT_PRIVATE_KEY", ANVIL.k4)).address,
  attacker: privateKeyToAccount(key("ATTACKER_PRIVATE_KEY", ANVIL.k5)).address,
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
