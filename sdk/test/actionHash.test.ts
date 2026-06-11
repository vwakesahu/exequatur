import { describe, expect, it } from "vitest";
import { computeActionHash } from "../src/actionHash.js";

/**
 * Cross-language parity guard. The golden vector here is asserted byte-for-byte by the Solidity
 * side in contracts/test/ActionHashParity.t.sol. Changing the encoding on either side breaks one
 * of the two tests.
 */
describe("computeActionHash", () => {
  const golden = {
    chainId: 84532n,
    delegationHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    target: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    value: 0n,
    callData:
      "0xa9059cbb000000000000000000000000000000000000000000000000000000000000beef00000000000000000000000000000000000000000000000000000000017d7840",
    nonce: 1n,
    expiry: 1_000_000n,
  } as const;

  it("matches the shared golden vector", () => {
    expect(computeActionHash(golden)).toBe(
      "0xb0a6d196d6233490ebcd2bf99183767c065f41e68c7e57c0fbbdb93a5d34e72e",
    );
  });

  it("changes when any bound field changes (binds the action)", () => {
    const base = computeActionHash(golden);
    expect(computeActionHash({ ...golden, value: 1n })).not.toBe(base);
    expect(computeActionHash({ ...golden, nonce: 2n })).not.toBe(base);
    expect(computeActionHash({ ...golden, callData: "0xdeadbeef" })).not.toBe(base);
    expect(
      computeActionHash({
        ...golden,
        delegationHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      }),
    ).not.toBe(base);
  });
});
