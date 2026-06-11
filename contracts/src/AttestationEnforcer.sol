// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { ExecutionLib } from "@erc7579/lib/ExecutionLib.sol";

import { CaveatEnforcer } from "@metamask/delegation-framework/src/enforcers/CaveatEnforcer.sol";
import { ModeCode } from "@metamask/delegation-framework/src/utils/Types.sol";

/**
 * @title AttestationEnforcer
 * @notice The on-chain half of the Delegation Firewall.
 *
 *         A redemption may only proceed if it carries a *fresh* ECDSA signature ("attestation")
 *         from a trusted off-chain policy service. The policy service decides — per action —
 *         whether the proposed execution matches the user's intent (using Venice) before it will
 *         sign. This makes the off-chain decision **unbypassable**: even an action that is within
 *         the spend cap and "looks" legal reverts on-chain if no valid attestation accompanies it.
 *
 *         Static config (`terms`, set by the delegator when the delegation is created):
 *           - policySigner address (20 bytes) — whose signature is required.
 *
 *         Dynamic input (`args`, supplied by the redeemer at redemption time):
 *           - abi.encode(uint256 nonce, uint256 expiry, bytes signature)
 *
 *         The signed digest binds the attestation to the *exact* execution so it cannot be
 *         lifted onto a different action (see {computeActionHash}). Replay is prevented by a
 *         single-use map keyed by (delegationManager, delegationHash, nonce) — never by nonce
 *         alone, since enforcers are shared singletons across many delegations.
 */
contract AttestationEnforcer is CaveatEnforcer {
    using ExecutionLib for bytes;

    /// @dev delegationManager (msg.sender) => keccak256(delegationHash, nonce) => consumed
    mapping(address delegationManager => mapping(bytes32 attestationId => bool consumed)) public consumed;

    event AttestationConsumed(
        address indexed delegationManager,
        address indexed redeemer,
        bytes32 indexed delegationHash,
        uint256 nonce,
        uint256 expiry
    );

    error InvalidTermsLength();
    error AttestationExpired();
    error PolicySignatureMismatch();
    error AttestationAlreadyUsed();

    /**
     * @notice Validates the policy attestation before the execution runs.
     * @dev Reverting here reverts the entire redemption (the firewall "block").
     * @param _terms The policy signer address (20 bytes).
     * @param _args abi.encode(nonce, expiry, signature) supplied by the redeemer.
     * @param _mode Execution mode (must be single call type, default exec type).
     * @param _executionCallData The execution being redeemed.
     * @param _delegationHash The hash of the delegation this caveat belongs to.
     * @param _redeemer The address redeeming the delegation.
     */
    function beforeHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCallData,
        bytes32 _delegationHash,
        address,
        address _redeemer
    )
        public
        override
        onlySingleCallTypeMode(_mode)
        onlyDefaultExecutionMode(_mode)
    {
        address policySigner_ = getTermsInfo(_terms);
        (uint256 nonce_, uint256 expiry_, bytes memory signature_) = abi.decode(_args, (uint256, uint256, bytes));

        if (block.timestamp > expiry_) revert AttestationExpired();

        // Verify the policy signature is over THIS exact action.
        bytes32 actionHash_ = computeActionHash(_delegationHash, _executionCallData, nonce_, expiry_);
        if (ECDSA.recover(actionHash_, signature_) != policySigner_) revert PolicySignatureMismatch();

        // Single-use, keyed per delegation so one delegation's nonce never blocks another's.
        bytes32 attestationId_ = keccak256(abi.encode(_delegationHash, nonce_));
        if (consumed[msg.sender][attestationId_]) revert AttestationAlreadyUsed();
        consumed[msg.sender][attestationId_] = true;

        emit AttestationConsumed(msg.sender, _redeemer, _delegationHash, nonce_, expiry_);
    }

    /**
     * @notice The canonical action digest the policy service must sign.
     * @dev MUST stay byte-for-byte identical to the off-chain definition in sdk/src/actionHash.ts.
     *      Binds chain, delegation, target, value and full calldata, plus the attestation's
     *      nonce + expiry — so a signature issued for one action can never be reused for another.
     */
    function computeActionHash(
        bytes32 _delegationHash,
        bytes calldata _executionCallData,
        uint256 _nonce,
        uint256 _expiry
    )
        public
        view
        returns (bytes32)
    {
        (address target_, uint256 value_, bytes calldata callData_) = _executionCallData.decodeSingle();
        return keccak256(
            abi.encode(block.chainid, _delegationHash, target_, value_, keccak256(callData_), _nonce, _expiry)
        );
    }

    /// @notice Decodes the policy signer address from the caveat terms.
    function getTermsInfo(bytes calldata _terms) public pure returns (address policySigner_) {
        if (_terms.length != 20) revert InvalidTermsLength();
        policySigner_ = address(bytes20(_terms[0:20]));
    }
}
