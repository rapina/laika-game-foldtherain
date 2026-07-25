import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sputnikworkshop.foldtherain',
  appName: 'Fold the Rain',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
