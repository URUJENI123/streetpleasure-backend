const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath && fs.existsSync(path.resolve(serviceAccountPath))) {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Use application default credentials in production (GCP/AWS with IAM)
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  return firebaseApp;
};

const sendPushNotification = async ({ token, title, body, data = {} }) => {
  try {
    initFirebase();
    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      token,
    };
    const response = await admin.messaging().send(message);
    return response;
  } catch (err) {
    console.error('FCM error:', err.message);
    // Don't throw - notifications are non-critical
  }
};

const sendMulticastNotification = async ({ tokens, title, body, data = {} }) => {
  if (!tokens || tokens.length === 0) return;
  try {
    initFirebase();
    const message = {
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      tokens,
    };
    return admin.messaging().sendEachForMulticast(message);
  } catch (err) {
    console.error('FCM multicast error:', err.message);
  }
};

module.exports = { initFirebase, sendPushNotification, sendMulticastNotification };