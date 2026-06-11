// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { ExecutionLib } from "@erc7579/lib/ExecutionLib.sol";
import { IDeleGatorCore } from "@metamask/delegation-framework/src/interfaces/IDeleGatorCore.sol";
import { ModeCode } from "@metamask/delegation-framework/src/utils/Types.sol";

/**
 * @title MockDeleGator
 * @notice The minimal smart account needed to drive the real DelegationManager end-to-end in a
 *         Foundry test, without pulling in the full Hybrid/P256 DeleGator (and its upgradeable +
 *         passkey deps). It implements exactly the two things the DelegationManager touches on the
 *         root delegator: ERC-1271 signature validation, and execution dispatch.
 * @dev Test-only. The production delegator is a real MetaMask Hybrid smart account (see sdk/).
 */
contract MockDeleGator is IDeleGatorCore {
    using ExecutionLib for bytes;

    address public immutable owner;
    address public immutable delegationManager;
    bytes4 internal constant ERC1271_MAGIC = 0x1626ba7e;

    error NotDelegationManager();
    error CallFailed();

    constructor(address _owner, address _delegationManager) {
        owner = _owner;
        delegationManager = _delegationManager;
    }

    /// @dev ERC-1271: the DelegationManager calls this to validate a contract delegator's signature.
    function isValidSignature(bytes32 _hash, bytes calldata _signature) external view returns (bytes4) {
        if (ECDSA.recover(_hash, _signature) == owner) return ERC1271_MAGIC;
        return 0xffffffff;
    }

    /// @dev Only the DelegationManager (acting as executor) may dispatch an execution.
    function executeFromExecutor(
        ModeCode,
        bytes calldata _executionCalldata
    )
        external
        payable
        returns (bytes[] memory returnData_)
    {
        if (msg.sender != delegationManager) revert NotDelegationManager();
        (address target_, uint256 value_, bytes calldata callData_) = _executionCalldata.decodeSingle();
        (bool ok_, bytes memory ret_) = target_.call{ value: value_ }(callData_);
        if (!ok_) revert CallFailed();
        returnData_ = new bytes[](1);
        returnData_[0] = ret_;
    }

    receive() external payable { }
}
