import { StatusBar } from 'expo-status-bar';
import { useFonts, BIZUDPGothic_400Regular, BIZUDPGothic_700Bold } from '@expo-google-fonts/biz-udpgothic';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const [loaded] = useFonts({ BIZUDPGothic_400Regular, BIZUDPGothic_700Bold });
  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}
