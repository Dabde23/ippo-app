import React from 'react';
import { Text } from '../components/Text';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { TimerScreen } from '../screens/TimerScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { colors, fontSize } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { BadgeModal } from './BadgeModal';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home:    '◻',
  Timer:   '◷',
  Profile: '◉',
};

export function AppNavigator() {
  const { pendingBadge, dismissBadge, hasCompletedOnboarding } = useAppStore();
  const insets = useSafeAreaInsets();

  if (!hasCompletedOnboarding) return <OnboardingScreen />;

  return (
    <NavigationContainer>
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
          tabBarLabelStyle: {
            fontSize: fontSize.xs,
            fontFamily: 'BIZUDPGothic_700Bold',
            letterSpacing: 1,
          },
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 12, color, letterSpacing: 0 }}>{TAB_ICONS[route.name]}</Text>
          ),
        })}
      >
        <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarLabel: '今日' }} />
        <Tab.Screen name="Timer"   component={TimerScreen}   options={{ tabBarLabel: 'タイマー' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'プロフィール' }} />
      </Tab.Navigator>
      {pendingBadge && <BadgeModal badge={pendingBadge} onDismiss={dismissBadge} />}
    </NavigationContainer>
  );
}
