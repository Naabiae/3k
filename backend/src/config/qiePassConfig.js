const crypto = require('crypto');
require('dotenv').config();

const QIE_PASS_API_URL = process.env.QIE_PASS_API_URL || 'https://pass-api.qie.digital/api/v1';
const PUBLIC_KEY = process.env.QIE_PASS_PUBLIC_KEY || 'pk_test_abc123xyz';
const SECRET_KEY = process.env.QIE_PASS_SECRET_KEY || 'sk_test_xyz789abc';

/**
 * Generates headers required for QIE Pass API authentication
 * @returns {Object} Headers object containing HMAC signature
 */
function generateAuthHeaders() {
    const timestamp = Date.now().toString();
    const message = PUBLIC_KEY + timestamp;
    
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(message)
        .digest('hex');
        
    return {
        'Content-Type': 'application/json',
        'X-Public-Key': PUBLIC_KEY,
        'X-Signature': signature,
        'X-Timestamp': timestamp
    };
}

module.exports = {
    QIE_PASS_API_URL,
    generateAuthHeaders
};