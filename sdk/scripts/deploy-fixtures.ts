/**
 * One-shot deploy of the project's two fixtures to Base Sepolia: AttestationEnforcer (the firewall)
 * and MockUSDC (the one allowed mock). Run once, then paste the printed addresses into src/config.ts
 * so the console, verify-spike, and e2e all read one pinned source and never redeploy.
 *
 *   pnpm tsx scripts/deploy-fixtures.ts
 */
import { createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { env, publicClient } from "../src/env.js";
import { artifact } from "../src/artifacts.js";

async function main() {
  const pub = publicClient();
  const chainId = await pub.getChainId();
  const account = privateKeyToAccount(env.delegatorOwnerKey);
  const wallet = createWalletClient({ account, chain: env.chain, transport: http(env.rpcUrl) });
  console.log(`Deployer ${account.address} on chainId ${chainId} via ${env.rpcUrl}\n`);

  async function deploy(name: string): Promise<Address> {
    const { abi, bytecode } = artifact(name);
    const hash = await wallet.deployContract({ abi, bytecode, args: [], chain: env.chain, account });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) throw new Error(`${name}: no contract address`);
    console.log(`${name}: ${receipt.contractAddress}  (tx ${hash})`);
    return receipt.contractAddress;
  }

  const mockUsdc = await deploy("MockUSDC");
  const attestationEnforcer = await deploy("AttestationEnforcer");

  console.log("\nPaste into src/config.ts:");
  console.log(`  mockUsdc: "${mockUsdc}",`);
  console.log(`  attestationEnforcer: "${attestationEnforcer}",`);
}

main().catch((e) => {
  console.error("deploy-fixtures failed:", e);
  process.exit(1);
});
