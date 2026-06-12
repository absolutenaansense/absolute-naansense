// Firebase Cloud Messaging service worker
// Place this file in the frontend/public/ directory

importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: payload.data,
    actions: [
      { action: 'view', title: 'View order' },
    ],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  if (data?.orderId) {
    const url = event.action === 'view'
      ? `/admin/orders`
      : '/';
    event.waitUntil(clients.openWindow(url));
  }
});
