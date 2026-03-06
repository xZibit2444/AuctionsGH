import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.auctionsgh.app',
  appName: 'AuctionsGH',
  // Point the WebView at the live Vercel deployment.
  // All server-side features (auth, API, realtime) continue to work.
  server: {
    url: 'https://auctions-gh-7nap.vercel.app',
    cleartext: false,
    // Allow navigation within the app domain
    allowNavigation: ['*.supabase.co'],
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
  // webDir is required by Capacitor but unused in remote-URL mode
  webDir: 'out',
};

export default config;
