# Implementation Plan: QIE Smart Router

## Phase 1: Setup & Mock Contracts
1. **Install OpenZeppelin Contracts**
   - Install `@openzeppelin/contracts` for standard ERC20, ERC4626, and security interfaces (ReentrancyGuard).
2. **Create Mock Contracts for Testing**
   - Create `MockERC20.sol`: A standard ERC20 token with minting capabilities to act as our Mock USDC.
   - Create `MockERC4626Vault.sol`: An ERC4626-compliant vault that wraps the MockERC20 token. Include a function `simulateYield(uint256 amount)` to artificially increase the underlying balance for testing purposes.

## Phase 2: Core Contracts
1. **Create `SmartRouter.sol`**
   - Define state variables: owner, factory, percentages (Operating, Treasury, Drip), allowance parameters.
   - Implement the `initialize()` function (using the clone pattern) or standard constructor.
   - Implement `processPayment(address token)`: Calculate splits, transfer Operating Capital, and deposit the rest into the vault, updating internal accounting (`treasuryBalance`, `lockedBalance`).
   - Implement `claimAllowance(address token)`: Check time periods, calculate required shares, withdraw from vault, transfer to owner.
   - Implement `withdrawTreasury(address token, uint256 amount)`: Allow owner to withdraw from their unrestricted yield.
   - Implement `updateSettings(...)`: Allow owner to modify parameters.
2. **Create `RouterFactory.sol`**
   - Define state: `owner` (admin), mappings for deployed routers, and whitelisted vaults.
   - Implement `whitelistVault(address token, address vault)`: Admin-only function to map tokens to approved yield strategies.
   - Implement `deployRouter(...)`: Deploys a new `SmartRouter` and initializes it with the user's settings. Emits a `RouterDeployed` event.

## Phase 3: Testing & Verification
1. **Write Hardhat Tests (`test/SmartRouter.test.ts`)**
   - **Deployment:** Verify Factory deploys Routers correctly.
   - **Payment Processing:** Send Mock USDC to the router, call `processPayment()`, and verify correct splits between the owner's wallet and the Vault.
   - **Allowance Claiming:** Fast-forward time using Hardhat's `time.increase`, call `claimAllowance()`, and verify the owner receives the exact allowance amount.
   - **Yield Simulation:** Simulate yield in the Vault, withdraw from Treasury, and verify the owner receives principal + yield.
   - **Access Control:** Ensure only the owner can withdraw Treasury or update settings.

## Phase 4: Deployment Scripts
1. **Write Ignition / Deployment Scripts**
   - Create a script to deploy the Factory on the QIE network.
   - Create a script to deploy Mock tokens/vaults for testnet environments.