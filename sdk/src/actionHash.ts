import { type Address, type Hex, encodeAbiParameters, keccak256 } from "viem";

/**
 * The canonical action digest the policy service signs and the on-chain {AttestationEnforcer}
 * reconstructs.
 *
 * MUST stay byte-for-byte identical to `AttestationEnforcer.computeActionHash`:
 *
 *   keccak256(abi.encode(
 *     uint256 chainId,
 *     bytes32 delegationHash,
 *     address target,
 *     uint256 value,
 *     bytes32 keccak256(callData),
 *     uint256 nonce,
 *     uint256 expiry
 *   ))
 *
 * This is the single most bug-prone seam in the system — if the off-chain and on-chain encodings
 * drift, every signature check fails for confusing reasons. It is locked by a golden-vector test in
 * both languages (sdk: actionHash.test.ts, contracts: ActionHashParity.t.sol).
 */
export interface ActionHashInput {
  chainId: bigint;
  delegationHash: Hex;
  target: Address;
  value: bigint;
  callData: Hex;
  nonce: bigint;
  expiry: bigint;
}

export function computeActionHash(input: ActionHashInput): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" }, // chainId
        { type: "bytes32" }, // delegationHash
        { type: "address" }, // target
        { type: "uint256" }, // value
        { type: "bytes32" }, // keccak256(callData)
        { type: "uint256" }, // nonce
        { type: "uint256" }, // expiry
      ],
      [
        input.chainId,
        input.delegationHash,
        input.target,
        input.value,
        keccak256(input.callData),
        input.nonce,
        input.expiry,
      ],
    ),
  );
}
