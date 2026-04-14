import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAgFda6tSEZ-CjZpVfSpMMD0Zp4JO1iBJk",
  authDomain: "feconecta-940d7.firebaseapp.com",
  projectId: "feconecta-940d7",
  storageBucket: "feconecta-940d7.firebasestorage.app",
  messagingSenderId: "366181681617",
  appId: "1:366181681617:web:a0e9eebfd39a8666a2b8f0"
};

// Inicializa o Firebase apenas uma vez
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let messaging: Messaging | undefined;

// O Messaging só funciona no lado do cliente (browser)
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error("Erro ao inicializar Firebase Messaging:", err);
  }
}

export { app, messaging };
