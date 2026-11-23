import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.srenterprises.smartledger',
  appName: 'SmartLedger Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
