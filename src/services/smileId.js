const axios = require('axios');

const BASE_URL = process.env.SMILE_ID_BASE_URL ||
'https://testapi.smileidentity.com/v1';

const verifyDocument = async ({ idImageUrl, selfieUrl, idType = 'NATIONAL_ID',country = 'RW' }) => {
    try {
        const payload = {
            partner_id: process.env.SMILE_ID_PARTNER_ID,
            sec_key:    generateSecKey(),
            timestamp:  new Date().toISOString(),
            country,
            id_ttype: idType,
            id_image_url: idImageUrl,
            selfie_url: selfieUrl, 
        };

        const { data } = await axios.post(`${BASE_URL}/id_verification`, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });

        const matchScore = parseFloat(data.ConfidenceValue || data.confidence || 0);

        return {
            verified: matchScore >= 0.9 && data.ResultCode === '1012',
            name:     data.FullName || data.full_name || '',
            idNumber: data.IdNumber || data.id_number || '',
            matchScore,
            rawResult: data.ResultText || '',
        };
    } catch (err) {
        console.error('[SmileID] verification error:', err.response?.data || err.message);
        throw new Error('ID verification service unvailable');
    }
};

const generateSecKey = () => {
    const crypto = require('crypto');
    const ts = Date.now();
    const hash = crypto.createHmac('sha256', process.env.SMILE_ID_API_KEY  || 'dev_key').update(`${process.env.SMILE_ID_PARTNER_ID}${ts}`).digest('base64');
    return  `${hash}:${ts}`;
};

module.exports = { verifyDocument };