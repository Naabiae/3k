// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockCToken is ERC20 {
    using SafeERC20 for IERC20;
    IERC20 public underlying;
    uint256 public exchangeRate = 1e18;

    constructor(IERC20 _underlying) ERC20("Mock cToken", "mcToken") {
        underlying = _underlying;
    }

    function setExchangeRate(uint256 _rate) external {
        exchangeRate = _rate;
    }

    function mint(uint256 mintAmount) external returns (uint256) {
        underlying.safeTransferFrom(msg.sender, address(this), mintAmount);
        uint256 cTokens = (mintAmount * 1e18) / exchangeRate;
        _mint(msg.sender, cTokens);
        return 0; // 0 = success in Compound
    }

    function redeem(uint256 redeemTokens) external returns (uint256) {
        _burn(msg.sender, redeemTokens);
        uint256 underlyingAmount = (redeemTokens * exchangeRate) / 1e18;
        underlying.safeTransfer(msg.sender, underlyingAmount);
        return 0;
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        uint256 cTokens = (redeemAmount * 1e18) / exchangeRate;
        _burn(msg.sender, cTokens);
        underlying.safeTransfer(msg.sender, redeemAmount);
        return 0;
    }

    function exchangeRateStored() external view returns (uint256) {
        return exchangeRate;
    }

    function balanceOfUnderlying(address owner) external view returns (uint256) {
        return (balanceOf(owner) * exchangeRate) / 1e18;
    }
}
