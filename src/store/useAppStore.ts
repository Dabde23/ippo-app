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
  name: string;    // 通知の表示名。空文字の場合は reminderMessage を使用
  time: string;    // HH:MM
  days: number[];  // 1=月 2=火 3=水 4=木 5=金 6=土 7=日
  routineTaskId?: string; // ルーティンテンプレートと連動する場合のID
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  earnedAt: string;
}

export type TrackingLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: string;
  timestamp: string; // ISO8601
  level: TrackingLevel;
  memo?: string;
}

export interface FocusEntry {
  id: string;
  timestamp: string; // ISO8601
  level: TrackingLevel;
  taskId: string;
  taskTitle: string;
  memo?: string;
}

// timestamp(ISO8601) -> ローカル日付 YYYY-MM-DD
function localDateOf(timestamp: string): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  // ローカルタイムゾーン基準の日付を返す（localDateOf と整合）。
  // UTC 基準だと日付境界が JST 9:00 になり、日次リセットがずれるため。
  return localDateOf(new Date().toISOString());
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
  timerWorkMinutes: number;
  moodEntries: MoodEntry[];
  focusEntries: FocusEntry[];
  focusPromptEnabled: boolean;

  addTask: (title: string, isRoutine?: boolean) => string;
  completeTask: (id: string) => void;
  skipTask: (id: string) => void;
  editTask: (id: string, title: string) => void;
  deleteTask: (id: string) => void;
  deleteRoutine: (id: string) => void;
  clearCompletedTasks: () => void;
  syncRoutineTasks: () => void;
  dismissBadge: () => void;
  togglePremium: () => void;
  addReminder: (time: string, days?: number[], name?: string, routineTaskId?: string) => string;
  removeReminder: (id: string) => void;
  updateReminder: (id: string, time?: string, days?: number[], name?: string) => void;
  setReminderMessage: (message: string) => void;
  setTaskReminder: (taskId: string, time: string | null) => void;
  completeOnboarding: () => void;
  availableTaskCount: () => number;
  completedTaskCount: () => number;
  routineTasks: () => Task[];
  setTimerTask: (id: string | null) => void;
  setTimerWorkMinutes: (minutes: number) => void;
  addMoodEntry: (level: TrackingLevel, memo?: string) => void;
  addFocusEntry: (level: TrackingLevel, taskId: string, taskTitle: string, memo?: string) => void;
  toggleFocusPrompt: () => void;
  getMoodEntriesForDate: (date: string) => MoodEntry[];
  getMoodAverageForDate: (date: string) => number | null;
  getFocusEntriesForDate: (date: string) => FocusEntry[];
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
      timerWorkMinutes: 25,
      moodEntries: [],
      focusEntries: [],
      focusPromptEnabled: true,

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

      deleteRoutine: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id && t.routineSourceId !== id),
          reminders: state.reminders.filter((r) => r.routineTaskId !== id),
        }));
      },

      clearCompletedTasks: () => {
        set((state) => ({ tasks: state.tasks.filter((t) => !t.completed) }));
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

      addReminder: (time, days = [1, 2, 3, 4, 5], name = '', routineTaskId = undefined) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const reminder: Reminder = { id, name, time, days, routineTaskId };
        set((s) => ({ reminders: [...s.reminders, reminder] }));
        return id;
      },

      removeReminder: (id) => {
        set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) }));
      },

      updateReminder: (id, time, days, name) => {
        set((s) => ({
          reminders: s.reminders.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...(time !== undefined ? { time } : {}),
                  ...(days !== undefined ? { days } : {}),
                  ...(name !== undefined ? { name } : {}),
                }
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

      setTimerWorkMinutes: (minutes) => set({ timerWorkMinutes: minutes }),

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

      addMoodEntry: (level, memo) => {
        const entry: MoodEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          level,
          ...(memo && memo.trim() ? { memo: memo.trim() } : {}),
        };
        set((s) => ({ moodEntries: [...s.moodEntries, entry] }));
      },

      addFocusEntry: (level, taskId, taskTitle, memo) => {
        const entry: FocusEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          level,
          taskId,
          taskTitle,
          ...(memo && memo.trim() ? { memo: memo.trim() } : {}),
        };
        set((s) => ({ focusEntries: [...s.focusEntries, entry] }));
      },

      toggleFocusPrompt: () => set((s) => ({ focusPromptEnabled: !s.focusPromptEnabled })),

      getMoodEntriesForDate: (date) => {
        return get().moodEntries.filter((e) => localDateOf(e.timestamp) === date);
      },

      getMoodAverageForDate: (date) => {
        const entries = get().moodEntries.filter((e) => localDateOf(e.timestamp) === date);
        if (entries.length === 0) return null;
        const sum = entries.reduce((acc, e) => acc + e.level, 0);
        return Math.round(sum / entries.length);
      },

      getFocusEntriesForDate: (date) => {
        return get().focusEntries.filter((e) => localDateOf(e.timestamp) === date);
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
        timerWorkMinutes: state.timerWorkMinutes,
        moodEntries: state.moodEntries,
        focusEntries: state.focusEntries,
        focusPromptEnabled: state.focusPromptEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // 旧フォーマット（reminderEnabled / reminderTime）から新フォーマット（reminders）へ移行
        if ((state as any).reminderEnabled !== undefined) {
          if ((state as any).reminderEnabled && (state as any).reminderTime) {
            state.reminders = [{
              id: 'migrated-0',
              name: '',
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
        // 既存の Reminder に name フィールドがない場合は '' を補完
        // （routineTaskId は省略でOK：undefined のまま扱える）
        state.reminders = state.reminders.map((r) =>
          typeof (r as any).name === 'string' ? r : { ...r, name: '' }
        );
        // タスクやXPが存在するのにhasCompletedOnboardingがfalseの場合は
        // migration起因のデータ破損と判断して復元する
        if (!state.hasCompletedOnboarding && (state.tasks.length > 0 || state.xp > 0)) {
          state.hasCompletedOnboarding = true;
        }
        // 状態トラッキング: 旧データに無いフィールドをデフォルト補完
        if (!Array.isArray(state.moodEntries)) state.moodEntries = [];
        if (!Array.isArray(state.focusEntries)) state.focusEntries = [];
        if (typeof state.focusPromptEnabled !== 'boolean') state.focusPromptEnabled = true;
      },
    }
  )
);
