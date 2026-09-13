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
  console.log('[SW] Background message:', payload);
  const title = (payload.notification && payload.notification.title) || 'TW-HK Signal';
  const options = {
    body: (payload.notification && payload.notification.body) || 'New signal update',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: payload.data && payload.data.signalId ? payload.data.signalId : 'tw-hk-signal',
    data: payload.data || {},
    requireInteraction: true
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
