const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE  = process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
const COLL_KEY = process.env.MOMO_DISBURSEMENT_KEY || '';
const ENV = process.env.MOMO_ENVIRONMENT || 'sandbox';
const CURRENCY = process.env.MOMO_CURRENCY || 'RWF';

const getToken = async (product, subscriptionKey) => {
    const { data } = await axios.post(
       `${BASE}/collection/token/`,
       {}, 
       {
        headers: {
            'Authorization': `Basic ${Buffer.from(`${uuidv4()}:${uuidv4()}`).toString('base64')}`,
            'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
       }
    );
    return data.access_token;
};

const requestPayment = async ({ amount, phoneNumber, paymentNote,externalId }) => {
    const token = await getToken('collection', COLL_KEY);
    const referenceId = uuidv4();

    await axios.post(
        `${BASE}/collection/v1_0/requesttopay`,
        {
            amount: String(amount),
            currency: CURRENCY,
            externalId: externalId || uuidv4(),
            payer: { partyIdType: 'MSISDN', partyId: phoneNumber.replace('+', '') },
            payerMessage: paymentNote || 'Streetpleasure payment',
            payeeNote: 'Streetpleasure payment',
        },
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Reference-Id': referenceId,
                'X-Target-Environment': ENV,
                'Ocp-Apim-Subscription-Key': COLL_KEY,
                'Content-Type': 'application/json',
            },
        }
    );
    return { referenceId, status: 'pending'};
};

const getPaymentStatus = async (referenceId) => {
    const token = await getToken('collection', COLL_KEY);
    const { data } = await axios.get(
        `${BASE}/collection/v1_0/requesttopay/${referenceId}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Target-Environment': ENV,
                'Ocp-Apim-Subscription-Key': COLL_KEY,
            },
        }
    );
    return data.status; // 'pending', 'successful', 'failed'
};

const disburse = async ({ amount, phoneNumber, note }) => {
    const token = await getToken('disbursement', DISB_KEY);
    const referenceId = uuidv4();

    await axios.post(
        `${BASE}/disbursement/v1_0/transfer`,
        {
            amount: String(amount),
            currency: CURRENCY,
            externalId: uuidv4(),
            payee: { partyIdType: 'MSISDN', partyId: phoneNumber.replace('+', '') },
            payerMessage: note || 'Streetpleasure payout',
            payeeNote: 'Event host payout',
        },
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-Reference-Id': referenceId,
                'X-Target-Environment': ENV,
                'Ocp-Apim-Subscription-Key': DISB_KEY,
                'Content-Type': 'application/json',
            },
        }
    );
    return { referenceId };
};

module.exports = { requestPayment, getPaymentStatus, disburse };