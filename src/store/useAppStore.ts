import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Priority = 'high' | 'normal' | 'low'; // kept for backwards compat

export interface Task {
  id: string;
  title: string;
  priority?: Priority; // legacy field, no longer used
  completed: boolean;
  xpAwarded: boolean;
  createdAt: string;
  skippedDate: string | null;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  earnedAt: string;
}

export const PREMIUM_PRICE_JPY = 500;
export const CANCEL_NOTICE_DAYS = 5;
export const XP_PER_TASK = 10;

export const BADGE_THRESHOLDS = [100, 300, 600, 1000, 1500];

const BADGES: Omit<Badge, 'earnedAt'>[] = [
  { id: 'first-step',      name: 'はじめの一歩',    emoji: '🌱' },
  { id: 'getting-started', name: 'スタートダッシュ', emoji: '🚀' },
  { id: 'focused',         name: '集中の達人',       emoji: '🎯' },
  { id: 'consistent',      name: '継続の力',         emoji: '💪' },
  { id: 'achiever',        name: 'アチーバー',       emoji: '🏆' },
];

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function earnedBadgeCount(xp: number): number {
  return BADGE_THRESHOLDS.filter((t) => xp >= t).length;
}

interface AppState {
  tasks: Task[];
  xp: number;
  badges: Badge[];
  streak: number;
  lastCompletedDate: string | null;
  isPremium: boolean;
  pendingBadge: Badge | null;
  reminderEnabled: boolean;
  reminderTime: string;
  hasCompletedOnboarding: boolean;

  addTask: (title: string) => string;
  completeTask: (id: string) => void;
  skipTask: (id: string) => void;
  editTask: (id: string, title: string) => void;
  deleteTask: (id: string) => void;
  dismissBadge: () => void;
  togglePremium: () => void;
  setReminder: (enabled: boolean, time: string) => void;
  completeOnboarding: () => void;
  availableTaskCount: () => number;
  completedTaskCount: () => number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      xp: 0,
      badges: [],
      streak: 0,
      lastCompletedDate: null,
      isPremium: true,
      pendingBadge: null,
      reminderEnabled: false,
      reminderTime: '09:00',
      hasCompletedOnboarding: false,

      addTask: (title) => {
        const task: Task = {
          id: Date.now().toString(),
          title,
          completed: false,
          xpAwarded: false,
          createdAt: today(),
          skippedDate: null,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task.id;
      },

      completeTask: (id) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === id);
          if (!task || task.completed) return state;

          const earned = XP_PER_TASK;
          const tasks = state.tasks.map((t) =>
            t.id === id ? { ...t, completed: true, xpAwarded: true } : t
          );

          const newXp = state.xp + earned;
          const prevCount = earnedBadgeCount(state.xp);
          const newCount = earnedBadgeCount(newXp);
          let pendingBadge: Badge | null = null;
          let badges = state.badges;
          if (newCount > prevCount && newCount <= BADGES.length) {
            const template = BADGES[newCount - 1];
            const newBadge: Badge = { ...template, earnedAt: today() };
            badges = [...state.badges, newBadge];
            pendingBadge = newBadge;
          }

          const todayStr = today();
          let newStreak = state.streak;
          if (state.lastCompletedDate === todayStr) {
            // no change
          } else if (state.lastCompletedDate === yesterday()) {
            newStreak = state.streak + 1;
          } else {
            newStreak = 1;
          }

          return { tasks, xp: newXp, badges, pendingBadge, streak: newStreak, lastCompletedDate: todayStr };
        });
      },

      skipTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, skippedDate: today() } : t
          ),
        }));
      },

      editTask: (id, title) => {
        set((state) => ({
          tasks: state.tasks.map((t) => t.id === id ? { ...t, title } : t),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      },

      dismissBadge: () => set({ pendingBadge: null }),

      togglePremium: () => set((s) => ({ isPremium: !s.isPremium })),

      setReminder: (enabled, time) => set({ reminderEnabled: enabled, reminderTime: time }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      availableTaskCount: () => {
        const t = today();
        return get().tasks.filter((task) => !task.completed && task.skippedDate !== t).length;
      },

      completedTaskCount: () => {
        return get().tasks.filter((task) => task.completed).length;
      },
    }),
    {
      name: 'adhd-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        xp: state.xp,
        badges: state.badges,
        streak: state.streak,
        lastCompletedDate: state.lastCompletedDate,
        isPremium: state.isPremium,
        reminderEnabled: state.reminderEnabled,
        reminderTime: state.reminderTime,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);
