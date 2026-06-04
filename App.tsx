import { StatusBar } from 'expo-status-bar';
import { useFonts, BIZUDPGothic_400Regular, BIZUDPGothic_700Bold } from '@expo-google-fonts/biz-udpgothic';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Analytics } from '@vercel/analytics/react';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const [loaded] = useFonts({ BIZUDPGothic_400Regular, BIZUDPGothic_700Bold });
  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
      {Platform.OS === 'web' && <Analytics />}
    </SafeAreaProvider>
  );
}
