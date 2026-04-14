importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// VERSÃO DO SISTEMA: 1.0.5 (Força atualização no Chrome/Android)
const SW_VERSION = '1.0.5';
console.log('[SW] Iniciando Versão:', SW_VERSION);
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

// Background message - Híbrido (Melhor equilíbrio 2026)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensagem recebida em background:', payload);

  // Se já tem notification no payload, o navegador mostra sozinho.
  // Não mostramos manualmente aqui para evitar duplicidade visual.
  if (payload.notification) {
    console.log('[SW] Notificação nativa detectada. O sistema cuidará da exibição.');
    return;
  }

  // Fallback para data-only (raro)
  const notificationTitle = payload.data?.title || 'FéConecta 📢';
  const notificationOptions = {
    body: payload.data?.body || 'Você tem uma nova notificação!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      link: payload.data?.link || payload.data?.url || 'https://newfeconecta.vercel.app/feed'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click - Versão robusta
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] NOTIFICATION CLICKED!', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data?.link 
    || event.notification.data?.url 
    || 'https://newfeconecta.vercel.app/feed';

  console.log('[SW] Abrindo URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Tenta reutilizar aba existente do domínio
        for (const client of windowClients) {
          if (client.url.includes('newfeconecta.vercel.app') && 'navigate' in client) {
            console.log('[SW] Reutilizando aba existente');
            return client.navigate(urlToOpen).then((c) => c.focus());
          }
        }

        // Se não encontrou, abre nova janela/aba
        console.log('[SW] Abrindo nova janela');
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((err) => {
        console.error('[SW] Erro no waitUntil:', err);
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});
