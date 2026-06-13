// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Test } from "forge-std/Test.sol";
import { ExecutionLib } from "@erc7579/lib/ExecutionLib.sol";

import { AttestationEnforcer } from "../src/AttestationEnforcer.sol";

/**
 * @title ActionHashParityTest
 * @notice Locks the canonical action hash to a golden vector shared verbatim with the off-chain
 *         definition (sdk/src/actionHash.ts, asserted in sdk/test/actionHash.test.ts). If either
 *         side's encoding drifts, one of these two tests breaks - surfacing the bug immediately
 *         instead of as a confusing signature-recovery failure at redemption time.
 */
contract ActionHashParityTest is Test {
    AttestationEnforcer internal enforcer;

    // Shared golden inputs (mirror sdk/test/actionHash.test.ts exactly).
    uint256 internal constant CHAIN_ID = 84532; // Base Sepolia
    bytes32 internal constant DELEGATION_HASH = 0x1111111111111111111111111111111111111111111111111111111111111111;
    address internal constant TARGET = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // USDC (Base Sepolia)
    uint256 internal constant VALUE = 0;
    uint256 internal constant NONCE = 1;
    uint256 internal constant EXPIRY = 1_000_000;
    bytes internal constant CALL_DATA =
        hex"a9059cbb000000000000000000000000000000000000000000000000000000000000beef00000000000000000000000000000000000000000000000000000000017d7840";

    // The golden value, computed once by sdk/src/actionHash.ts.
    bytes32 internal constant GOLDEN = 0xb0a6d196d6233490ebcd2bf99183767c065f41e68c7e57c0fbbdb93a5d34e72e;

    function setUp() public {
        enforcer = new AttestationEnforcer();
        vm.chainId(CHAIN_ID);
    }

    function test_actionHash_matchesGoldenVector() public view {
        bytes memory execCallData = ExecutionLib.encodeSingle(TARGET, VALUE, CALL_DATA);
        bytes32 onChain = enforcer.computeActionHash(DELEGATION_HASH, execCallData, NONCE, EXPIRY);
        assertEq(onChain, GOLDEN, "on-chain action hash drifted from the shared golden vector");
    }
}
