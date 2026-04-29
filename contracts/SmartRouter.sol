// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IRouterFactory {
    function getVault(address token) external view returns (address);
}

contract SmartRouter is Initializable {
    using SafeERC20 for IERC20;

    address public owner;
    address public factory;

    uint256 public operatingPct;
    uint256 public treasuryPct;
    uint256 public lockedPct;

    uint256 public allowanceAmount;
    uint256 public allowancePeriod;
    uint256 public lastAllowanceRelease;

    // Track shares owned by each bucket
    uint256 public treasuryShares;
    uint256 public lockedShares;

    // Pay & Save tracking
    uint256 public savePct;
    uint256 public savedPrincipal;
    uint256 public savedShares;

    event PaymentProcessed(address indexed token, uint256 totalAmount, uint256 operatingAmount, uint256 treasurySharesMinted, uint256 lockedSharesMinted);
    event AllowanceClaimed(address indexed token, uint256 amountClaimed, uint256 sharesBurned);
    event TreasuryWithdrawn(address indexed token, uint256 amountWithdrawn, uint256 sharesBurned);
    event SettingsUpdated(uint256 operatingPct, uint256 treasuryPct, uint256 lockedPct, uint256 allowanceAmount, uint256 allowancePeriod);
    event SavePctUpdated(uint256 newSavePct);
    event PaymentSentAndSaved(address indexed token, address indexed recipient, uint256 amountSent, uint256 amountSaved, uint256 sharesMinted);
    event SavingsWithdrawn(address indexed token, uint256 amountWithdrawn, uint256 sharesBurned);

    error Unauthorized();
    error InvalidPercentages();
    error VaultNotSupported();
    error AllowancePeriodNotMet();
    error InsufficientLockedShares();
    error InsufficientTreasuryShares();
    error InsufficientSavedShares();
    error ExceedsMaxPercentage();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _factory,
        uint256 _operatingPct,
        uint256 _treasuryPct,
        uint256 _lockedPct,
        uint256 _allowanceAmount,
        uint256 _allowancePeriod
    ) external initializer {
        owner = _owner;
        factory = _factory;

        if (_operatingPct + _treasuryPct + _lockedPct != 10000) {
            revert InvalidPercentages();
        }

        operatingPct = _operatingPct;
        treasuryPct = _treasuryPct;
        lockedPct = _lockedPct;
        allowanceAmount = _allowanceAmount;
        allowancePeriod = _allowancePeriod;
        lastAllowanceRelease = block.timestamp;
    }

    /**
     * @dev Process all balance of the specified token sitting in this contract.
     * Can be called by anyone (bot, owner, sender).
     */
    function processPayment(address token) external {
        uint256 totalBalance = IERC20(token).balanceOf(address(this));
        if (totalBalance == 0) return;

        uint256 operatingAmount = (totalBalance * operatingPct) / 10000;
        uint256 treasuryAmount = (totalBalance * treasuryPct) / 10000;
        uint256 lockedAmount = totalBalance - operatingAmount - treasuryAmount; // Avoid rounding dust left over

        // 1. Transfer Operating Capital directly to the owner
        if (operatingAmount > 0) {
            IERC20(token).safeTransfer(owner, operatingAmount);
        }

        // 2. Deposit Yield and Locked portions into the Vault
        uint256 totalToDeposit = treasuryAmount + lockedAmount;
        uint256 tSharesMinted = 0;
        uint256 lSharesMinted = 0;

        if (totalToDeposit > 0) {
            address vaultAddress = IRouterFactory(factory).getVault(token);
            if (vaultAddress == address(0)) revert VaultNotSupported();

            IERC4626 vault = IERC4626(vaultAddress);
            IERC20(token).safeIncreaseAllowance(vaultAddress, totalToDeposit);
            
            uint256 sharesMinted = vault.deposit(totalToDeposit, address(this));

            // Distribute shares proportionally based on deposited amounts
            if (treasuryAmount > 0) {
                tSharesMinted = (sharesMinted * treasuryAmount) / totalToDeposit;
                treasuryShares += tSharesMinted;
            }
            if (lockedAmount > 0) {
                lSharesMinted = sharesMinted - tSharesMinted;
                lockedShares += lSharesMinted;
            }
        }

        emit PaymentProcessed(token, totalBalance, operatingAmount, tSharesMinted, lSharesMinted);
    }

    /**
     * @dev Claim the allowance amount from the locked vault shares.
     * Can be called by anyone, releasing funds to the owner if the time has passed.
     */
    function claimAllowance(address token) external {
        if (block.timestamp < lastAllowanceRelease + allowancePeriod) revert AllowancePeriodNotMet();
        if (allowanceAmount == 0) return;

        address vaultAddress = IRouterFactory(factory).getVault(token);
        if (vaultAddress == address(0)) revert VaultNotSupported();

        IERC4626 vault = IERC4626(vaultAddress);
        
        // Calculate how many shares are needed to withdraw the allowanceAmount
        uint256 sharesNeeded = vault.previewWithdraw(allowanceAmount);
        
        if (sharesNeeded > lockedShares) {
            // If the allowance requested is more than available, just withdraw everything in lockedShares
            sharesNeeded = lockedShares;
        }

        if (sharesNeeded == 0) revert InsufficientLockedShares();

        lockedShares -= sharesNeeded;
        lastAllowanceRelease = block.timestamp;

        // Withdraw from vault directly to the owner
        uint256 amountWithdrawn = vault.redeem(sharesNeeded, owner, address(this));

        emit AllowanceClaimed(token, amountWithdrawn, sharesNeeded);
    }

    /**
     * @dev Withdraw from the unrestricted treasury balance.
     * Only callable by the owner.
     */
    function withdrawTreasury(address token, uint256 amount) external onlyOwner {
        address vaultAddress = IRouterFactory(factory).getVault(token);
        if (vaultAddress == address(0)) revert VaultNotSupported();

        IERC4626 vault = IERC4626(vaultAddress);
        
        uint256 sharesNeeded;
        if (amount == type(uint256).max) {
            sharesNeeded = treasuryShares;
        } else {
            sharesNeeded = vault.previewWithdraw(amount);
            if (sharesNeeded > treasuryShares) revert InsufficientTreasuryShares();
        }

        if (sharesNeeded == 0) return;

        treasuryShares -= sharesNeeded;

        // Withdraw from vault directly to the owner
        uint256 amountWithdrawn = vault.redeem(sharesNeeded, owner, address(this));

        emit TreasuryWithdrawn(token, amountWithdrawn, sharesNeeded);
    }

    /**
     * @dev Update router settings. Only callable by the owner.
     */
    function updateSettings(
        uint256 _operatingPct,
        uint256 _treasuryPct,
        uint256 _lockedPct,
        uint256 _allowanceAmount,
        uint256 _allowancePeriod
    ) external onlyOwner {
        if (_operatingPct + _treasuryPct + _lockedPct != 10000) {
            revert InvalidPercentages();
        }

        operatingPct = _operatingPct;
        treasuryPct = _treasuryPct;
        lockedPct = _lockedPct;
        allowanceAmount = _allowanceAmount;
        allowancePeriod = _allowancePeriod;

        emit SettingsUpdated(_operatingPct, _treasuryPct, _lockedPct, _allowanceAmount, _allowancePeriod);
    }

    /**
     * @dev Updates the global savings percentage for outgoing payments.
     */
    function updateSavePct(uint256 _savePct) external onlyOwner {
        if (_savePct > 10000) revert ExceedsMaxPercentage();
        savePct = _savePct;
        emit SavePctUpdated(_savePct);
    }

    /**
     * @dev Pay a recipient and automatically deduct the savings percentage from the owner's wallet.
     * Requires the owner to have approved this contract to spend their tokens.
     */
    function payAndSave(address token, address recipient, uint256 amount) external onlyOwner {
        uint256 saveAmount = (amount * savePct) / 10000;
        uint256 totalRequired = amount + saveAmount;

        // Pull funds from owner
        IERC20(token).safeTransferFrom(owner, address(this), totalRequired);

        // Send payment to recipient
        IERC20(token).safeTransfer(recipient, amount);

        // Deposit savings into Vault
        uint256 sharesMinted = 0;
        if (saveAmount > 0) {
            address vaultAddress = IRouterFactory(factory).getVault(token);
            if (vaultAddress == address(0)) revert VaultNotSupported();

            IERC4626 vault = IERC4626(vaultAddress);
            IERC20(token).safeIncreaseAllowance(vaultAddress, saveAmount);
            
            sharesMinted = vault.deposit(saveAmount, address(this));

            savedPrincipal += saveAmount;
            savedShares += sharesMinted;
        }

        emit PaymentSentAndSaved(token, recipient, amount, saveAmount, sharesMinted);
    }

    /**
     * @dev Withdraws from the saved shares.
     */
    function withdrawSavings(address token, uint256 amount) external onlyOwner {
        if (amount == 0) return;

        address vaultAddress = IRouterFactory(factory).getVault(token);
        if (vaultAddress == address(0)) revert VaultNotSupported();

        IERC4626 vault = IERC4626(vaultAddress);
        
        uint256 sharesNeeded;
        if (amount == type(uint256).max) {
            sharesNeeded = savedShares;
            amount = vault.previewRedeem(sharesNeeded);
        } else {
            sharesNeeded = vault.previewWithdraw(amount);
            if (sharesNeeded > savedShares) revert InsufficientSavedShares();
        }

        if (sharesNeeded == 0) return;

        // Reduce principal proportionally
        // (sharesNeeded / savedShares) * savedPrincipal
        uint256 principalReduction = (sharesNeeded * savedPrincipal) / savedShares;
        savedPrincipal -= principalReduction;
        savedShares -= sharesNeeded;

        uint256 amountWithdrawn = vault.redeem(sharesNeeded, owner, address(this));

        emit SavingsWithdrawn(token, amountWithdrawn, sharesNeeded);
    }

    /**
     * @dev Helper to read the current value of the saved bucket.
     */
    function getSavingsValue(address token) external view returns (uint256 principal, uint256 totalValue, uint256 yieldEarned) {
        principal = savedPrincipal;
        if (savedShares > 0) {
            address vaultAddress = IRouterFactory(factory).getVault(token);
            if (vaultAddress != address(0)) {
                totalValue = IERC4626(vaultAddress).previewRedeem(savedShares);
            }
        }
        
        if (totalValue > principal) {
            yieldEarned = totalValue - principal;
        } else {
            yieldEarned = 0;
        }
    }
}
