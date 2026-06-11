// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice A freely-mintable 6-decimal ERC20 used so demo amounts are fully controlled
 *         (no faucet dependency). Not for production — anyone can mint.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint test tokens to any address.
    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
