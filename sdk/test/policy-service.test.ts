import { describe, expect, it } from "vitest";
import { getAddress, parseUnits, recoverAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { computeActionHash } from "../src/actionHash.js";
import { erc20TransferAction } from "../src/actions.js";
import { PolicyService, makeRuleBrain } from "../src/policy-service.js";

// anvil dev key #0 — test only
const POLICY_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const CHAIN_ID = 84532n;
const TOKEN = getAddress("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
const MERCHANT = getAddress("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
const ATTACKER = getAddress("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
const DHASH = "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

function service() {
  return new PolicyService(
    POLICY_KEY,
    makeRuleBrain({ allowRecipients: [MERCHANT], maxAmount: parseUnits("100", 6) }),
    { now: () => 1_000_000, nextNonce: () => 42n },
  );
}

describe("PolicyService (stub brain)", () => {
  it("approves an in-policy action and returns a verifiable attestation", async () => {
    const svc = service();
    const action = erc20TransferAction({
      chainId: CHAIN_ID,
      delegationHash: DHASH,
      token: TOKEN,
      recipient: MERCHANT,
      amount: parseUnits("25", 6),
      symbol: "mUSDC",
    });

    const res = await svc.authorize("Pay the merchant up to 100 mUSDC for the order", action);

    expect(res.approved).toBe(true);
    expect(res.attestation).toBeDefined();

    // The attestation must recover to the policy signer over the exact on-chain action hash.
    const hash = computeActionHash({
      chainId: CHAIN_ID,
      delegationHash: DHASH,
      target: action.target,
      value: action.value,
      callData: action.callData,
      nonce: res.attestation!.nonce,
      expiry: res.attestation!.expiry,
    });
    const recovered = await recoverAddress({ hash, signature: res.attestation!.signature });
    expect(recovered).toBe(privateKeyToAccount(POLICY_KEY).address);
    expect(res.attestation!.expiry).toBe(1_000_300n);
  });

  it("denies an unapproved recipient (no attestation)", async () => {
    const svc = service();
    const action = erc20TransferAction({
      chainId: CHAIN_ID,
      delegationHash: DHASH,
      token: TOKEN,
      recipient: ATTACKER,
      amount: parseUnits("10", 6),
    });
    const res = await svc.authorize("Pay the merchant up to 100 mUSDC", action);
    expect(res.approved).toBe(false);
    expect(res.attestation).toBeUndefined();
    expect(res.riskFlags).toContain("recipient-not-in-allowlist");
  });

  it("denies an over-cap amount (no attestation)", async () => {
    const svc = service();
    const action = erc20TransferAction({
      chainId: CHAIN_ID,
      delegationHash: DHASH,
      token: TOKEN,
      recipient: MERCHANT,
      amount: parseUnits("250", 6),
    });
    const res = await svc.authorize("Pay the merchant up to 100 mUSDC", action);
    expect(res.approved).toBe(false);
    expect(res.attestation).toBeUndefined();
    expect(res.riskFlags).toContain("amount-exceeds-policy-cap");
  });
});
