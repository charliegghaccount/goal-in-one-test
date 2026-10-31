import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.goalinone.game',
  appName: 'Goal In One',
  webDir: 'dist-native',
  ios: { contentInset: 'never', backgroundColor: '#79401e', preferredContentMode: 'mobile' },
};
export default config;
