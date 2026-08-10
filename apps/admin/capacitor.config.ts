import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.feconecta.myapp',
  appName: 'FéConecta',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.69:3000',
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: 'release-key.keystore',
      keystoreAlias: 'key0',
    },
    webContentsDebuggingEnabled: true,
    // @ts-ignore
    webView: {
      settings: {
        mediaPlaybackRequiresUserGesture: false
      }
    }
  } as any,
  cordova: {
    preferences: {
      MediaPlaybackRequiresUserAction: "false"
    }
  }
};

export default config;
