// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./MockERC20.sol";

contract MockERC4626Vault is ERC4626 {
    constructor(IERC20 asset_, string memory name_, string memory symbol_)
        ERC4626(asset_)
        ERC20(name_, symbol_)
    {}

    /**
     * @dev Artificially increases the underlying asset balance to simulate yield.
     * In a real vault, yield is generated through lending/staking. Here, we just mint 
     * more underlying tokens directly to the vault to simulate a yield accrual event.
     * Note: This requires the underlying asset to be our MockERC20.
     */
    function simulateYield(uint256 amount) external {
        MockERC20(address(asset())).mint(address(this), amount);
    }
}
