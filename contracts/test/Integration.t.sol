// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Test } from "forge-std/Test.sol";
import { ExecutionLib } from "@erc7579/lib/ExecutionLib.sol";
import { ModeLib, ModeCode } from "@erc7579/lib/ModeLib.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import { DelegationManager } from "@metamask/delegation-framework/src/DelegationManager.sol";
import { IDelegationManager } from "@metamask/delegation-framework/src/interfaces/IDelegationManager.sol";
import { EncoderLib } from "@metamask/delegation-framework/src/libraries/EncoderLib.sol";
import { Delegation, Caveat } from "@metamask/delegation-framework/src/utils/Types.sol";
import { ERC20TransferAmountEnforcer } from
    "@metamask/delegation-framework/src/enforcers/ERC20TransferAmountEnforcer.sol";

import { AttestationEnforcer } from "../src/AttestationEnforcer.sol";
import { MockUSDC } from "../src/MockUSDC.sol";
import { MockDeleGator } from "./mocks/MockDeleGator.sol";

/**
 * @title IntegrationTest
 * @notice Layer 1 end-to-end: drives the REAL {DelegationManager.redeemDelegations} with both the
 *         built-in {ERC20TransferAmountEnforcer} (hard spend cap) and our {AttestationEnforcer}
 *         (firewall). Proves the firewall in the actual redemption flow, plus the A2A redelegation
 *         chain — all offline, EOA delegates, no bundler.
 */
