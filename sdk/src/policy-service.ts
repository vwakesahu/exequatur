import { type Address, type Hex, getAddress, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { computeActionHash } from "./actionHash.js";
import type { Attestation, AuthorizeResult, PolicyBrain, ProposedAction, Verdict } from "./types.js";

/**
 * A deterministic, offline policy brain used by the automated test matrix (the "stubbed Venice").
 * Encodes a simple but real rule - "only pay approved recipients, never above the cap" - so tests
 * are reproducible and need no network. The real demo swaps in {makeVeniceBrain}.
 */
export function makeRuleBrain(rules: { allowRecipients: Address[]; maxAmount: bigint; decimals?: number }): PolicyBrain {
  const allow = new Set(rules.allowRecipients.map((a) => getAddress(a)));
  const decimals = rules.decimals ?? 6;
  return {
    name: "rule-stub",
    async evaluate(_intent: string, action: ProposedAction): Promise<Verdict> {
      const recipient = getAddress(action.description.recipient);
      const amount = parseUnits(action.description.amount, decimals);
      const flags: string[] = [];
      if (!allow.has(recipient)) flags.push("recipient-not-in-allowlist");
      if (amount > rules.maxAmount) flags.push("amount-exceeds-policy-cap");
      const approved = flags.length === 0;
      return {
        approved,
        reason: approved
          ? `recipient ${recipient} is approved and amount ${action.description.amount} is within the policy cap`
          : `denied: ${flags.join(", ")}`,
        riskFlags: flags,
      };
    },
  };
}

/**
 * An "approve everything" brain. Used only to model an attacker who controls a *rogue* policy
 * service (signing with the wrong key): the on-chain enforcer still rejects it because the terms
 * pin the real policy signer. Demonstrates the firewall is unbypassable.
 */
export function makeAllowAllBrain(): PolicyBrain {
  return {
    name: "rogue-allow-all",
    async evaluate(): Promise<Verdict> {
      return { approved: true, reason: "rogue policy approves everything", riskFlags: [] };
    },
  };
}

export interface PolicyServiceOptions {
  /** seconds an attestation stays valid after issuance */
  ttlSeconds?: number;
  /** override nonce generation (tests); default is time-based and effectively unique */
  nextNonce?: () => bigint;
  /** clock injection for tests */
  now?: () => number;
}

/**
 * The off-chain firewall. Computes the canonical action hash, asks the policy brain for a verdict,
 * and - only on approval - returns an ECDSA attestation signed by the policy key. The matching
 * on-chain {AttestationEnforcer} will reject any redemption lacking this fresh signature.
 */
export class PolicyService {
  private readonly account;
  private readonly ttlSeconds: number;
  private readonly nextNonce: () => bigint;
  private readonly now: () => number;
  private counter = 0n;

  constructor(
    policyPrivateKey: Hex,
    private readonly brain: PolicyBrain,
    opts: PolicyServiceOptions = {},
  ) {
    this.account = privateKeyToAccount(policyPrivateKey);
    this.ttlSeconds = opts.ttlSeconds ?? 300;
    this.now = opts.now ?? (() => Math.floor(Date.now() / 1000));
    this.nextNonce =
      opts.nextNonce ??
      (() => {
        this.counter += 1n;
        return BigInt(this.now()) * 1_000n + this.counter;
      });
  }

  get policySigner(): Address {
    return this.account.address;
  }

  get brainName(): string {
    return this.brain.name;
  }

  /** Authorize an action bound to a single delegation (single-agent path). */
  async authorize(intent: string, action: ProposedAction): Promise<AuthorizeResult> {
    const verdict = await this.brain.evaluate(intent, action);
    if (!verdict.approved) {
      return { approved: false, reason: verdict.reason, riskFlags: verdict.riskFlags, brain: this.brain.name };
    }
    const attestation = await this.sign(action, action.delegationHash);
    return { approved: true, reason: verdict.reason, riskFlags: verdict.riskFlags, brain: this.brain.name, attestation };
  }

  /**
   * Authorize an action for a whole delegation chain (A2A): the brain runs ONCE on the action, and
   * - only on approval - we issue a fresh attestation bound to EACH delegation hash that gates the
   * action (every hop with the firewall caveat). Returns a map keyed by lowercased delegation hash.
   */
  async authorizeChain(
    intent: string,
    action: ProposedAction,
    delegationHashes: Hex[],
  ): Promise<{ approved: boolean; reason: string; riskFlags: string[]; brain: string; attestations?: Record<Hex, Attestation> }> {
    const verdict = await this.brain.evaluate(intent, action);
    if (!verdict.approved) {
      return { approved: false, reason: verdict.reason, riskFlags: verdict.riskFlags, brain: this.brain.name };
    }
    const attestations: Record<Hex, Attestation> = {};
    for (const dh of delegationHashes) {
      attestations[dh.toLowerCase() as Hex] = await this.sign(action, dh);
    }
    return { approved: true, reason: verdict.reason, riskFlags: verdict.riskFlags, brain: this.brain.name, attestations };
  }

  private async sign(action: ProposedAction, delegationHash: Hex): Promise<Attestation> {
    const nonce = this.nextNonce();
    const expiry = BigInt(this.now() + this.ttlSeconds);
    const actionHash = computeActionHash({
      chainId: action.chainId,
      delegationHash,
      target: action.target,
      value: action.value,
      callData: action.callData,
      nonce,
      expiry,
    });
    const signature = await this.account.sign({ hash: actionHash });
    return { signature, nonce, expiry };
  }
}
