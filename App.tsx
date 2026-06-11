import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, BIZUDPGothic_400Regular, BIZUDPGothic_700Bold } from '@expo-google-fonts/biz-udpgothic';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Analytics } from '@vercel/analytics/react';
import { AppNavigator } from './src/navigation/AppNavigator';

// TODO: ベータ公開後に削除（スプラッシュ確認用）
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [loaded] = useFonts({ BIZUDPGothic_400Regular, BIZUDPGothic_700Bold });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      setReady(true);
    }, 2000); // TODO: ベータ公開後に削除
    return () => clearTimeout(timer);
  }, [loaded]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
      {Platform.OS === 'web' && <Analytics />}
    </SafeAreaProvider>
  );
}
