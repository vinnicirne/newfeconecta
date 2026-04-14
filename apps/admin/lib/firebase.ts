import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, Messaging } from "firebase/messaging";

// Configuração com fallback direto para evitar erros de "Missing projectId"
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAgFda6tSEZ-CjZpVfSpMMD0Zp4JO1iBJk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "feconecta-940d7.firebaseapp.com",
  projectId: "feconecta-940d7", // Forçado como string para evitar undefined
  storageBucket: "feconecta-940d7.firebasestorage.app",
  messagingSenderId: "366181681617", // Forçado como string para evitar undefined
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:366181681617:web:a0e9eebfd39a8666a2b8f0"
};

// Inicializa o Firebase apenas uma vez
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializa o Messaging apenas no lado do cliente
let messaging: Messaging | null = null;

if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error("Erro ao inicializar Firebase Messaging:", err);
  }
}

export { app, messaging };
