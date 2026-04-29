# QIE Smart Router

The Decentralized Payroll & Treasury Automation platform.

## Features
- Allows freelancers and businesses to deploy a personalized Smart Router.
- Accepts ERC20 (e.g. USDC) payments.
- Instantly routes a percentage of payments to the owner's Operating Capital.
- Automatically deposits the remaining percentages into a yield-generating Vault (Treasury / Savings & Time-Locked Drip).
- Supports time-locked allowance releases (e.g. automated weekly salary).

## Getting Started

### Prerequisites
- Node.js >= 20
- NPM

### Installation

```bash
npm install
```

### Compilation

```bash
npx hardhat compile
```

### Running Tests

Tests cover payment processing, correct split logic, allowance claims, and simulated yield generation in Mock vaults.

```bash
npx hardhat test
```

### Deployment

Deploy the Factory and Router Implementation to a local Hardhat network:

```bash
npx hardhat ignition deploy ignition/modules/SmartRouterDeployment.ts
```

For live networks like QIE, add the network details in `hardhat.config.ts` and deploy using the `--network` flag:

```bash
npx hardhat ignition deploy ignition/modules/SmartRouterDeployment.ts --network qie
```
