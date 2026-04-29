const express = require('express');
const QIEPassService = require('../services/qiePassService');

const router = express.Router();

/**
 * Endpoint to initiate a QIE Pass Identity Verification.
 * The frontend will call this when a user attempts to deploy a Smart Router.
 */
router.post('/request-verification', async (req, res) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address is required" });
    }

    try {
        // We request 'kyc_verified' and 'firstName' to establish trust
        const result = await QIEPassService.createVerificationRequest(walletAddress, ["kyc_verified", "firstName"]);
        
        if (result.success) {
            res.json({
                success: true,
                requestId: result.data.requestId,
                status: result.data.status,
                userStatus: result.data.userStatus,
                redirectUrl: result.data.redirectUrl
            });
        } else {
            res.status(500).json({ error: "Verification request failed on QIE Pass side" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint to check the status of an ongoing verification.
 * The frontend will poll this while the user completes the flow on QIE Pass.
 */
router.get('/status/:requestId', async (req, res) => {
    const { requestId } = req.params;

    try {
        const result = await QIEPassService.getRequestStatus(requestId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint to claim and verify the credentials once the user has approved.
 * If successful, the backend will mark the user as verified in its local database
 * and return a signed message/token allowing the frontend to call the Smart Contract.
 */
router.post('/claim', async (req, res) => {
    const { requestId } = req.body;

    if (!requestId) {
        return res.status(400).json({ error: "requestId is required" });
    }

    try {
        const claimResult = await QIEPassService.claimAndVerify(requestId);
        
        if (claimResult.success && claimResult.data.verified) {
            // Here you would typically save the verification status in your database
            // db.users.update({ walletAddress: claimResult.data.identifier }, { isVerified: true })

            res.json({
                success: true,
                message: "User identity verified successfully. Deployment unlocked.",
                claims: claimResult.data.claims
            });
        } else {
            res.status(400).json({ error: "Claims verification failed or was rejected by the user." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;