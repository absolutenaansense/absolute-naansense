const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK once
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized || !process.env.FIREBASE_PROJECT_ID) return;
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized');
  } catch (err) {
    logger.warn(`Firebase init failed: ${err.message}`);
  }
}

initFirebase();

async function sendNotification(token, { title, body, data = {} }) {
  if (!firebaseInitialized || !token) return;
  try {
    const result = await admin.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });
    logger.info(`FCM sent: ${result}`);
    return result;
  } catch (err) {
    logger.error(`FCM error: ${err.message}`);
  }
}

async function notifyAdmin(notification) {
  // Get admin FCM token from DB or env
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const admin_user = await prisma.admin.findFirst({ where: { fcmToken: { not: null } } });
    const token = admin_user?.fcmToken || process.env.ADMIN_FCM_TOKEN;
    if (token) await sendNotification(token, notification);
  } finally {
    await prisma.$disconnect();
  }
}

async function notifyUser(fcmToken, notification) {
  await sendNotification(fcmToken, notification);
}

module.exports = { notifyAdmin, notifyUser };
