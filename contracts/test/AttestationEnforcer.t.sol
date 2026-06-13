// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Test } from "forge-std/Test.sol";
import { ExecutionLib } from "@erc7579/lib/ExecutionLib.sol";
import { ModeLib, ModeCode } from "@erc7579/lib/ModeLib.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AttestationEnforcer } from "../src/AttestationEnforcer.sol";
import { MockUSDC } from "../src/MockUSDC.sol";

/**
 * @title AttestationEnforcerTest
 * @notice The enforcer unit matrix (Layer 1). Drives {AttestationEnforcer.beforeHook} exactly as
 *         the DelegationManager would (msg.sender = the manager), proving each security property in
 *         isolation. Fully offline - no SDK, no network, no bundler.
 */
contract AttestationEnforcerTest is Test {
    AttestationEnforcer internal enforcer;
    MockUSDC internal usdc;

    // stand-in for the DelegationManager (the only authorized caller of a caveat hook)
    address internal manager = makeAddr("DelegationManager");
    address internal merchant = makeAddr("merchant");
    address internal attacker = makeAddr("attacker");

    address internal policySigner;
    uint256 internal policyKey;
    uint256 internal rogueKey;

    ModeCode internal singleMode = ModeLib.encodeSimpleSingle();
    bytes32 internal constant DHASH = keccak256("delegation-A");
    uint256 internal constant NONCE = 1;

    function setUp() public {
        enforcer = new AttestationEnforcer();
        usdc = new MockUSDC();
        (policySigner, policyKey) = makeAddrAndKey("policy");
        (, rogueKey) = makeAddrAndKey("rogue");
        vm.warp(1_000_000); // non-zero timestamp so expiry logic is meaningful
    }

    // ---------------------------------------------------------------- helpers

    function _terms() internal view returns (bytes memory) {
        return abi.encodePacked(policySigner);
    }

    function _exec(address to, uint256 amount) internal view returns (bytes memory) {
        bytes memory callData = abi.encodeWithSelector(IERC20.transfer.selector, to, amount);
        return ExecutionLib.encodeSingle(address(usdc), 0, callData);
    }

    /// @dev Builds the redeemer `args`: a policy attestation over the given action.
    function _attest(
        uint256 signerKey,
        bytes32 delegationHash,
        bytes memory execForSigning,
        uint256 nonce,
        uint256 expiry
    )
        internal
        view
        returns (bytes memory)
    {
        bytes32 actionHash = enforcer.computeActionHash(delegationHash, execForSigning, nonce, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, actionHash);
        return abi.encode(nonce, expiry, abi.encodePacked(r, s, v));
    }

    function _run(bytes memory execCallData, bytes memory args) internal {
        vm.prank(manager);
        enforcer.beforeHook(_terms(), args, singleMode, execCallData, DHASH, address(0), merchant);
    }

    // ---------------------------------------------------------------- matrix

    function test_validAttestation_succeeds() public {
        bytes memory exec = _exec(merchant, 10e6);
        bytes memory args = _attest(policyKey, DHASH, exec, NONCE, block.timestamp + 1 hours);

        _run(exec, args);

        assertTrue(enforcer.consumed(manager, keccak256(abi.encode(DHASH, NONCE))), "attestation marked used");
    }

    function test_missingAttestation_reverts() public {
        bytes memory exec = _exec(merchant, 10e6);
        vm.prank(manager);
        vm.expectRevert(); // empty args fail to decode -> redemption reverts
        enforcer.beforeHook(_terms(), hex"", singleMode, exec, DHASH, address(0), merchant);
    }

    function test_nonPolicySigner_reverts() public {
        bytes memory exec = _exec(merchant, 10e6);
        bytes memory args = _attest(rogueKey, DHASH, exec, NONCE, block.timestamp + 1 hours);

        vm.prank(manager);
        vm.expectRevert(AttestationEnforcer.PolicySignatureMismatch.selector);
        enforcer.beforeHook(_terms(), args, singleMode, exec, DHASH, address(0), merchant);
    }

    function test_expiredAttestation_reverts() public {
        bytes memory exec = _exec(merchant, 10e6);
        bytes memory args = _attest(policyKey, DHASH, exec, NONCE, block.timestamp - 1);

        vm.prank(manager);
        vm.expectRevert(AttestationEnforcer.AttestationExpired.selector);
        enforcer.beforeHook(_terms(), args, singleMode, exec, DHASH, address(0), merchant);
    }

    function test_replay_reverts() public {
        bytes memory exec = _exec(merchant, 10e6);
        bytes memory args = _attest(policyKey, DHASH, exec, NONCE, block.timestamp + 1 hours);

        _run(exec, args); // first use ok

        vm.prank(manager);
        vm.expectRevert(AttestationEnforcer.AttestationAlreadyUsed.selector);
        enforcer.beforeHook(_terms(), args, singleMode, exec, DHASH, address(0), merchant);
    }

    function test_tamperedAction_reverts() public {
        // policy signs an approval to pay the merchant 10 USDC...
        bytes memory approved = _exec(merchant, 10e6);
        bytes memory args = _attest(policyKey, DHASH, approved, NONCE, block.timestamp + 1 hours);

        // ...but the redeemer swaps in a transfer of 10 USDC to the attacker.
        bytes memory tampered = _exec(attacker, 10e6);

        vm.prank(manager);
        vm.expectRevert(AttestationEnforcer.PolicySignatureMismatch.selector);
        enforcer.beforeHook(_terms(), args, singleMode, tampered, DHASH, address(0), merchant);
    }

    function test_replayKeyedPerDelegation() public {
        // Same nonce reused under two *different* delegations must both succeed -
        // proves the used-map is keyed by delegationHash, not nonce alone.
        bytes32 dA = keccak256("delegation-A");
        bytes32 dB = keccak256("delegation-B");
        bytes memory exec = _exec(merchant, 5e6);

        bytes memory argsA = _attest(policyKey, dA, exec, NONCE, block.timestamp + 1 hours);
        bytes memory argsB = _attest(policyKey, dB, exec, NONCE, block.timestamp + 1 hours);

        vm.prank(manager);
        enforcer.beforeHook(_terms(), argsA, singleMode, exec, dA, address(0), merchant);
        vm.prank(manager);
        enforcer.beforeHook(_terms(), argsB, singleMode, exec, dB, address(0), merchant);

        assertTrue(enforcer.consumed(manager, keccak256(abi.encode(dA, NONCE))));
        assertTrue(enforcer.consumed(manager, keccak256(abi.encode(dB, NONCE))));
    }

    function test_invalidTermsLength_reverts() public {
        bytes memory exec = _exec(merchant, 10e6);
        bytes memory args = _attest(policyKey, DHASH, exec, NONCE, block.timestamp + 1 hours);
        bytes memory badTerms = abi.encodePacked(policySigner, uint8(7)); // 21 bytes

        vm.prank(manager);
        vm.expectRevert(AttestationEnforcer.InvalidTermsLength.selector);
        enforcer.beforeHook(badTerms, args, singleMode, exec, DHASH, address(0), merchant);
    }

    function test_batchMode_reverts() public {
        bytes memory exec = _exec(merchant, 10e6);
        bytes memory args = _attest(policyKey, DHASH, exec, NONCE, block.timestamp + 1 hours);

        vm.prank(manager);
        vm.expectRevert(bytes("CaveatEnforcer:invalid-call-type"));
        enforcer.beforeHook(_terms(), args, ModeLib.encodeSimpleBatch(), exec, DHASH, address(0), merchant);
    }
}
