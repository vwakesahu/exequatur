# The canonical action hash

The single most bug-prone seam in the system is the digest the off-chain policy service signs and
the on-chain `AttestationEnforcer` reconstructs. If they drift by a single byte, every signature
check fails for confusing reasons. This document pins the definition; two tests (one per language)
lock it to a shared golden vector.

## Definition

```
actionHash = keccak256(abi.encode(
    uint256  chainId,            // block.chainid where the enforcer runs
    bytes32  delegationHash,     // the delegation this attestation is bound to
    address  target,             // execution target (the token)
    uint256  value,              // native value (0 for ERC-20 transfers)
    bytes32  keccak256(callData),// full calldata digest — binds recipient AND amount
    uint256  nonce,              // per-attestation, single-use
    uint256  expiry              // unix seconds; enforcer requires block.timestamp <= expiry
))
```

All seven fields are fixed 32-byte words under `abi.encode`, so the two implementations match
trivially:

- on-chain: `AttestationEnforcer.computeActionHash` ([contracts/src/AttestationEnforcer.sol](../contracts/src/AttestationEnforcer.sol))
- off-chain: `computeActionHash` ([sdk/src/actionHash.ts](../sdk/src/actionHash.ts))

## Why these fields

- **chainId + delegationHash** scope the approval to one chain and one delegation, so an attestation
  can never be replayed on another chain or lifted onto a different delegation. In a redelegation
  chain, each hop has the firewall caveat and gets its *own* attestation bound to *its* delegation
  hash.
- **target + value + keccak256(callData)** bind the approval to the exact action. Change the
  recipient or the amount and the hash changes, so a stale signature no longer recovers to the
  policy signer — the "tampered action" case reverts.
- **nonce + expiry** make each attestation single-use and short-lived.

## Signing scheme

The policy service signs the **raw 32-byte `actionHash`** (no EIP-191 prefix) with the policy key:
`account.sign({ hash: actionHash })`. On-chain, `ECDSA.recover(actionHash, signature)` must equal
the `policySigner` baked into the caveat `terms`. Signing the raw hash on both sides keeps parity
exact.

## Replay keying

The enforcer marks an attestation consumed under
`keccak256(delegationHash, nonce)`, namespaced by the calling DelegationManager
(`mapping(address => mapping(bytes32 => bool))`). Because enforcers are **shared singletons** across
many delegations, keying by nonce alone would let one delegation's nonce block another's — so the
delegation hash is always part of the key (`AttestationEnforcerTest.test_replayKeyedPerDelegation`).

## The parity guard

- `contracts/test/ActionHashParity.t.sol` asserts `computeActionHash(golden inputs) == GOLDEN`.
- `sdk/test/actionHash.test.ts` asserts the TypeScript result equals the same `GOLDEN`.

`GOLDEN = 0xb0a6d196d6233490ebcd2bf99183767c065f41e68c7e57c0fbbdb93a5d34e72e` for the fixed inputs in
both files (chainId 84532). Edit either encoding and one of the two tests breaks immediately.
