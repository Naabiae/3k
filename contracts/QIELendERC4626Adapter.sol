// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICToken is IERC20 {
    function mint(uint256 mintAmount) external returns (uint256);
    function redeem(uint256 redeemTokens) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
    function exchangeRateStored() external view returns (uint256);
    function balanceOfUnderlying(address owner) external returns (uint256);
}

contract QIELendERC4626Adapter is ERC4626 {
    using SafeERC20 for IERC20;

    ICToken public immutable cToken;

    constructor(IERC20 _asset, ICToken _cToken, string memory _name, string memory _symbol)
        ERC4626(_asset)
        ERC20(_name, _symbol)
    {
        cToken = _cToken;
    }

    function totalAssets() public view override returns (uint256) {
        uint256 exchangeRate = cToken.exchangeRateStored();
        // cToken exchangeRate is scaled by 1e18
        // assets = (cTokens * exchangeRate) / 1e18
        return (cToken.balanceOf(address(this)) * exchangeRate) / 1e18;
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        // Transfer underlying assets from caller to this adapter
        IERC20(asset()).safeTransferFrom(caller, address(this), assets);

        // Approve and mint cTokens
        IERC20(asset()).safeIncreaseAllowance(address(cToken), assets);
        require(cToken.mint(assets) == 0, "QIELend: mint failed");

        // Mint ERC4626 shares to receiver
        _mint(receiver, shares);

        emit Deposit(caller, receiver, assets, shares);
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        // Burn ERC4626 shares from owner
        _burn(owner, shares);

        // Redeem underlying assets from cToken
        require(cToken.redeemUnderlying(assets) == 0, "QIELend: redeem failed");

        // Transfer underlying assets to receiver
        IERC20(asset()).safeTransfer(receiver, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);
    }
}
