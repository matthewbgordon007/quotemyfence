import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ca.quotemyfence.app',
  appName: 'QuoteMyFence',
  webDir: 'www',
  server: {
    // Load app from production URL (no static build needed)
    url: 'https://www.quotemyfence.ca',
    cleartext: false,
  },
};

export default config;
