import type { Address, Hex } from "viem";
import type { Delegation } from "@metamask/smart-accounts-kit";
import { erc20TransferAction, transferCallData } from "./actions.js";
import { attachAttestation, leafHash, redeem } from "./delegation.js";
import { log } from "./log.js";
import type { PolicyService } from "./policy-service.js";
import type { Context } from "./setup.js";

export interface PaymentResult {
  executed: boolean;
  reason: string;
  brain: string;
  riskFlags: string[];
  txHash?: Hex;
  revertError?: string;
}

/**
 * The agent/worker decision loop: propose an action, ask the firewall, and only redeem on approval.
 * `chain` is leaf -> root; `chain[0]` is the delegation this actor holds (and carries the firewall
 * caveat the attestation is bound to).
 */
export async function attemptPayment(params: {
  ctx: Context;
  service: PolicyService;
  actor: "agent" | "worker";
  redeemerKey: Hex;
  chain: Delegation[];
  intent: string;
  recipient: Address;
  amount: bigint;
}): Promise<PaymentResult> {
  const { ctx, service, chain } = params;
  const leaf = chain[0];

  const action = erc20TransferAction({
    chainId: BigInt(ctx.chainId),
    delegationHash: leafHash(leaf),
    token: ctx.usdc,
    recipient: params.recipient,
    amount: params.amount,
    symbol: "mUSDC",
  });

  log.step(`${params.actor} proposes: pay ${action.description.amount} mUSDC to ${params.recipient}`);
  const decision = await service.authorize(params.intent, action);
  log.policy(`policy(${decision.brain}): ${decision.approved ? "APPROVE" : "DENY"} — ${decision.reason}`);
  if (decision.riskFlags.length > 0) log.policy(`risk flags: ${decision.riskFlags.join(", ")}`);

  if (!decision.approved || !decision.attestation) {
    return { executed: false, reason: decision.reason, brain: decision.brain, riskFlags: decision.riskFlags };
  }

  const signedLeaf = attachAttestation(ctx, leaf, decision.attestation);
  const redeemChain = [signedLeaf, ...chain.slice(1)];

  try {
    const txHash = await redeem({
      ctx,
      redeemerKey: params.redeemerKey,
      chain: redeemChain,
      target: ctx.usdc,
      data: transferCallData(params.recipient, params.amount),
    });
    return {
      executed: true,
      reason: decision.reason,
      brain: decision.brain,
      riskFlags: decision.riskFlags,
      txHash,
    };
  } catch (err) {
    return {
      executed: false,
      reason: decision.reason,
      brain: decision.brain,
      riskFlags: decision.riskFlags,
      revertError: err instanceof Error ? err.message : String(err),
    };
  }
}
