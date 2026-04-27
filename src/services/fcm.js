const admin = require('../config/firebase');

const send = async ({ token, title, body, data }) => {
    if (!token) return;
    try {
        await admin.messaging().send({
            token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
            adroid: {priority: 'high'},
            apns: { payload: {aps: { sound: 'default' }}},
        });
    } catch (err) {
        console.warn('[FCM] send error:', err.message);
    }
};

const sendToMany = async ({ tokens, title, body, data = {} }) => {
    if (!tokens?.length) return;
    const valid  = tokens.filter(Boolean);
    if (!valid.length) return;
    try {
        await admin.messaging().sendEachForMulticast({
            tokens: valid,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        });
    } catch (err) {
        console.warn('[FCM] multicast error:', err.message);
    }
};

module.exports = { send, sendToMany };