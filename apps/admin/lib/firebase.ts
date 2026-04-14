import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getMessaging, Messaging } from "firebase/messaging";

// NOVO PROJETO: feconecta-4ccac
const firebaseConfig = {
  apiKey: "AIzaSyCZy-koCkvqIb4r7ZovJVuX2d00ZDbW-Lw",
  authDomain: "feconecta-4ccac.firebaseapp.com",
  projectId: "feconecta-4ccac",
  storageBucket: "feconecta-4ccac.firebasestorage.app",
  messagingSenderId: "69292105594",
  appId: "1:69292105594:web:11e3aba05424e8ee0fc0c3"
};

let app;
try {
  if (getApps().length > 0) {
    app = getApp();
    if (app.options.projectId !== firebaseConfig.projectId) {
      deleteApp(app);
      app = initializeApp(firebaseConfig);
    }
  } else {
    app = initializeApp(firebaseConfig);
  }
} catch (e) {
  app = initializeApp(firebaseConfig);
}

let messaging: Messaging | null = null;
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error("Erro ao inicializar Messaging:", err);
  }
}

export { app, messaging };
