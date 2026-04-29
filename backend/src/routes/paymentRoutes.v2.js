# Venmo-like Web3 Payment App - Backend Implementation

## Database Schema (SQLite)

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  router_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet_address);
```

### Payments Table
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  token TEXT DEFAULT 'USDC',
  status TEXT DEFAULT 'pending',
  transaction_hash TEXT,
  qr_code_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

CREATE INDEX idx_payments_sender ON payments(sender_id);
CREATE INDEX idx_payments_recipient ON payments(recipient_id);
CREATE INDEX idx_payments_status ON payments(status);
```

## Backend API Endpoints

### Auth & User Management
- `POST /api/auth/register` - Register user (email + wallet)
- `POST /api/auth/verify-email` - Verify email (part of QIE Pass)
- `GET /api/users/me` - Get current user
- `GET /api/users/:email` - Get user by email
- `GET /api/users/:email/qr` - Generate payment QR code

### Payments
- `POST /api/payments` - Create payment (email → email)
- `GET /api/payments` - Get payment history
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/:id/execute` - Execute on-chain payment

### Balances
- `GET /api/balances` - Get user balances (all buckets)
- `GET /api/balances/available` - Get available (liquid) balance

### Investments
- `POST /api/investments` - Invest funds in vault
- `GET /api/investments` - Get investment history
- `POST /api/investments/:id/withdraw` - Withdraw from vault

### QIE Pass Integration (existing)
- `POST /api/kyc/request-verification` - Start KYC
- `GET /api/kyc/status/:requestId` - Check KYC status
- `POST /api/kyc/claim` - Claim KYC verification

## Express Routes Structure

```
backend/src/
├── index.js              # Main server
├── config/
│   └── database.js       # DB connection
├── models/
│   ├── User.js           # User model
│   └── Payment.js        # Payment model
├── routes/
│   ├── authRoutes.js     # Authentication
│   ├── userRoutes.js     # User management
│   ├── paymentRoutes.js  # Payments (updated)
│   ├── balanceRoutes.js  # Balance queries
│   ├── investmentRoutes.js # Invest/withdraw
│   └── kycRoutes.js      # QIE Pass (existing)
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── paymentController.js
│   ├── balanceController.js
│   └── investmentController.js
├── services/
│   ├── qiePassService.js # Existing
│   ├── qrCodeService.js  # New: Generate QR codes
│   └── contractService.js # New: Web3 interactions
└── middleware/
    └── auth.js           # Auth middleware
```

## Implementation Details

### Database Connection (config/database.js)
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../../qie-pay.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    wallet_address TEXT NOT NULL,
    router_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    token TEXT DEFAULT 'USDC',
    status TEXT DEFAULT 'pending',
    transaction_hash TEXT,
    qr_code_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
  )`);
});

module.exports = db;
```

### User Model (models/User.js)
```javascript
class User {
  static async create(email, walletAddress, routerAddress = null) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, wallet_address, router_address) VALUES (?, ?, ?)',
        [email, walletAddress, routerAddress],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, email, walletAddress, routerAddress });
        }
      );
    });
  }

  static async findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static async findByWallet(walletAddress) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE wallet_address = ?', [walletAddress], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static async updateRouter(userId, routerAddress) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET router_address = ? WHERE id = ?',
        [routerAddress, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  }
}

module.exports = User;
```

### Payment Model (models/Payment.js)
```javascript
class Payment {
  static async create(senderId, recipientId, amount, token = 'USDC') {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO payments (sender_id, recipient_id, amount, token) VALUES (?, ?, ?, ?)',
        [senderId, recipientId, amount, token],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, senderId, recipientId, amount, token, status: 'pending' });
        }
      );
    });
  }

  static async findByUser(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, u1.email as sender_email, u2.email as recipient_email 
         FROM payments p 
         JOIN users u1 ON p.sender_id = u1.id 
         JOIN users u2 ON p.recipient_id = u2.id 
         WHERE p.sender_id = ? OR p.recipient_id = ? 
         ORDER BY p.created_at DESC`,
        [userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static async updateStatus(paymentId, status, txHash = null) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE payments SET status = ?, transaction_hash = ? WHERE id = ?',
        [status, txHash, paymentId],
        function(err) {
          if (err) reject(err);
          else resolve({ success: this.changes > 0 });
        }
      );
    });
  }
}

module.exports = Payment;
```

### QR Code Service (services/qrCodeService.js)
```javascript
const QRCode = require('qrcode');

class QRCodeService {
  static async generatePaymentQR(senderEmail, recipientEmail, amount, token = 'USDC') {
    const paymentData = {
      type: 'qie_payment',
      sender: senderEmail,
      recipient: recipientEmail,
      amount: amount,
      token: token,
      timestamp: Date.now()
    };

    try {
      const qrData = await QRCode.toDataURL(JSON.stringify(paymentData));
      return qrData;
    } catch (err) {
      throw new Error('Failed to generate QR code: ' + err.message);
    }
  }

  static decodePaymentQR(qrData) {
    try {
      return JSON.parse(qrData);
    } catch (err) {
      throw new Error('Invalid QR code data');
    }
  }
}

module.exports = QRCodeService;
```

## Updated paymentRoutes.js

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const User = require('../models/User');
const Payment = require('../models/Payment');
const QRCodeService = require('../services/qrCodeService');

// Register user
router.post('/register', async (req, res) => {
  const { email, walletAddress, routerAddress } = req.body;

  if (!email || !walletAddress) {
    return res.status(400).json({ error: "Email and wallet address are required" });
  }

  try {
    const existingUser = await User.findByEmail(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await User.create(email.toLowerCase(), walletAddress, routerAddress);
    res.json({ success: true, message: "User registered successfully", data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by email
router.get('/users/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate payment QR code
router.get('/users/:email/qr', async (req, res) => {
  const { email } = req.params;
  const { senderEmail, amount } = req.query;

  try {
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const qrData = await QRCodeService.generatePaymentQR(
      senderEmail || 'unknown',
      email,
      amount || '0'
    );

    res.json({ success: true, qrCode: qrData, paymentUri: `qie:pay?target=${email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create payment
router.post('/payments', async (req, res) => {
  const { senderEmail, recipientEmail, amount, token = 'USDC' } = req.body;

  if (!senderEmail || !recipientEmail || !amount) {
    return res.status(400).json({ error: "Sender, recipient, and amount are required" });
  }

  try {
    const sender = await User.findByEmail(senderEmail.toLowerCase());
    const recipient = await User.findByEmail(recipientEmail.toLowerCase());

    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    const payment = await Payment.create(sender.id, recipient.id, amount, token);
    
    // Generate QR code for this payment
    const qrCode = await QRCodeService.generatePaymentQR(senderEmail, recipientEmail, amount, token);
    
    res.json({ 
      success: true, 
      message: "Payment created successfully", 
      data: { ...payment, qrCode }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get payment history
router.get('/payments', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await User.findByEmail(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const payments = await Payment.findByUser(user.id);
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
