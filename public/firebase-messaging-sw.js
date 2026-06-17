// public/firebase-messaging-sw.js
// Service Worker voor Firebase Cloud Messaging — achtergrond push notificaties

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDGz1nAbH5fxYY5halcrd0Dsu3PaM2j9bU",
  authDomain: "lottoclub.firebaseapp.com",
  projectId: "lottoclub",
  storageBucket: "lottoclub.firebasestorage.app",
  messagingSenderId: "455488693325",
  appId: "1:455488693325:web:25798f2fc9901ec3c4a804"
});

const messaging = firebase.messaging();

// Achtergrond notificaties ontvangen (app is gesloten of op achtergrond)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Achtergrond notificatie ontvangen:', payload);

  const { title, body, icon } = payload.notification ?? {};
  const link = payload.data?.path ?? '/';

  self.registration.showNotification(title ?? 'LottoClub', {
    body: body ?? '',
    icon: icon ?? '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: { link },
    actions: [
      { action: 'open', title: 'Openen' },
      { action: 'dismiss', title: 'Sluiten' },
    ],
  });
});

// Klik op notificatie → open de app op de juiste pagina
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const link = event.notification.data?.link ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(link);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
