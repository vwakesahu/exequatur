import { bytesToHex, createPublicClient, createWalletClient, custom, http, parseUnits, type Address, type EIP1193Provider, type PublicClient } from "viem";
import { baseSepolia } from "wagmi/chains";
import type { Connector } from "wagmi";
import {
  Implementation,
  ScopeType,
  createCaveat,
  createDelegation,
  toMetaMaskSmartAccount,
  type Delegation,
  type MetaMaskSmartAccount,
} from "@metamask/smart-accounts-kit";
import { DEPLOY_SALT, type Info } from "./console-client";
import type { ConsoleSession } from "./session";

/** The user's MetaMask Smart Account, with the connected wallet as signatory. Deterministic per owner. */
export async function buildSmartAccount(connector: Connector, address: Address, rpcUrl: string): Promise<MetaMaskSmartAccount> {
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) }) as PublicClient;
  const provider = (await connector.getProvider()) as EIP1193Provider;
  const walletClient = createWalletClient({ account: address, chain: baseSepolia, transport: custom(provider) });
  return toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [address, [], [], []],
    deploySalt: DEPLOY_SALT,
    signer: { walletClient },
  });
}

/**
 * Sign a delegation granting the agent a spend cap (the firewall caveat chain: ERC-20 allowance +
 * AttestationEnforcer). Returns a console session. Used both for first onboarding and for raising the
 * allowance later (a new delegation = a fresh cumulative allowance at the new cap).
 */
export async function signGrant(account: MetaMaskSmartAccount, address: Address, info: Info, cap: string): Promise<ConsoleSession> {
  if (!info.usdc || !info.attestationEnforcer) throw new Error("contracts not configured");
  // A unique salt makes each grant a distinct delegation, so re-granting resets the enforcer's
  // cumulative spend (a deterministic salt would collide with the spent-out delegation).
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const delegation = createDelegation({
    environment: account.environment,
    from: account.address,
    to: info.agent,
    scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: info.usdc, maxAmount: parseUnits(cap, 6) },
    caveats: [createCaveat(info.attestationEnforcer, info.policySigner, "0x")],
    salt,
  });
  const signature = await account.signDelegation({ delegation });
  const signedDelegation: Delegation = { ...delegation, signature };
  return { owner: address, chainId: baseSepolia.id, smartAccount: account.address, cap, signedDelegation };
}

/** Build the smart account and sign a fresh grant in one step (for raising the allowance from the chat). */
export async function grantDelegation(connector: Connector, address: Address, info: Info, cap: string): Promise<ConsoleSession> {
  const account = await buildSmartAccount(connector, address, info.rpcUrl);
  return signGrant(account, address, info, cap);
}
