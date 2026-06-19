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
  createdAt: string;
  skippedDate: string | null;
  // 3状態モデル: null=提示候補 / today()=翌日に再提示（今日非表示）。
  // skippedDate と排他（同時に today にしない）。
  deferredDate: string | null;
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

interface AppState {
  tasks: Task[];
  reminders: Reminder[];
  reminderMessage: string;
  hasCompletedOnboarding: boolean;
  timerTaskId: string | null;
  timerWorkMinutes: number;
  // リマインダー「次に回す」の FIFO 提示キュー（taskId を来た順に保持）。永続化しない。
  reminderQueue: string[];
  // 「5分だけ」モード（TimerScreen へ伝達、非永続）。
  fiveMinMode: boolean;

  addTask: (title: string, isRoutine?: boolean) => string;
  completeTask: (id: string) => void;
  skipTask: (id: string) => void;
  deferToNextDay: (id: string) => void;
  setFiveMinMode: (v: boolean) => void;
  editTask: (id: string, title: string) => void;
  deleteTask: (id: string) => void;
  deleteRoutine: (id: string) => void;
  clearCompletedTasks: () => void;
  syncRoutineTasks: () => void;
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
      reminders: [],
      reminderMessage: '今日のタスクを確認しよう！ひとつだけでも大丈夫。',
      hasCompletedOnboarding: false,
      timerTaskId: null,
      timerWorkMinutes: 25,
      reminderQueue: [],
      fiveMinMode: false,

      addTask: (title, isRoutine = false) => {
        const t = today();
        const task: Task = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          completed: false,
          createdAt: t,
          skippedDate: null,
          deferredDate: null,
          isRoutine,
          routineCreatedAt: isRoutine ? t : '',
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task.id;
      },

      completeTask: (id) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === id);
          if (!task) return state;

          // ルーティンインスタンス: 完了にせず翌日へ defer（翌日 sync で削除→新規 spawn）。
          if (task.routineSourceId) {
            const tasks = state.tasks.map((t) =>
              t.id === id ? { ...t, deferredDate: today(), skippedDate: null } : t
            );
            return { tasks };
          }

          // 単発タスク: store から削除。
          return { tasks: state.tasks.filter((t) => t.id !== id) };
        });
      },

      skipTask: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, skippedDate: today(), deferredDate: null } : t
          ),
        }));
      },

      deferToNextDay: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, deferredDate: today(), skippedDate: null } : t
          ),
        }));
      },

      setFiveMinMode: (v) => set({ fiveMinMode: v }),

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
      // Also purges stale routine instances (completed or skipped, not today).
      syncRoutineTasks: () => {
        set((state) => {
          const t = today();

          // M-4: 古いルーティンインスタンスを削除。
          // 条件: routineSourceId を持つ（インスタンス）AND（完了済み OR スキップ済み）AND 今日以前
          const purged = state.tasks.filter((task) => {
            if (!task.routineSourceId) return true; // テンプレート・単発タスクは保持
            if (task.routineSpawnDate === t) return true; // 今日のインスタンスは保持
            return !(task.completed || task.skippedDate !== null || task.deferredDate !== null);
          });

          const templates = purged.filter((task) => task.isRoutine === true);
          const newInstances: Task[] = [];
          for (const tpl of templates) {
            const alreadySpawned = purged.some(
              (task) => task.routineSourceId === tpl.id && task.routineSpawnDate === t
            );
            if (alreadySpawned) continue;
            newInstances.push({
              id: `${tpl.id}-${t}`,
              title: tpl.title,
              completed: false,
              createdAt: t,
              skippedDate: null,
              deferredDate: null,
              isRoutine: false,
              routineCreatedAt: '',
              routineSourceId: tpl.id,
              routineSpawnDate: t,
            });
          }
          if (newInstances.length === 0 && purged.length === state.tasks.length) return state;
          return { tasks: [...newInstances, ...purged] };
        });
      },

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
        return get().tasks.filter((task) => task.isRoutine !== true && !task.completed && task.skippedDate !== t && task.deferredDate !== t).length;
      },

      completedTaskCount: () => {
        return get().tasks.filter((task) => task.isRoutine !== true && task.completed).length;
      },

      routineTasks: () => {
        return get().tasks.filter((task) => task.isRoutine === true);
      },

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
          // 完了（=defer 済み）または当日 defer のインスタンスを「今日完了済み」とみなす
          return !!instance && (instance.completed || instance.deferredDate === t);
        }
        // 単発タスク or 当日インスタンス: 完了済み or 当日 defer なら抑制
        return target.completed === true || target.deferredDate === t;
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
            task.skippedDate !== t &&
            task.deferredDate !== t
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
        reminders: state.reminders,
        reminderMessage: state.reminderMessage,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        timerWorkMinutes: state.timerWorkMinutes,
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
        // 旧データに deferredDate が無い場合は null で補完（3状態モデル移行）
        if (Array.isArray(state.tasks)) {
          state.tasks = state.tasks.map((t) =>
            (t as any).deferredDate === undefined ? { ...t, deferredDate: null } : t
          );
        }
        // タスクが存在するのにhasCompletedOnboardingがfalseの場合は
        // migration起因のデータ破損と判断して復元する
        if (!state.hasCompletedOnboarding && state.tasks.length > 0) {
          state.hasCompletedOnboarding = true;
        }
      },
    }
  )
);
