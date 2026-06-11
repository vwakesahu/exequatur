import type { Address, Hex } from "viem";
import type { Delegation } from "@metamask/smart-accounts-kit";
import { decodeRevertReason } from "@metamask/smart-accounts-kit/utils";
import { erc20TransferAction, transferCallData } from "./actions.js";
import { attachAttestation, leafHash, redeem } from "./delegation.js";
import { log } from "./log.js";
import type { PolicyService } from "./policy-service.js";
import type { Context } from "./setup.js";

/** Selectors of AttestationEnforcer's custom errors (decodeRevertReason only knows framework ABIs). */
const FIREWALL_ERRORS: Record<string, string> = {
  "0xd052cd1d": "AttestationEnforcer.PolicySignatureMismatch (wrong/missing policy signature)",
  "0x716dcc39": "AttestationEnforcer.AttestationExpired",
  "0x17ee279c": "AttestationEnforcer.AttestationAlreadyUsed (replay)",
  "0x86a371ad": "AttestationEnforcer.InvalidTermsLength",
};

function explainRevert(err: unknown): string {
  const data = (() => {
    if (err && typeof err === "object" && "walk" in err && typeof (err as { walk: unknown }).walk === "function") {
      const w = (err as { walk: (fn: (e: unknown) => boolean) => unknown }).walk(
        (e) => typeof (e as { data?: unknown }).data === "string",
      );
      return (w as { data?: string } | undefined)?.data;
    }
    return undefined;
  })();
  if (data && FIREWALL_ERRORS[data.slice(0, 10)]) return FIREWALL_ERRORS[data.slice(0, 10)];
  const decoded = decodeRevertReason(err);
  if (decoded) return `${decoded.errorName}: ${decoded.message}`;
  return err instanceof Error ? err.message.split("\n")[0] : String(err);
}

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
  context?: string;
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
    context: params.context,
  });

  // Every delegation in the chain that carries the firewall caveat must be attested (each hop is
  // gated). Collect their on-chain hashes so the policy issues one attestation per hop.
  const gatedHashes = chain
    .filter((d) => d.caveats.some((c) => c.enforcer.toLowerCase() === ctx.attestationEnforcer.toLowerCase()))
    .map((d) => leafHash(d));

  log.step(`${params.actor} proposes: pay ${action.description.amount} mUSDC to ${params.recipient}`);
  const decision = await service.authorizeChain(params.intent, action, gatedHashes);
  log.policy(`policy(${decision.brain}): ${decision.approved ? "APPROVE" : "DENY"} — ${decision.reason}`);
  if (decision.riskFlags.length > 0) log.policy(`risk flags: ${decision.riskFlags.join(", ")}`);

  if (!decision.approved || !decision.attestations) {
    return { executed: false, reason: decision.reason, brain: decision.brain, riskFlags: decision.riskFlags };
  }

  const redeemChain = chain.map((d) => {
    const att = decision.attestations![leafHash(d).toLowerCase() as `0x${string}`];
    return att ? attachAttestation(ctx, d, att) : d;
  });

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
    const revertError = explainRevert(err);
    log.note(`redemption reverted: ${revertError}`);
    return {
      executed: false,
      reason: decision.reason,
      brain: decision.brain,
      riskFlags: decision.riskFlags,
      revertError,
    };
  }
}
