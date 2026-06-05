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
  taskReminderTime?: string; // HH:MM、タスク連動リマインダー。未設定なら undefined
}

export interface Reminder {
  id: string;
  time: string;    // HH:MM
  days: number[];  // 1=月 2=火 3=水 4=木 5=金 6=土 7=日
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
  reminders: Reminder[];
  reminderMessage: string;
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
  addReminder: (time: string, days?: number[]) => string;
  removeReminder: (id: string) => void;
  updateReminder: (id: string, time?: string, days?: number[]) => void;
  setReminderMessage: (message: string) => void;
  setTaskReminder: (taskId: string, time: string | null) => void;
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
      reminders: [],
      reminderMessage: '今日のタスクを確認しよう！ひとつだけでも大丈夫。',
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

      addReminder: (time, days = [1, 2, 3, 4, 5]) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const reminder: Reminder = { id, time, days };
        set((s) => ({ reminders: [...s.reminders, reminder] }));
        return id;
      },

      removeReminder: (id) => {
        set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }));
      },

      updateReminder: (id, time, days) => {
        set((s) => ({
          reminders: s.reminders.map((r) =>
            r.id === id
              ? { ...r, ...(time !== undefined ? { time } : {}), ...(days !== undefined ? { days } : {}) }
              : r
          ),
        }));
      },

      setReminderMessage: (message) => set({ reminderMessage: message }),

      setTaskReminder: (taskId, time) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, taskReminderTime: time === null ? undefined : time }
              : t
          ),
        }));
      },

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
        reminders: state.reminders,
        reminderMessage: state.reminderMessage,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // 旧フォーマット（reminderEnabled / reminderTime）から新フォーマット（reminders）へ移行
        if ((state as any).reminderEnabled !== undefined) {
          if ((state as any).reminderEnabled && (state as any).reminderTime) {
            state.reminders = [{
              id: 'migrated-0',
              time: (state as any).reminderTime,
              days: [1, 2, 3, 4, 5],
            }];
          } else {
            state.reminders = [];
          }
          delete (state as any).reminderEnabled;
          delete (state as any).reminderTime;
        }
        // reminders が未定義（新規 or 旧データ）の場合は空配列で初期化
        if (!Array.isArray(state.reminders)) {
          state.reminders = [];
        }
        // タスクやXPが存在するのにhasCompletedOnboardingがfalseの場合は
        // migration起因のデータ破損と判断して復元する
        if (!state.hasCompletedOnboarding && (state.tasks.length > 0 || state.xp > 0)) {
          state.hasCompletedOnboarding = true;
        }
      },
    }
  )
);
