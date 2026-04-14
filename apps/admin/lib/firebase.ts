import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB6VpnpCI2UQ2EbCtWWF-huH4DxNbVikMg",
  authDomain: "feconecta-940d7.firebaseapp.com",
  projectId: "feconecta-940d7", 
  storageBucket: "feconecta-940d7.firebasestorage.app",
  messagingSenderId: "366181681617", 
  appId: "1:366181681617:web:a0e9eebfd39a8666a2b8f0"
};

// Inicialização Ultra-Resiliente
let app;
try {
  if (getApps().length > 0) {
    app = getApp();
    // Se o app atual não tiver o projectId correto, deletamos e criamos de novo
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
