import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getMessaging, Messaging, isSupported } from "firebase/messaging";

// NOVO PROJETO: feconecta-4ccac
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: any;
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
  // Verificação assíncrona de suporte para evitar erros em navegadores incompatíveis/anônimos
  isSupported().then((supported) => {
    if (supported) {
      try {
        messaging = getMessaging(app);
      } catch (err) {
        console.warn("FéConecta: Messaging não suportado neste ambiente.");
      }
    }
  }).catch(() => {
    console.warn("FéConecta: Erro ao verificar suporte de Messaging.");
  });
}

export { app, messaging };