contract IntegrationTest is Test {
    DelegationManager internal dm;
    MockUSDC internal usdc;
    MockDeleGator internal aliceSA; // the user's funded smart account (root delegator)
    ERC20TransferAmountEnforcer internal spendEnforcer;
    AttestationEnforcer internal attestEnforcer;

    address internal alice;
    uint256 internal aliceKey; // owner behind the smart account
    address internal agent;
    uint256 internal agentKey; // primary delegate (EOA)
    address internal worker;
    uint256 internal workerKey; // sub-agent / redelegate (EOA)
    address internal policy;
    uint256 internal policyKey; // policy service signer
    address internal merchant = makeAddr("merchant");
    address internal attacker = makeAddr("attacker");

    bytes32 internal ROOT_AUTHORITY;
    ModeCode internal singleMode = ModeLib.encodeSimpleSingle();

    uint256 internal constant ROOT_CAP = 100e6;
    uint256 internal constant WORKER_CAP = 20e6;

    function setUp() public {
        (alice, aliceKey) = makeAddrAndKey("alice");
        (agent, agentKey) = makeAddrAndKey("agent");
        (worker, workerKey) = makeAddrAndKey("worker");
        (policy, policyKey) = makeAddrAndKey("policy");

        dm = new DelegationManager(makeAddr("dmOwner"));
        ROOT_AUTHORITY = dm.ROOT_AUTHORITY();

        usdc = new MockUSDC();
        aliceSA = new MockDeleGator(alice, address(dm));
        usdc.mint(address(aliceSA), 1000e6);

        spendEnforcer = new ERC20TransferAmountEnforcer();
        attestEnforcer = new AttestationEnforcer();

        vm.warp(1_000_000);
    }

    // ---------------------------------------------------------------- helpers

    function _spendCaveat(uint256 cap) internal view returns (Caveat memory) {
        return Caveat({ enforcer: address(spendEnforcer), terms: abi.encodePacked(address(usdc), cap), args: hex"" });
    }

    function _attestCaveat() internal view returns (Caveat memory) {
        return Caveat({ enforcer: address(attestEnforcer), terms: abi.encodePacked(policy), args: hex"" });
    }

    function _transferExec(address to, uint256 amount) internal view returns (bytes memory) {
        return ExecutionLib.encodeSingle(address(usdc), 0, abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
    }

    function _sign(uint256 key, Delegation memory d) internal view returns (bytes memory) {
        bytes32 dh = EncoderLib._getDelegationHash(d);
        bytes32 tdh = MessageHashUtils.toTypedDataHash(dm.getDomainHash(), dh);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, tdh);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Signs a policy attestation over the action and writes it into `caveats[attIdx].args`.
    function _attach(
        Delegation memory d,
        uint256 attIdx,
        bytes memory execCallData,
        uint256 signerKey,
        uint256 nonce,
        uint256 expiry
    )
        internal
        view
    {
        bytes32 dh = EncoderLib._getDelegationHash(d);
        bytes32 actionHash = attestEnforcer.computeActionHash(dh, execCallData, nonce, expiry);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, actionHash);
        d.caveats[attIdx].args = abi.encode(nonce, expiry, abi.encodePacked(r, s, v));
    }

    function _redeem(Delegation[] memory chain, bytes memory execCallData, address caller) internal {
        bytes[] memory ctx = new bytes[](1);
        ctx[0] = abi.encode(chain);
        ModeCode[] memory modes = new ModeCode[](1);
        modes[0] = singleMode;
        bytes[] memory execs = new bytes[](1);
        execs[0] = execCallData;
        vm.prank(caller);
        dm.redeemDelegations(ctx, modes, execs);
    }

    /// @dev Root delegation: alice's smart account -> agent, [spend cap, attestation].
    function _rootDelegation() internal view returns (Delegation memory d) {
        Caveat[] memory caveats = new Caveat[](2);
        caveats[0] = _spendCaveat(ROOT_CAP);
        caveats[1] = _attestCaveat();
        d = Delegation({
            delegate: agent,
            delegator: address(aliceSA),
            authority: ROOT_AUTHORITY,
            caveats: caveats,
            salt: 0,
            signature: hex""
        });
        d.signature = _sign(aliceKey, d);
    }

    // ---------------------------------------------------------------- single agent

    function test_happyPath_singleAgent() public {
        Delegation memory root = _rootDelegation();
        bytes memory exec = _transferExec(merchant, 25e6);
        _attach(root, 1, exec, policyKey, 1, block.timestamp + 1 hours);

        Delegation[] memory chain = new Delegation[](1);
        chain[0] = root;
        _redeem(chain, exec, agent);

        assertEq(usdc.balanceOf(merchant), 25e6, "merchant paid");
        assertEq(usdc.balanceOf(address(aliceSA)), 975e6, "delegator debited");
    }

    function test_overCap_reverts() public {
        Delegation memory root = _rootDelegation();
        bytes memory exec = _transferExec(merchant, 150e6); // > ROOT_CAP
        _attach(root, 1, exec, policyKey, 1, block.timestamp + 1 hours);

        Delegation[] memory chain = new Delegation[](1);
        chain[0] = root;
        vm.expectRevert(bytes("ERC20TransferAmountEnforcer:allowance-exceeded"));
        _redeem(chain, exec, agent);

        assertEq(usdc.balanceOf(merchant), 0);
    }

    /// The distinctive guarantee: a within-cap, "legal-looking" transfer the policy did NOT approve
    /// still reverts, because no valid attestation accompanies it.
    function test_withinCapButUnapproved_reverts() public {
        (, uint256 rogueKey) = makeAddrAndKey("rogue");
        Delegation memory root = _rootDelegation();
        bytes memory exec = _transferExec(attacker, 10e6); // within cap, but unapproved
        _attach(root, 1, exec, rogueKey, 1, block.timestamp + 1 hours); // signed by a non-policy key

        Delegation[] memory chain = new Delegation[](1);
        chain[0] = root;
        vm.expectRevert(AttestationEnforcer.PolicySignatureMismatch.selector);
        _redeem(chain, exec, agent);

        assertEq(usdc.balanceOf(attacker), 0, "attacker got nothing");
    }

    // ---------------------------------------------------------------- A2A redelegation

    /// Root has only the spend cap; the leaf redelegation carries the attestation (the worker is the
    /// actual actor) and a *narrower* cap. Chain is ordered leaf -> root.
    function _redelegation(uint256 narrowedCap) internal view returns (Delegation memory redeleg, Delegation memory root) {
        // root: alice SA -> agent, spend cap only (agent is not the final actor here)
        Caveat[] memory rootCaveats = new Caveat[](1);
        rootCaveats[0] = _spendCaveat(ROOT_CAP);
        root = Delegation({
            delegate: agent,
            delegator: address(aliceSA),
            authority: ROOT_AUTHORITY,
            caveats: rootCaveats,
            salt: 0,
            signature: hex""
        });
        root.signature = _sign(aliceKey, root);
        bytes32 rootHash = EncoderLib._getDelegationHash(root);

        // redelegation: agent (EOA) -> worker, narrower cap + attestation
        Caveat[] memory leafCaveats = new Caveat[](2);
        leafCaveats[0] = _spendCaveat(narrowedCap);
        leafCaveats[1] = _attestCaveat();
        redeleg = Delegation({
            delegate: worker,
            delegator: agent,
            authority: rootHash,
            caveats: leafCaveats,
            salt: 0,
            signature: hex""
        });
        redeleg.signature = _sign(agentKey, redeleg); // EOA delegator -> ECDSA validated
    }

    function test_redelegation_workerWithinNarrowedCap_succeeds() public {
        (Delegation memory redeleg, Delegation memory root) = _redelegation(WORKER_CAP);
        bytes memory exec = _transferExec(merchant, 15e6); // <= WORKER_CAP
        _attach(redeleg, 1, exec, policyKey, 7, block.timestamp + 1 hours);

        Delegation[] memory chain = new Delegation[](2);
        chain[0] = redeleg; // leaf
        chain[1] = root; // root
        _redeem(chain, exec, worker);

        assertEq(usdc.balanceOf(merchant), 15e6, "worker paid merchant within narrowed scope");
    }

    function test_redelegation_workerOverNarrowedCap_reverts() public {
        (Delegation memory redeleg, Delegation memory root) = _redelegation(WORKER_CAP);
        bytes memory exec = _transferExec(merchant, 21e6); // > WORKER_CAP (20) but < ROOT_CAP (100)
        _attach(redeleg, 1, exec, policyKey, 7, block.timestamp + 1 hours);

        Delegation[] memory chain = new Delegation[](2);
        chain[0] = redeleg;
        chain[1] = root;
        vm.expectRevert(bytes("ERC20TransferAmountEnforcer:allowance-exceeded"));
        _redeem(chain, exec, worker);

        assertEq(usdc.balanceOf(merchant), 0, "narrowed cap enforced regardless of root cap");
    }

    /// Chain integrity: presenting the leaf without its root breaks the authority link.
    function test_redelegation_absentRoot_reverts() public {
        (Delegation memory redeleg,) = _redelegation(WORKER_CAP);
        bytes memory exec = _transferExec(merchant, 15e6);
        _attach(redeleg, 1, exec, policyKey, 7, block.timestamp + 1 hours);

        Delegation[] memory chain = new Delegation[](1);
        chain[0] = redeleg; // authority != ROOT_AUTHORITY, and no parent supplied
        vm.expectRevert(IDelegationManager.InvalidAuthority.selector);
        _redeem(chain, exec, worker);
    }
}
