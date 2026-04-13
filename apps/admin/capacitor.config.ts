import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.feconecta.app',
  appName: 'FéConecta',
  webDir: 'public',
  server: {
    // Aponta para a versão oficial para garantir que ServerComponents funcione no APK
    url: 'https://newfeconecta.vercel.app',
    cleartext: true
  }
};

export default config;
