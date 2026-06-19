import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { TimerScreen } from '../screens/TimerScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { colors } from '../theme';
import { useAppStore } from '../store/useAppStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { outline: IoniconName; filled: IoniconName }> = {
  Home:  { outline: 'today-outline', filled: 'today' },
  Timer: { outline: 'timer-outline', filled: 'timer' },
};

const linking: any = {
  prefixes: ['https://ippo-app-phi.vercel.app', 'http://localhost:8081'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: '',
          Timer: 'timer',
        },
      },
      Profile: 'profile',
    },
  },
};

function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1.5,
          borderTopColor: colors.ink,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
        },
        tabBarShowLabel: false,
        tabBarIcon: ({ color, focused }) => {
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.filled : icons.outline} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"  component={HomeScreen}  options={{ tabBarLabel: '今日' }} />
      <Tab.Screen name="Timer" component={TimerScreen} options={{ tabBarLabel: 'タイマー' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);

  if (!hasCompletedOnboarding) return <OnboardingScreen />;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
