const express = require('express');

const router = express.Router();

// Temporary in-memory database for hackathon purposes
// In a real production app, this would be a Postgres/MongoDB database
const usersByEmail = {};
const usersByWallet = {};

/**
 * Register a user's email, wallet address, and deployed Smart Router.
 * This is called by the frontend immediately after a successful Smart Router deployment.
 */
router.post('/register', (req, res) => {
    const { email, walletAddress, routerAddress } = req.body;

    if (!email || !walletAddress || !routerAddress) {
        return res.status(400).json({ error: "Missing required fields: email, walletAddress, routerAddress" });
    }

    const emailKey = email.toLowerCase();
    const walletKey = walletAddress.toLowerCase();

    // Store in our mock database
    const userRecord = {
        email: emailKey,
        walletAddress: walletKey,
        routerAddress: routerAddress.toLowerCase(),
        registeredAt: new Date().toISOString()
    };

    usersByEmail[emailKey] = userRecord;
    usersByWallet[walletKey] = userRecord;

    res.json({
        success: true,
        message: "User payment profile registered successfully.",
        data: userRecord
    });
});

/**
 * Resolve an email address to a Smart Router address.
 * Called by the frontend when "Bob" types "alice@qie.com" into the payment form
 * or scans Alice's QR code.
 */
router.get('/resolve/:email', (req, res) => {
    const { email } = req.params;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    const emailKey = email.toLowerCase();
    const userRecord = usersByEmail[emailKey];

    if (!userRecord) {
        return res.status(404).json({ error: "No Smart Router found for this email address." });
    }

    res.json({
        success: true,
        data: {
            routerAddress: userRecord.routerAddress,
            walletAddress: userRecord.walletAddress
        }
    });
});

/**
 * Generate a payment payload (which the frontend can turn into a QR Code)
 */
router.get('/qr/:email', (req, res) => {
    const { email } = req.params;
    
    // We verify the email exists before generating a valid payload
    const emailKey = email.toLowerCase();
    if (!usersByEmail[emailKey]) {
        return res.status(404).json({ error: "Email not found in registry." });
    }

    // The frontend will take this URI and use a library like 'qrcode.react' to display it
    const qrUri = `qie:pay?target=${encodeURIComponent(emailKey)}`;

    res.json({
        success: true,
        qrUri: qrUri,
        message: "Encode this URI into a QR code on the frontend."
    });
});

module.exports = router;