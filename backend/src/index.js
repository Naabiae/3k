const express = require('express');
const cors = require('cors');
require('dotenv').config();

const kycRoutes = require('./routes/kycRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/kyc', kycRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'QIE Smart Router Backend' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`- KYC endpoints at http://localhost:${PORT}/api/kyc`);
    console.log(`- Payment endpoints at http://localhost:${PORT}/api/payments`);
});