importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD1GgHel2TPnmuemGTD0w50W-DWsaVKW5E",
  authDomain: "tw-hk-32169.firebaseapp.com",
  projectId: "tw-hk-32169",
  storageBucket: "tw-hk-32169.firebasestorage.app",
  messagingSenderId: "844851720789",
  appId: "1:844851720789:web:5608a7084081b5a85c1adc"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'TW-HK Signal';
  const body = (payload.notification && payload.notification.body) || 'New signal';
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
