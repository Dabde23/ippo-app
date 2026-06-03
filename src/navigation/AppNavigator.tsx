import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { TimerScreen } from '../screens/TimerScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RoutineScreen } from '../screens/RoutineScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { colors } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { BadgeModal } from './BadgeModal';

const Tab = createBottomTabNavigator();
const ProfileStack = createNativeStackNavigator();

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Routine" component={RoutineScreen} />
    </ProfileStack.Navigator>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { outline: IoniconName; filled: IoniconName }> = {
  Home:    { outline: 'today-outline',  filled: 'today'   },
  Timer:   { outline: 'timer-outline',  filled: 'timer'   },
  Profile: { outline: 'person-outline', filled: 'person'  },
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
          tabBarShowLabel: false,
          tabBarIcon: ({ color, focused }) => {
            const icons = TAB_ICONS[route.name];
            return <Ionicons name={focused ? icons.filled : icons.outline} size={26} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarLabel: '今日' }} />
        <Tab.Screen name="Timer"   component={TimerScreen}   options={{ tabBarLabel: 'タイマー' }} />
        <Tab.Screen name="Profile" component={ProfileStackScreen} options={{ tabBarLabel: 'プロフィール' }} />
      </Tab.Navigator>
      {pendingBadge && <BadgeModal badge={pendingBadge} onDismiss={dismissBadge} />}
    </NavigationContainer>
  );
}
