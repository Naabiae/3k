const express = require('express');
const cors = require('cors');
require('dotenv').config();

const kycRoutes = require('./routes/kycRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/kyc', kycRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`QIE Smart Router Backend running on http://localhost:${PORT}`);
  console.log('QIE Pass API Integration Active');
});