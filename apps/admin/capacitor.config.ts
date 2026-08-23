import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.feconecta.myapp',
  appName: 'FéConecta',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.69:3000',
    cleartext: true
  },
  plugins: {
    // Inicia o Foreground Service IMEDIATAMENTE no load() do app.
    // Sem isso, o service só é criado na primeira chamada setPlaybackState,
    // que é assíncrona — causando race condition onde setMetadata chega
    // antes do service estar pronto, e a notificação nunca aparece.
    MediaSession: {
      foregroundService: 'always'
    }
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
