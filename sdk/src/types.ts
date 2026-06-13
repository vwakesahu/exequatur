import type { Address, Hex } from "viem";

/** A concrete on-chain action a delegate proposes to perform, plus human-readable context. */
export interface ProposedAction {
  chainId: bigint;
  /** Hash of the delegation the attestation will be bound to (the leaf the redeemer holds). */
  delegationHash: Hex;
  target: Address;
  value: bigint;
  callData: Hex;
  /** Human-readable summary the policy brain reasons over. */
  description: {
    kind: "erc20-transfer" | string;
    token: Address;
    recipient: Address;
    amount: string; // decimal string in token units
    symbol?: string;
  };
  /**
   * Untrusted context the agent observed when it formed this action (a product page, tool output,
   * another agent's message). May be attacker-controlled - the policy treats it as data, never as
   * instructions, and uses it to catch prompt-injection / social-engineering.
   */
  context?: string;
}

/** The policy brain's decision about whether an action matches intent and is safe. */
export interface Verdict {
  approved: boolean;
  reason: string;
  riskFlags: string[];
}

/** Pluggable decision engine - deterministic stub for tests, real Venice for the demo. */
export interface PolicyBrain {
  readonly name: string;
  evaluate(intent: string, action: ProposedAction): Promise<Verdict>;
}

/** The signed approval a redeemer carries on-chain (the AttestationEnforcer caveat `args`). */
export interface Attestation {
  signature: Hex;
  nonce: bigint;
  expiry: bigint;
}

export interface AuthorizeResult {
  approved: boolean;
  reason: string;
  riskFlags: string[];
  brain: string;
  attestation?: Attestation;
}
