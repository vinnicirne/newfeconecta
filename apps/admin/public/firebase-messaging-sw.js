// Importa os scripts do Firebase necessários
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração do seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyAgFda6tSEZ-CjZpVfSpMMD0Zp4JO1iBJk",
  authDomain: "feconecta-940d7.firebaseapp.com",
  projectId: "feconecta-940d7",
  storageBucket: "feconecta-940d7.firebasestorage.app",
  messagingSenderId: "366181681617",
  appId: "1:366181681617:web:a0e9eebfd39a8666a2b8f0"
};

// Inicializa o Firebase no Service Worker
firebase.initializeApp(firebaseConfig);

// Recupera a instância do Messaging
const messaging = firebase.messaging();

// Listener para mensagens em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem em segundo plano recebida:', payload);
  
  const notificationTitle = payload.notification.title || 'FéConecta';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png', // Verifique se este ícone existe
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
