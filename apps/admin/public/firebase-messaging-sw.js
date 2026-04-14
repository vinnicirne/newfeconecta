importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// NOVO PROJETO: feconecta-4ccac
const firebaseConfig = {
  apiKey: "AIzaSyCZy-koCkvqIb4r7ZovJVuX2d00ZDbW-Lw",
  authDomain: "feconecta-4ccac.firebaseapp.com",
  projectId: "feconecta-4ccac",
  storageBucket: "feconecta-4ccac.firebasestorage.app",
  messagingSenderId: "69292105594",
  appId: "1:69292105594:web:11e3aba05424e8ee0fc0c3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message - só mostra se NÃO vier notification (data-only)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  // Se já tem notification no payload, o sistema mostra automaticamente → não faz nada
  if (payload.notification) {
    console.log('Notificação nativa do FCM - SW não precisa mostrar');
    return;
  }

  // Fallback para data-only messages
  const notificationTitle = payload.data?.title || 'FéConecta 📢';
  const notificationOptions = {
    body: payload.data?.body || 'Você tem uma nova notificação!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      link: payload.data?.link || payload.data?.url || 'https://feconecta.vercel.app/feed'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click - ESSA PARTE É CRUCIAL
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.link 
    || event.notification.data?.url 
    || 'https://feconecta.vercel.app/feed';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // 1. Tenta focar + navegar em uma aba já aberta do mesmo domínio
        for (const client of windowClients) {
          if (client.url.includes('feconecta.vercel.app') && 'focus' in client && 'navigate' in client) {
            return client.navigate(urlToOpen).then((navigatedClient) => navigatedClient.focus());
          }
        }

        // 2. Se não encontrou aba, abre nova janela/aba
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(err => console.error('Erro ao abrir janela:', err))
  );
});
