import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateOfJST, today } from '../utils/date';

// 日付の JST 統一ユーティリティを再エクスポート（既存の import 互換のため）。
export { today, dateOfJST } from '../utils/date';

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

export const XP_PER_TASK = 10;

export const BADGE_THRESHOLDS = [100, 300, 600, 1000, 1500];

const BADGES: Omit<Badge, 'earnedAt'>[] = [
  { id: 'first-step',      name: 'はじめの一歩',    emoji: '🌱' },
  { id: 'getting-started', name: 'スタートダッシュ', emoji: '🚀' },
  { id: 'focused',         name: '集中の達人',       emoji: '🎯' },
  { id: 'consistent',      name: '継続の力',         emoji: '💪' },
  { id: 'achiever',        name: 'アチーバー',       emoji: '🏆' },
];

function earnedBadgeCount(xp: number): number {
  return BADGE_THRESHOLDS.filter((t) => xp >= t).length;
}

interface AppState {
  tasks: Task[];
  xp: number;
  badges: Badge[];
  pendingBadge: Badge | null;
  reminders: Reminder[];
  reminderMessage: string;
  hasCompletedOnboarding: boolean;
  timerTaskId: string | null;
  timerWorkMinutes: number;
  moodEntries: MoodEntry[];
  focusEntries: FocusEntry[];
  focusPromptEnabled: boolean;
  // リマインダー「次に回す」の FIFO 提示キュー（taskId を来た順に保持）。永続化しない。
  reminderQueue: string[];

  addTask: (title: string, isRoutine?: boolean) => string;
  completeTask: (id: string) => void;
  skipTask: (id: string) => void;
  editTask: (id: string, title: string) => void;
  deleteTask: (id: string) => void;
  deleteRoutine: (id: string) => void;
  clearCompletedTasks: () => void;
  syncRoutineTasks: () => void;
  dismissBadge: () => void;
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
  // ── リマインダー通知アクション系 ──
  // 指定 taskId が「JST の今日すでに完了済み」か。単発タスク=そのまま completed か、
  // ルーティンテンプレ=当日インスタンスが completed かを見る（完了済み抑制の判定）。
  isReminderTaskDoneToday: (taskId: string) => boolean;
  // 「次に回す」: FIFO キュー末尾へ taskId を追加（重複は末尾に寄せ直さず無視）。
  enqueueReminder: (taskId: string) => void;
  // キューから「いま有効な（当日プールに居て未完了の）」先頭 taskId を取り出す。
  // 無効な taskId は捨てながら走査し、無ければ null。
  dequeueValidReminder: () => string | null;
  clearReminderQueue: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      xp: 0,
      badges: [],
      pendingBadge: null,
      reminders: [],
      reminderMessage: '今日のタスクを確認しよう！ひとつだけでも大丈夫。',
      hasCompletedOnboarding: false,
      timerTaskId: null,
      timerWorkMinutes: 25,
      moodEntries: [],
      focusEntries: [],
      focusPromptEnabled: true,
      reminderQueue: [],

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

      isReminderTaskDoneToday: (taskId) => {
        const t = today();
        const tasks = get().tasks;
        const target = tasks.find((task) => task.id === taskId);
        if (!target) return false;
        if (target.isRoutine === true) {
          // ルーティンテンプレ: 当日インスタンスが完了済みなら抑制
          const instance = tasks.find(
            (task) => task.routineSourceId === taskId && task.routineSpawnDate === t
          );
          return !!instance && instance.completed;
        }
        // 単発タスク or 当日インスタンス: そのまま完了済みか
        return target.completed === true;
      },

      enqueueReminder: (taskId) => {
        set((s) =>
          s.reminderQueue.includes(taskId)
            ? s
            : { reminderQueue: [...s.reminderQueue, taskId] }
        );
      },

      dequeueValidReminder: () => {
        const queue = get().reminderQueue;
        if (queue.length === 0) return null;
        const t = today();
        const tasks = get().tasks;
        const isValid = (id: string): boolean => {
          const task = tasks.find((x) => x.id === id);
          // 当日プールに居て・未完了・当日スキップ降格されていない単発タスクのみ提示対象
          return (
            !!task &&
            task.isRoutine !== true &&
            !task.completed &&
            task.skippedDate !== t
          );
        };
        let pickedIndex = -1;
        for (let i = 0; i < queue.length; i++) {
          if (isValid(queue[i])) { pickedIndex = i; break; }
        }
        if (pickedIndex === -1) {
          // 有効なものが無い → キューを空にして null
          set({ reminderQueue: [] });
          return null;
        }
        const picked = queue[pickedIndex];
        // 先頭から picked までの無効分も合わせて捨てる（FIFO・古い無効を残さない）
        set({ reminderQueue: queue.slice(pickedIndex + 1) });
        return picked;
      },

      clearReminderQueue: () => set({ reminderQueue: [] }),
    }),
    {
      name: 'adhd-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        xp: state.xp,
        badges: state.badges,
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
