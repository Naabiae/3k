# Feature Design: Pay and Save (Round-up Savings)

## Overview
The "Pay and Save" feature allows a Smart Router owner to automate savings on *outgoing* payments. When the user pays a merchant or recipient through their Smart Router, a configurable percentage of that payment is automatically pulled from the user's wallet, deposited into their Yield Vault, and tracked as a separate "Savings" bucket.

## Key Requirements
- **Global Dynamic Setting:** The owner can set and update a `savePct` (e.g., 10%) on their Smart Router at any time.
- **Automated Deduction:** When the user calls `payAndSave()`, the contract pulls `paymentAmount + (paymentAmount * savePct / 10000)` from the user's wallet. The user must have approved the Smart Router to spend their tokens.
- **Yield Generation:** The saved portion is deposited into the whitelisted ERC4626 Vault.
- **Granular Tracking:** The Smart Router must track the "Savings" bucket separately from the existing "Treasury" and "Locked" buckets. It must track both:
  1. The **Principal Saved:** The total exact amount of underlying tokens the user has saved through this feature (excluding yield).
  2. The **Shares Owned:** The vault shares representing the savings, which allows calculating the total value *including yield*.

## Contract Changes (`SmartRouter.sol`)

### 1. New State Variables
- `uint256 public savePct;`: The global percentage (in basis points, where 10000 = 100%) applied to outgoing payments.
- `uint256 public savedPrincipal;`: Tracks the exact underlying token amount deposited via Pay & Save.
- `uint256 public savedShares;`: Tracks the ERC4626 shares minted for the Pay & Save bucket.

### 2. New Functions
- `updateSavePct(uint256 newSavePct) external onlyOwner`: Allows the owner to change their saving rate at any time.
- `payAndSave(address token, address recipient, uint256 amount) external onlyOwner`:
  - Calculates `saveAmount = (amount * savePct) / 10000`.
  - Calculates `totalRequired = amount + saveAmount`.
  - Pulls `totalRequired` from the owner's EOA (`msg.sender`) to the Smart Router using `transferFrom`.
  - Transfers `amount` to the `recipient`.
  - If `saveAmount > 0`, deposits it into the whitelisted ERC4626 Vault.
  - Adds `saveAmount` to `savedPrincipal`.
  - Adds the newly minted shares to `savedShares`.
  - Emits a `PaymentSentAndSaved` event.
- `withdrawSavings(address token, uint256 amount) external onlyOwner`:
  - Similar to `withdrawTreasury`, but pulls from `savedShares`.
  - Proportionally reduces `savedPrincipal` so the "Principal vs Yield" tracking remains accurate after a partial withdrawal.

### 3. Read Functions for the Frontend
- `getSavingsValue(address token) external view returns (uint256 principal, uint256 totalValue, uint256 yieldEarned)`:
  - `principal` = `savedPrincipal`
  - `totalValue` = `vault.previewRedeem(savedShares)`
  - `yieldEarned` = `totalValue - principal` (handles edge cases if vault loses value).

## Data Flow Example
1. User sets `savePct` to 1000 (10%).
2. User wants to buy a coffee for 5 USDC. They call `payAndSave(USDC, CoffeeShop, 5 USDC)`.
3. The Router pulls 5.50 USDC from the User's wallet.
4. The Router sends 5 USDC to CoffeeShop.
5. The Router deposits 0.50 USDC into the Yield Vault.
6. `savedPrincipal` increases by 0.50. `savedShares` increases based on the exchange rate.
7. Over time, the 0.50 USDC generates yield. The user can call `getSavingsValue()` to see they saved 0.50 USDC, but it is now worth 0.55 USDC (0.05 USDC yield).