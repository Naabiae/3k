# Feature Design: Off-Chain Email & QR Payment Routing

## Overview
To provide a seamless, Web2-like payment experience while interacting with our Web3 Smart Router infrastructure, we will use our centralized Node.js backend to map user emails (and automatically generated QR codes) to their respective deployed Smart Router addresses. This ensures instantaneous lookups and hides the complexity of blockchain addresses from everyday users.

## Key Requirements

### 1. Database / Registry Mapping (Backend)
When a user deploys a Smart Router, the frontend will notify the backend to create a mapping:
- `email`: "alice@qie.com"
- `walletAddress`: "0xABC..." (User's EOA)
- `routerAddress`: "0xDEF..." (The Smart Router they deployed)

### 2. Payment Resolution (Frontend to Backend)
When "Bob" wants to pay "Alice" using her email:
1. Bob types "alice@qie.com" into the frontend payment portal.
2. The frontend sends a `GET /api/resolve?email=alice@qie.com` to our backend.
3. The backend returns Alice's `routerAddress` ("0xDEF...").
4. The frontend initiates an on-chain transaction: Bob's wallet calls `payAndSave(USDC, 0xDEF..., amount)` on *his* Smart Router (or just sends USDC directly to `0xDEF...` if he doesn't have a router).

### 3. QR Code Generation
- The backend (or frontend) can generate standard URI QR codes using the `qie:` schema or simply a JSON payload.
- **Example Payload:** `qie:pay?email=alice@qie.com&token=USDC`
- When a user scans this with the dApp's built-in scanner, it instantly resolves the email via the backend and prepares the payment transaction.

## Backend Implementation (`routes/paymentRoutes.js`)

We will add a new Express router to handle these off-chain mappings. Since this is for a hackathon, we can use an in-memory object (or a simple SQLite/JSON file) to store the mappings to avoid setting up a full Postgres/Mongo database.

### Endpoints
- `POST /api/payments/register`: 
  - Body: `{ email, walletAddress, routerAddress }`
  - Action: Stores the mapping securely in the backend.
- `GET /api/payments/resolve/:email`:
  - Returns: `{ routerAddress, walletAddress }`
  - Action: Looks up the email and returns the destination addresses so the frontend can route the payment.