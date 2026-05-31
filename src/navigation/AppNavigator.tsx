import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
            paddingBottom: 6,
            paddingTop: 6,
            height: 62,
          },
          tabBarLabelStyle: {
            fontSize: fontSize.xs,
            fontWeight: '800',
            letterSpacing: 1,
            textTransform: 'uppercase',
          },
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 12, color, letterSpacing: 0 }}>{TAB_ICONS[route.name]}</Text>
          ),
        })}
      >
        <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarLabel: 'TODAY' }} />
        <Tab.Screen name="Timer"   component={TimerScreen}   options={{ tabBarLabel: 'TIMER' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'YOU' }} />
      </Tab.Navigator>
      {pendingBadge && <BadgeModal badge={pendingBadge} onDismiss={dismissBadge} />}
    </NavigationContainer>
  );
}
