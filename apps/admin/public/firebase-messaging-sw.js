importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyB6VpnpCI2UQ2EbCtWWF-huH4DxNbVikMg",
  authDomain: "feconecta-940d7.firebaseapp.com",
  projectId: "feconecta-940d7",
  storageBucket: "feconecta-940d7.firebasestorage.app",
  messagingSenderId: "366181681617",
  appId: "1:366181681617:web:a0e9eebfd39a8666a2b8f0"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ', payload);
  const notificationTitle = payload.notification.title || 'FéConecta';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
