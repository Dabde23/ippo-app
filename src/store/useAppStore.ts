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
  isRoutine: boolean;
  routineCreatedAt: string; // 登録日 YYYY-MM-DD ('' for non-routine tasks)
  routineSourceId?: string; // daily instance -> id of the routine template it came from
  routineSpawnDate?: string; // daily instance -> the date (YYYY-MM-DD) it was spawned for
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

function earnedBadgeCount(xp: number): number {
  return BADGE_THRESHOLDS.filter((t) => xp >= t).length;
}

interface AppState {
  tasks: Task[];
  xp: number;
  badges: Badge[];
  isPremium: boolean;
  pendingBadge: Badge | null;
  reminderEnabled: boolean;
  reminderTime: string;
  hasCompletedOnboarding: boolean;
  timerTaskId: string | null;

  addTask: (title: string, isRoutine?: boolean) => string;
  completeTask: (id: string) => void;
  skipTask: (id: string) => void;
  editTask: (id: string, title: string) => void;
  deleteTask: (id: string) => void;
  deleteRoutine: (id: string) => void;
  syncRoutineTasks: () => void;
  dismissBadge: () => void;
  togglePremium: () => void;
  setReminder: (enabled: boolean, time: string) => void;
  completeOnboarding: () => void;
  availableTaskCount: () => number;
  completedTaskCount: () => number;
  routineTasks: () => Task[];
  setTimerTask: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      xp: 0,
      badges: [],
      isPremium: true,
      pendingBadge: null,
      reminderEnabled: false,
      reminderTime: '09:00',
      hasCompletedOnboarding: false,
      timerTaskId: null,

      addTask: (title, isRoutine = false) => {
        const t = today();
        const task: Task = {
          id: Date.now().toString(),
          title,
          completed: false,
          xpAwarded: false,
          createdAt: t,
          skippedDate: null,
          isRoutine,
          routineCreatedAt: isRoutine ? t : '',
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

          return { tasks, xp: newXp, badges, pendingBadge };
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

      // Delete a routine template. Already-spawned daily instances are kept
      // so the user doesn't lose today's progress.
      deleteRoutine: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.routineSourceId === id ? { ...t, routineSourceId: undefined } : t
          ).filter((t) => t.id !== id),
        }));
      },

      // Spawn a daily instance for each routine template that hasn't been
      // added for the current day yet. Idempotent: safe to call repeatedly.
      syncRoutineTasks: () => {
        set((state) => {
          const t = today();
          const templates = state.tasks.filter((task) => task.isRoutine === true);
          const newInstances: Task[] = [];
          for (const tpl of templates) {
            const alreadySpawned = state.tasks.some(
              (task) => task.routineSourceId === tpl.id && task.routineSpawnDate === t
            );
            if (alreadySpawned) continue;
            newInstances.push({
              id: `${tpl.id}-${t}`,
              title: tpl.title,
              completed: false,
              xpAwarded: false,
              createdAt: t,
              skippedDate: null,
              isRoutine: false,
              routineCreatedAt: '',
              routineSourceId: tpl.id,
              routineSpawnDate: t,
            });
          }
          if (newInstances.length === 0) return state;
          return { tasks: [...newInstances, ...state.tasks] };
        });
      },

      dismissBadge: () => set({ pendingBadge: null }),

      togglePremium: () => set((s) => ({ isPremium: !s.isPremium })),

      setReminder: (enabled, time) => set({ reminderEnabled: enabled, reminderTime: time }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      setTimerTask: (id) => set({ timerTaskId: id }),

      availableTaskCount: () => {
        const t = today();
        return get().tasks.filter((task) => task.isRoutine !== true && !task.completed && task.skippedDate !== t).length;
      },

      completedTaskCount: () => {
        return get().tasks.filter((task) => task.isRoutine !== true && task.completed).length;
      },

      routineTasks: () => {
        return get().tasks.filter((task) => task.isRoutine === true);
      },
    }),
    {
      name: 'adhd-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        xp: state.xp,
        badges: state.badges,
        isPremium: state.isPremium,
        reminderEnabled: state.reminderEnabled,
        reminderTime: state.reminderTime,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // タスクやXPが存在するのにhasCompletedOnboardingがfalseの場合は
        // migration起因のデータ破損と判断して復元する
        if (!state.hasCompletedOnboarding && (state.tasks.length > 0 || state.xp > 0)) {
          state.hasCompletedOnboarding = true;
        }
      },
    }
  )
);
