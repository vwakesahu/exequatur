import {
  http,
  type Address,
  type Hex,
  type PublicClient,
  createWalletClient,
  getContract,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  Implementation,
  type MetaMaskSmartAccount,
  type SmartAccountsEnvironment,
  toMetaMaskSmartAccount,
} from "@metamask/smart-accounts-kit";
import { artifact } from "./artifacts.js";
import { env, publicClient } from "./env.js";
import { log } from "./log.js";

export interface Context {
  pub: PublicClient;
  chainId: number;
  environment: SmartAccountsEnvironment;
  usdc: Address;
  attestationEnforcer: Address;
  policySigner: Address;
  delegator: MetaMaskSmartAccount; // the user's funded smart account
  delegatorOwnerKey: Hex;
  agentKey: Hex;
  workerKey: Hex;
  policyKey: Hex;
  merchant: Address;
  attacker: Address;
}

const USDC_DECIMALS = 6;

export async function setup(): Promise<Context> {
  const pub = publicClient() as PublicClient;
  const chainId = await pub.getChainId();
  const ownerAccount = privateKeyToAccount(env.delegatorOwnerKey);
  const deployer = createWalletClient({ account: ownerAccount, chain: env.chain, transport: http(env.rpcUrl) });

  log.step(`Network: chainId ${chainId} via ${env.rpcUrl}`);
  log.step(`Deployer / delegator owner: ${ownerAccount.address}`);

  // On an Anvil fork, top up the (fresh) tx-sending accounts so no real funds are needed. On real
  // networks anvil_setBalance is unavailable — the run then relies on funded keys from .env.
  await fundOnFork(pub, [
    ownerAccount.address,
    privateKeyToAccount(env.agentKey).address,
    privateKeyToAccount(env.workerKey).address,
  ]);

  // 1. Deploy (or reuse) MockUSDC + AttestationEnforcer.
  const usdc = await deploy(deployer, pub, "MockUSDC", env.mockUsdc);
  const attestationEnforcer = await deploy(deployer, pub, "AttestationEnforcer", env.attestationEnforcer);

  // 2. The user's MetaMask Hybrid smart account (delegator).
  const delegator = await toMetaMaskSmartAccount({
    client: pub,
    implementation: Implementation.Hybrid,
    deployParams: [ownerAccount.address, [], [], []],
    deploySalt: "0x0000000000000000000000000000000000000000000000000000000000000001",
    signer: { account: ownerAccount },
  });
  log.step(`Delegator smart account: ${delegator.address}`);

  // Deploy it up-front via the factory as a normal tx (verified gotcha: redemption needs it deployed;
  // EOA delegates mean no bundler is required anywhere).
  if (!(await delegator.isDeployed())) {
    const { factory, factoryData } = await delegator.getFactoryArgs();
    if (!factory || !factoryData) throw new Error("smart account factory args unavailable");
    const hash = await deployer.sendTransaction({ to: factory, data: factoryData });
    await pub.waitForTransactionReceipt({ hash });
    log.step(`Deployed delegator smart account (factory tx ${hash.slice(0, 10)}…)`);
  } else {
    log.step("Delegator smart account already deployed");
  }

  // 3. Fund the smart account with MockUSDC.
  const token = getContract({ address: usdc, abi: artifact("MockUSDC").abi, client: deployer });
  const fundAmount = parseUnits("1000", USDC_DECIMALS);
  const mintHash = await token.write.mint([delegator.address, fundAmount]);
  await pub.waitForTransactionReceipt({ hash: mintHash });
  log.step(`Minted 1000 mUSDC to the delegator`);

  return {
    pub,
    chainId,
    environment: delegator.environment,
    usdc,
    attestationEnforcer,
    policySigner: privateKeyToAccount(env.policyKey).address,
    delegator,
    delegatorOwnerKey: env.delegatorOwnerKey,
    agentKey: env.agentKey,
    workerKey: env.workerKey,
    policyKey: env.policyKey,
    merchant: env.merchant,
    attacker: env.attacker,
  };
}

async function fundOnFork(pub: PublicClient, addresses: Address[]): Promise<void> {
  try {
    for (const address of addresses) {
      await pub.request({
        method: "anvil_setBalance" as never,
        params: [address, "0x56BC75E2D63100000"] as never, // 100 ETH
      });
    }
    log.step("Funded actors via anvil_setBalance (fork mode)");
  } catch {
    log.step("anvil_setBalance unavailable — assuming pre-funded keys (real network)");
  }
}

async function deploy(
  deployer: ReturnType<typeof createWalletClient>,
  pub: PublicClient,
  contract: string,
  existing?: Address,
): Promise<Address> {
  if (existing) {
    log.step(`Reusing ${contract} at ${existing}`);
    return existing;
  }
  const { abi, bytecode } = artifact(contract);
  const hash = await deployer.deployContract({ abi, bytecode, args: [], chain: env.chain, account: deployer.account! });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error(`${contract} deploy produced no address`);
  log.step(`Deployed ${contract} at ${receipt.contractAddress}`);
  return receipt.contractAddress;
}
