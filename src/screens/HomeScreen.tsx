import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, Pressable, TextInput,
  Modal, ScrollView, Switch,
  AppState, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { ACTION_START, ACTION_LATER } from '../services/NotificationService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../components/Text';
import { TaskCard } from '../components/TaskCard';
import { TaskListPanel } from '../components/TaskListPanel';
import { useAppStore, Task, today } from '../store/useAppStore';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';

function formatDateJP(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function pickRandom<T extends { id: string }>(arr: T[], excludeId?: string): T | null {
  const pool = excludeId ? arr.filter((t) => t.id !== excludeId) : arr;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function HomeScreen() {
  const tasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const skipTask = useAppStore((s) => s.skipTask);
  const deferToNextDay = useAppStore((s) => s.deferToNextDay);
  const setTimerTask = useAppStore((s) => s.setTimerTask);
  const availableTaskCount = useAppStore((s) => s.availableTaskCount);
  const isProUnlocked = useAppStore((s) => s.isProUnlocked);
  const navigation = useNavigation<any>();

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [addInputVisible, setAddInputVisible] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [inputIsRoutine, setInputIsRoutine] = useState(false);
  const [taskListPanelVisible, setTaskListPanelVisible] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const todayStr = today();
  const doableTasks = tasks.filter((t) => t.isRoutine !== true);
  // 提示候補: skippedDate ≠ today かつ deferredDate ≠ today
  const availableTasks = doableTasks.filter(
    (t) => !t.completed && t.skippedDate !== todayStr && t.deferredDate !== todayStr
  );
  // 後回し: skippedDate === today かつ deferredDate ≠ today
  const skippedTasks = doableTasks.filter(
    (t) => !t.completed && t.skippedDate === todayStr && t.deferredDate !== todayStr
  );
  // 翌日に再提示: deferredDate === today（表示しない・「全タスク」導線判定にのみ使用）
  const deferredTasks = doableTasks.filter(
    (t) => !t.completed && t.deferredDate === todayStr
  );
  const proposalPool = availableTasks.length > 0 ? availableTasks : skippedTasks;
  const currentTask = proposalPool.find((t) => t.id === currentTaskId) ?? null;

  // Spawn today's routine instances on mount and whenever the app surfaces.
  // Returning from the background across a date boundary must re-sync so
  // today's routine tasks get generated.
  useEffect(() => {
    useAppStore.getState().syncRoutineTasks();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        useAppStore.getState().syncRoutineTasks();
      }
    });

    return () => subscription.remove();
  }, []);

  // 通知への応答ハンドリング（本体タップ / 「今すぐ開始」 / 「次に回す」）。
  // - 完了済み抑制: その日（JST）すでに完了済みのタスクには何もしない（蒸し返さない）。
  // - 本体タップ: アプリを開くだけ（提示は置換しない）。
  // - 今すぐ開始: 提示タスクを置換。タイマー作動中なら確認を挟む（案A）。
  // - 次に回す: FIFO キューへ予約（現作業は中断しない）。
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const req = response.notification.request;
      // taskId は通知データ優先、無ければ識別子からフォールバック抽出。
      const dataTaskId = (req.content.data as any)?.taskId;
      const match = req.identifier.match(/^task-reminder-(.+)$/);
      const taskId: string | undefined = dataTaskId ?? (match ? match[1] : undefined);
      if (!taskId) return; // タスク非紐づけの独立リマインダー → 開くだけ

      const store = useAppStore.getState();
      // 完了済み抑制（受信時）: 当日すでに完了済みなら提示置換もキュー追加もしない。
      if (store.isReminderTaskDoneToday(taskId)) return;

      // ルーティンテンプレ id の場合は当日インスタンスへ解決（インスタンスが提示対象）。
      const t = today();
      const tasks = store.tasks;
      let targetId = taskId;
      const direct = tasks.find((x) => x.id === taskId);
      if (direct?.isRoutine) {
        const instance = tasks.find(
          (x) => x.routineSourceId === taskId && x.routineSpawnDate === t
        );
        if (!instance) return; // 当日インスタンスが無ければ対象なし
        targetId = instance.id;
      }
      // 提示対象として有効か（未完了・当日プール）。
      const target = tasks.find((x) => x.id === targetId);
      if (!target || target.completed || target.isRoutine) return;

      const action = response.actionIdentifier;

      if (action === ACTION_LATER) {
        store.enqueueReminder(targetId);
        return;
      }

      // ACTION_START または 本体タップ（DEFAULT）。
      // 本体タップは「開くだけ＝置換しない」が決定だが、提示が空のときは置換して着手導線を確保する。
      const isStart = action === ACTION_START;
      if (!isStart) {
        // 本体タップ: 提示は置換しない（ただし現提示が無ければ初期提示として採用）
        setCurrentTaskId((prev) => prev ?? targetId);
        return;
      }

      // 「今すぐ開始」: タイマー作動中なら確認を挟む（案A）。
      if (store.timerTaskId !== null) {
        Alert.alert(
          '作業を切り替えますか？',
          '今の作業を中断して、こちらに切り替えますか？',
          [
            { text: 'そのまま続ける', style: 'cancel' },
            {
              text: '切り替える',
              onPress: () => {
                useAppStore.getState().setTimerTask(null);
                setCurrentTaskId(targetId);
              },
            },
          ]
        );
        return;
      }
      setCurrentTaskId(targetId);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (proposalPool.length === 0) { setCurrentTaskId(null); return; }
    if (currentTaskId && proposalPool.find((t) => t.id === currentTaskId)) return;
    // 「次に回す」予約があればFIFOで優先提示。無効分は捨てられる。無ければランダム。
    const queued = useAppStore.getState().dequeueValidReminder();
    if (queued && proposalPool.find((t) => t.id === queued)) {
      setCurrentTaskId(queued);
      return;
    }
    const picked = pickRandom(proposalPool);
    setCurrentTaskId(picked ? (picked as Task).id : null);
  }, [proposalPool.length, availableTasks.length]);
  // availableTasks.length の変化（available→0）でも再選択が走るよう deps に追加

  // 「後回し」ボタン: 提示候補フェーズ→後回し(skipped)、後回しフェーズ→翌日(deferred)。
  const handleDefer = useCallback(() => {
    if (!currentTask) return;
    if (availableTasks.find((t) => t.id === currentTask.id)) {
      // 提示候補フェーズ: 後回し状態へ
      skipTask(currentTask.id);
      const next = pickRandom(availableTasks.filter((t) => t.id !== currentTask.id));
      setCurrentTaskId((next as Task | null)?.id ?? null);
    } else {
      // 後回しフェーズ: 翌日に再提示へ
      deferToNextDay(currentTask.id);
      const next = pickRandom(skippedTasks.filter((t) => t.id !== currentTask.id));
      setCurrentTaskId((next as Task | null)?.id ?? null);
    }
  }, [currentTask, availableTasks, skippedTasks, skipTask, deferToNextDay]);

  // 「5分だけ」ボタン: fiveMinMode を立ててタイマーへ。
  const handleFiveMin = useCallback(() => {
    if (!currentTask) return;
    useAppStore.getState().setFiveMinMode(true);
    setTimerTask(currentTask.id);
    navigation.navigate('Timer');
  }, [currentTask, setTimerTask, navigation]);

  function handleStartFromList(taskId: string) {
    setCurrentTaskId(taskId);
    setTaskListPanelVisible(false);
  }

  function openAddPopover() {
    setAddInputVisible(true);
  }

  // 「毎日繰り返す」トグル: Pro未解放ではオンにできず、Pro訴求を表示する。
  function handleRoutineToggle(value: boolean) {
    if (value && !isProUnlocked) {
      if (Platform.OS === 'web') {
        window.alert('ルーティンタスクはProで解放できます。設定タブからProを購入してください。');
      } else {
        Alert.alert('ルーティンタスクはPro機能です', 'Proで解放できます。設定タブからご購入いただけます。');
      }
      return;
    }
    setInputIsRoutine(value);
  }

  function closeAddPopover() {
    setAddInputVisible(false);
    setInputTitle('');
    setInputIsRoutine(false);
  }

  function handleAddSubmit() {
    const title = inputTitle.trim();
    if (!title) return;
    const newId = addTask(title, inputIsRoutine);
    if (inputIsRoutine) {
      // spawn today's instance immediately so it shows up right away
      useAppStore.getState().syncRoutineTasks();
    } else {
      setCurrentTaskId((prev) => prev ?? newId);
    }
    closeAddPopover();
  }

  const available = availableTaskCount();

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── TOP BAR（日付 + タスク一覧入口・常時表示） ── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarDate}>{formatDateJP(todayStr)}</Text>
        <Pressable
          style={({ pressed }) => [styles.listIconBtn, pressed && { opacity: 0.5 }]}
          onPress={() => setTaskListPanelVisible(true)}
        >
          <Ionicons name="list" size={28} color={colors.surface} />
        </Pressable>
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentTask ? (
          <>
            {/* Section label */}
            <Text style={styles.sectionTag}>今やること</Text>

            {/* Focus card */}
            <View style={styles.focusCard}>
              <View style={[styles.focusCardBar, { backgroundColor: currentTask.routineSourceId ? colors.success : colors.primary }]} />
              <View style={styles.focusCardBody}>
                <Text style={styles.focusTitle}>{currentTask.title}</Text>
              </View>
            </View>

            {/* Action buttons: はじめる（全幅） + [5分だけ][後回し] */}
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [styles.doneBtn, pressed && { backgroundColor: colors.primaryDark }]}
                onPress={() => { setTimerTask(currentTask!.id); navigation.navigate('Timer'); }}
              >
                <Text style={styles.doneBtnText}>はじめる</Text>
              </Pressable>
              <View style={styles.subActionRow}>
                <Pressable
                  style={({ pressed }) => [styles.subBtnFive, pressed && { opacity: 0.65 }]}
                  onPress={handleFiveMin}
                >
                  <Text style={styles.subBtnFiveText}>5分だけ</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.subBtn, pressed && { opacity: 0.65 }]}
                  onPress={handleDefer}
                >
                  <Text style={styles.subBtnText}>後回し</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : doableTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyNum}>00</Text>
            <View style={styles.headerRule} />
            <Text style={styles.emptyTitle}>タスクを追加しよう</Text>
            <Text style={styles.emptyHint}>思いついたことを何でも書いてみて</Text>
          </View>
        ) : proposalPool.length === 0 && doableTasks.length > 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyNum}>✓</Text>
            <View style={styles.headerRule} />
            <Text style={styles.emptyTitle}>今日はここまで！</Text>
            <Text style={styles.emptyHint}>残りは明日また表示されます</Text>
          </View>
        ) : null}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.primaryDark }]}
          onPress={openAddPopover}
        >
          <Text style={styles.fabText}>＋ タスクを追加</Text>
        </Pressable>
      </View>

      {/* ── POPOVER: Add task ── */}
      <Modal
        visible={addInputVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddPopover}
        onShow={() => setTimeout(() => inputRef.current?.focus(), 100)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
        >
          <Pressable style={styles.popoverOverlay} onPress={closeAddPopover}>
            <Pressable style={styles.popover} onPress={() => {}}>
            <TextInput
              ref={inputRef}
              style={styles.popoverInput}
              placeholder="何をしますか？"
              placeholderTextColor={colors.textDisabled}
              value={inputTitle}
              onChangeText={setInputTitle}
              returnKeyType="done"
              onSubmitEditing={handleAddSubmit}
              maxLength={100}
            />
            <View style={styles.popoverToggleRow}>
              <Text style={styles.popoverToggleLabel}>
                毎日繰り返す{!isProUnlocked && <Text style={styles.popoverToggleProTag}> Pro</Text>}
              </Text>
              <Switch
                value={inputIsRoutine}
                onValueChange={handleRoutineToggle}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor='#FFFFFF'
                ios_backgroundColor={colors.border}
              />
            </View>
            <Pressable
              style={({ pressed }) => [styles.popoverAddBtn, !inputTitle.trim() && styles.popoverAddBtnDisabled, pressed && { opacity: 0.85 }]}
              onPress={handleAddSubmit}
              disabled={!inputTitle.trim()}
            >
              <Text style={styles.popoverAddText}>追加</Text>
            </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {taskListPanelVisible && (
        <TaskListPanel
          onClose={() => setTaskListPanelVisible(false)}
          onStartTask={handleStartFromList}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topBarDate: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.surface,
    letterSpacing: 1,
  },
  listIconBtn: {
    padding: spacing.sm,
  },

  // ── Divider ──
  headerRule: {
    height: 1,
    backgroundColor: colors.ink,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    flexGrow: 1,
  },
  sectionTag: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },

  // ── Focus card ──
  focusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  focusCardBar: {
    height: 4,
  },
  focusCardBody: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  focusTitle: {
    fontSize: 30,
    fontWeight: fontWeight.black,
    color: colors.ink,
    lineHeight: 38,
    letterSpacing: -0.5,
    minHeight: 76,
  },
  // ── Action buttons ──
  actionRow: {
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  subActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  subBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.soft,
  },
  subBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  subBtnFive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadow.soft,
  },
  subBtnFiveText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    marginHorizontal: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  doneBtnText: {
    fontSize: fontSize.lg,
    color: colors.surface,
    fontWeight: fontWeight.black,
    letterSpacing: 1,
  },

  // ── Empty states ──
  emptyState: {
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyNum: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.black,
    color: colors.surfaceAlt,
    letterSpacing: -3,
    lineHeight: 60,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    lineHeight: 20,
  },

  // ── Bottom bar ──
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    overflow: 'visible',
  },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginHorizontal: 8,
    marginTop: -26,
    ...shadow.card,
  },
  fabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.black,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  // ── Popover: add task ──
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,16,7,0.30)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  popover: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.ink,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  popoverInput: {
    fontSize: fontSize.md,
    color: colors.textMain,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  popoverToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  popoverToggleLabel: {
    fontSize: fontSize.sm,
    color: colors.textMain,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  popoverToggleProTag: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  popoverAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  popoverAddBtnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  popoverAddText: {
    color: colors.surface,
    fontWeight: fontWeight.black,
    fontSize: fontSize.md,
    letterSpacing: 1,
  },
});
