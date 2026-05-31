import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Priority = 'high' | 'normal' | 'low';

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  xpAwarded: boolean;
  createdAt: string; // YYYY-MM-DD
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  earnedAt: string;
}

export const PREMIUM_PRICE_JPY = 500;
export const CANCEL_NOTICE_DAYS = 5;

export const XP_BY_PRIORITY: Record<Priority, number> = {
  high: 15,
  normal: 10,
  low: 5,
};

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
  reminderTime: string; // "HH:MM"
  hasCompletedOnboarding: boolean;

  addTask: (title: string, priority: Priority) => string;
  completeTask: (id: string) => void;
  editTask: (id: string, title: string, priority: Priority) => void;
  deleteTask: (id: string) => void;
  dismissBadge: () => void;
  togglePremium: () => void;
  setReminder: (enabled: boolean, time: string) => void;
  completeOnboarding: () => void;
  todayTaskCount: () => number;
  todayCompletedCount: () => number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      xp: 0,
      badges: [],
      streak: 0,
      lastCompletedDate: null,
      isPremium: true, // アーリーアクセス期間中は全機能開放
      pendingBadge: null,
      reminderEnabled: false,
      reminderTime: '09:00',
      hasCompletedOnboarding: false,

      addTask: (title, priority) => {
        const task: Task = {
          id: Date.now().toString(),
          title,
          priority,
          completed: false,
          xpAwarded: false,
          createdAt: today(),
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task.id;
      },

      completeTask: (id) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === id);
          if (!task || task.completed) return state;

          const earned = XP_BY_PRIORITY[task.priority];
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

      editTask: (id, title, priority) => {
        set((state) => ({
          tasks: state.tasks.map((t) => t.id === id ? { ...t, title, priority } : t),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
      },

      dismissBadge: () => set({ pendingBadge: null }),

      togglePremium: () => set((s) => ({ isPremium: !s.isPremium })),

      setReminder: (enabled, time) => set({ reminderEnabled: enabled, reminderTime: time }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      todayTaskCount: () => {
        const t = today();
        return get().tasks.filter((task) => task.createdAt === t).length;
      },

      todayCompletedCount: () => {
        const t = today();
        return get().tasks.filter((task) => task.createdAt === t && task.completed).length;
      },
    }),
    {
      name: 'adhd-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // pendingBadge はUI状態なので永続化しない
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
