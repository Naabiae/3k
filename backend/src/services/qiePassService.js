const axios = require('axios');
const { QIE_PASS_API_URL, generateAuthHeaders } = require('../config/qiePassConfig');

/**
 * Service to interact with the QIE Pass API
 */
class QIEPassService {
    
    /**
     * Create a verification request for a user's wallet address
     * @param {string} walletAddress The user's identifier (0x...)
     * @param {string[]} requestedClaims Array of claims needed (e.g., ["firstName", "country", "kyc_verified"])
     * @returns {Object} Verification request data including requestId and redirectUrl
     */
    static async createVerificationRequest(walletAddress, requestedClaims = ["kyc_verified"]) {
        try {
            const headers = generateAuthHeaders();
            const payload = {
                identifier: walletAddress,
                requestedClaims: requestedClaims
            };

            const response = await axios.post(
                `${QIE_PASS_API_URL}/partners/verification-requests`,
                payload,
                { headers }
            );

            return response.data;
        } catch (error) {
            console.error('Error creating verification request:', error.response?.data || error.message);
            throw new Error('Failed to create QIE Pass verification request');
        }
    }

    /**
     * Check the status of a pending verification request
     * @param {string} requestId The ID returned from createVerificationRequest
     * @returns {Object} Status of the request
     */
    static async getRequestStatus(requestId) {
        try {
            const headers = generateAuthHeaders();
            const response = await axios.get(
                `${QIE_PASS_API_URL}/partners/verification-requests/${requestId}`,
                { headers }
            );

            return response.data;
        } catch (error) {
            console.error('Error getting request status:', error.response?.data || error.message);
            throw new Error('Failed to get verification status');
        }
    }

    /**
     * Claim and verify the user's credentials once they have approved the request
     * @param {string} requestId The ID of the approved request
     * @returns {Object} The verified credentials/claims
     */
    static async claimAndVerify(requestId) {
        try {
            const headers = generateAuthHeaders();
            const payload = { requestId };

            const response = await axios.post(
                `${QIE_PASS_API_URL}/vc/partner/claim-and-verify`,
                payload,
                { headers }
            );

            return response.data;
        } catch (error) {
            console.error('Error claiming credentials:', error.response?.data || error.message);
            throw new Error('Failed to claim and verify credentials');
        }
    }
}

module.exports = QIEPassService;