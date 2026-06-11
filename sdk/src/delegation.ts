import {
  http,
  type Address,
  type Hex,
  createWalletClient,
  encodeAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  type Delegation,
  ScopeType,
  createCaveat,
  createDelegation,
  signDelegation,
} from "@metamask/smart-accounts-kit";
import { hashDelegation } from "@metamask/smart-accounts-kit/utils";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import type { Context } from "./setup.js";
import type { Attestation } from "./types.js";
import { env } from "./env.js";

/** The attestation caveat referencing our deployed enforcer; terms = the policy signer address. */
function attestationCaveat(ctx: Context) {
  return createCaveat(ctx.attestationEnforcer, ctx.policySigner, "0x");
}

/** Root delegation: the user's smart account -> agent, with a spend cap and the firewall caveat. */
export async function createRootDelegation(ctx: Context, cap: bigint): Promise<Delegation> {
  const delegation = createDelegation({
    environment: ctx.environment,
    from: ctx.delegator.address,
    to: privateKeyToAccount(ctx.agentKey).address,
    scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: ctx.usdc, maxAmount: cap },
    caveats: [attestationCaveat(ctx)],
  });
  const signature = await ctx.delegator.signDelegation({ delegation });
  return { ...delegation, signature };
}

/** Redelegation (A2A): agent (EOA) -> worker, narrowing the cap and re-requiring an attestation. */
export async function createWorkerRedelegation(
  ctx: Context,
  signedRoot: Delegation,
  narrowedCap: bigint,
): Promise<Delegation> {
  const delegation = createDelegation({
    environment: ctx.environment,
    from: privateKeyToAccount(ctx.agentKey).address,
    to: privateKeyToAccount(ctx.workerKey).address,
    scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: ctx.usdc, maxAmount: narrowedCap },
    caveats: [attestationCaveat(ctx)],
    parentDelegation: signedRoot,
  });
  const signature = await signDelegation({
    privateKey: ctx.agentKey,
    delegation,
    delegationManager: ctx.environment.DelegationManager,
    chainId: ctx.chainId,
  });
  return { ...delegation, signature };
}

/** The on-chain delegation hash the AttestationEnforcer will bind the attestation to. */
export function leafHash(delegation: Delegation): Hex {
  return hashDelegation(delegation);
}

/** Writes a policy attestation into the delegation's AttestationEnforcer caveat `args`. */
export function attachAttestation(ctx: Context, delegation: Delegation, attestation: Attestation): Delegation {
  const caveats = delegation.caveats.map((cav) =>
    cav.enforcer.toLowerCase() === ctx.attestationEnforcer.toLowerCase()
      ? {
          ...cav,
          args: encodeAbiParameters(
            [{ type: "uint256" }, { type: "uint256" }, { type: "bytes" }],
            [attestation.nonce, attestation.expiry, attestation.signature],
          ),
        }
      : cav,
  );
  return { ...delegation, caveats };
}

/**
 * Redeem a delegation chain as an EOA delegate — a plain transaction to the DelegationManager via
 * the ERC-7710 wallet action. No bundler. `chain` is ordered leaf -> root.
 */
export async function redeem(params: {
  ctx: Context;
  redeemerKey: Hex;
  chain: Delegation[];
  target: Address;
  data: Hex;
  value?: bigint;
}): Promise<Hex> {
  const account = privateKeyToAccount(params.redeemerKey);
  const wallet = createWalletClient({ account, chain: env.chain, transport: http(env.rpcUrl) }).extend(
    erc7710WalletActions(),
  );
  const hash = await wallet.sendTransactionWithDelegation({
    chain: env.chain,
    account,
    to: params.target,
    value: params.value ?? 0n,
    data: params.data,
    permissionContext: params.chain,
    delegationManager: params.ctx.environment.DelegationManager,
  });
  await params.ctx.pub.waitForTransactionReceipt({ hash });
  return hash;
}
