# QIE Smart Router: Decentralized Payroll & Treasury Automation

## Overview
The QIE Smart Router is a decentralized cash-flow automation and yield generation platform designed for freelancers, remote workers, and small businesses on the QIE Blockchain. It allows any entity receiving payments to deploy a personalized "Smart Router" wallet. 

When clients, employers, or customers send funds to this Smart Router, the funds are automatically split according to the entity's predefined settings. The system routes a portion to their main wallet for immediate use, and deposits the rest into an ERC4626 Yield Vault. A portion of the yield-bearing funds can be time-locked to provide a steady, automated release (e.g., a weekly salary drip).

## Core Architecture

### 1. The Factory Contract (`RouterFactory.sol`)
**Purpose:** Acts as a central registry and deployer for Smart Routers.
- **Deployment:** Allows any user to deploy their own `SmartRouter` contract with initial settings.
- **Registry:** Keeps track of all deployed routers and their owners.
- **Whitelisting:** Maintains a mapping of supported ERC20 tokens to their approved ERC4626 Yield Vaults. Initially, this will support USDC. Only the Factory owner (Admin) can add new supported tokens and vaults.

### 2. The Smart Router Contract (`SmartRouter.sol`)
**Purpose:** The personalized, intelligent receiving address for the entity.
- **State/Settings:**
  - `owner`: The entity's primary EOA (Externally Owned Account) wallet address.
  - `factory`: The address of the `RouterFactory` to fetch whitelisted vaults.
  - `splitPercentages`: The configuration for how incoming funds are divided (e.g., 60% Operating Capital, 20% Treasury/Savings, 20% Drip/Allowance). *Must sum to 10000 (basis points) for precision.*
  - `allowanceAmount`: The fixed amount of tokens released per period from the Time-Locked portion.
  - `allowancePeriod`: The time duration between allowance releases (e.g., 1 week).
  - `lastAllowanceRelease`: Timestamp of the last allowance payment.
  - `treasuryBalance`: Tracks the amount of Vault shares belonging to the unrestricted Treasury/Savings.
  - `lockedBalance`: Tracks the amount of Vault shares belonging to the Time-Locked Drip/Allowance.

- **Core Functions:**
  - `processPayment(address token)`: The "crank" function. Can be called by *anyone* (e.g., a backend bot, the sender, or the owner). It checks the router's current balance of the specified token and splits it according to the settings:
    - **Operating Capital (X%):** Transferred immediately to the `owner`'s wallet.
    - **Treasury/Savings (Y%):** Deposited into the whitelisted ERC4626 Vault for that token. The resulting shares are added to `treasuryBalance`.
    - **Drip/Allowance (Z%):** Deposited into the *same* ERC4626 Vault (earning yield while locked). The resulting shares are added to `lockedBalance`.
  - `claimAllowance(address token)`: Can be called by *anyone*. If `allowancePeriod` has passed since `lastAllowanceRelease`, it calculates the number of Vault shares equivalent to `allowanceAmount`, withdraws the underlying token, and sends it to the `owner`. It then updates `lastAllowanceRelease`.
  - `withdrawTreasury(address token, uint256 amount)`: Only callable by the `owner`. Withdraws the specified amount of underlying tokens from the unrestricted Treasury/Savings portion of the Vault.
  - `updateSettings(uint256 newOperatingPct, uint256 newTreasuryPct, uint256 newLockedPct, uint256 newAllowanceAmount, uint256 newAllowancePeriod)`: Only callable by the `owner`. Updates the split configuration and allowance parameters.

### 3. The Yield Integration (`MockERC4626Vault.sol`)
**Purpose:** Standardized yield generation for testing and eventual mainnet deployment.
- **Functionality:** A basic implementation of the ERC4626 standard that accepts an underlying ERC20 token (like a Mock USDC) and mints shares. For testing purposes, it will include a function to artificially increase the underlying balance to simulate yield generation over time.

## Data Flow Example
1. A small business sets up a Router: 60% Operating Capital, 20% Treasury, 20% Drip ($500/week allowance).
2. A customer sends 10,000 USDC to the Router address.
3. A backend bot calls `processPayment(USDC)`.
4. The Router sends 6,000 USDC directly to the business's main wallet.
5. The Router deposits 4,000 USDC into the Yield Vault. It tracks 2,000 USDC worth of shares as `treasuryBalance` and 2,000 USDC worth of shares as `lockedBalance`.
6. One week later, the backend bot calls `claimAllowance(USDC)`.
7. The Router withdraws $500 worth of shares from the `lockedBalance` in the Vault and sends the USDC to the business's main wallet.

## Security & Error Handling
- **Slippage/Precision:** Basis points (10000 = 100%) will be used for percentage calculations to prevent rounding errors.
- **Access Control:** Only the `owner` can change settings or withdraw from the unrestricted treasury. Anyone can crank the `processPayment` or `claimAllowance` functions, as they only execute deterministic logic that benefits the `owner`.
- **Vault Whitelisting:** The Router will only attempt to deposit funds into vaults that have been explicitly whitelisted by the Factory, preventing malicious tokens from breaking the flow.
- **Reentrancy:** Standard reentrancy guards will be applied to all state-modifying external calls, especially during vault interactions and token transfers.

## Testing Strategy
- Deploy a Mock USDC ERC20 token.
- Deploy a Mock ERC4626 Vault that accepts Mock USDC.
- Deploy the `RouterFactory` and whitelist the Mock Vault.
- Deploy a `SmartRouter` via the Factory.
- Test `processPayment` with various split configurations.
- Simulate time passing (using Hardhat network helpers) and test `claimAllowance`.
- Simulate yield generation in the Mock Vault and ensure the owner can withdraw the principal + yield from their `treasuryBalance`.