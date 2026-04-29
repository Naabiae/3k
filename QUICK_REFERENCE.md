# QIE Pay - Quick Reference

## 🚀 Run Application

### Backend
```bash
cd backend
npm install
npm start
# Server: http://localhost:3001
# Health: http://localhost:3001/health
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

---

## 📁 Key Files

### Frontend Components
- `PaymentDashboard.tsx` - Main app
- `BalanceCard.tsx` - Balance display
- `SendPaymentModal.tsx` - Payment form
- `ReceiptsPage.tsx` - History
- `SettingsPage.tsx` - Config

### Backend
- `src/index.js` - Server + MongoDB
- `src/routes/paymentRoutes.js` - API endpoints

---

## 🔑 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payments/register` | Register user |
| GET | `/api/payments/resolve/:email` | Lookup wallet |
| POST | `/api/payments` | Create payment |
| GET | `/api/payments` | Get history |
| GET | `/api/payments/qr/:email` | QR code |

---

## 🎨 Design System

### Colors
- Background: `bg-ink-950`
- Cards: `bg-ink-900/50`
- Text: `text-white` / `text-ink-400`
- Operating: `text-green-400`
- Vault: `text-blue-400`
- Locked: `text-flare-400`
- Accent: `bg-flare-500`

### Icons
- 19 from `lucide-react`
- User, Wallet, Send, History, Settings, Mail, QrCode, etc.

---

## 📱 Routes

```
/               → Dashboard
/dashboard      → Dashboard
/send           → Send Payment
/receipts       → History
/settings       → Settings
/pay/:address   → External payment
```

---

## 🌐 Environment

### Backend `.env`
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
PORT=3001
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:3001
```

---

## ✨ Features

- ✅ Email-based payments
- ✅ QR code generation
- ✅ Balance management
- ✅ Transaction history
- ✅ Split configuration
- ✅ Mobile responsive
- ✅ MongoDB backend
- ✅ Smart contract ready

---

## 🚦 Status: COMPLETE ✅
