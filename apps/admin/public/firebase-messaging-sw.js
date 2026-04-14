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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background: ', payload);
  
  // Se já existe um objeto 'notification', o Android vai mostrar automaticamente.
  // Não mostramos manualmente para evitar duplicidade.
  if (payload.notification) return;

  if (payload.data) {
    const notificationTitle = payload.data.title || 'FéConecta 📢';
    const notificationOptions = {
      body: payload.data.body || 'Você tem uma nova notificação!',
      icon: '/icons/icon-192x192.png',
      data: {
        link: payload.data.link || '/'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Extrai o link dos dados ou define a home como fallback
  const urlToOpen = event.notification.data?.link || 'https://feconecta.vercel.app/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Tentar achar uma aba que já pertença ao nosso domínio
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // Se acharmos QUALQUER aba da FéConecta, usamos ela
        if (client.url.includes('feconecta.vercel.app') && 'focus' in client) {
          return client.navigate(urlToOpen).then(c => c.focus());
        }
      }
      
      // 2. Se não houver nenhuma aba aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
