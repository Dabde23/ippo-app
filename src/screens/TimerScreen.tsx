import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput, AppState, Modal, Platform, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { Text } from '../components/Text';
import { TimerDisplay } from '../components/TimerDisplay';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { scheduleTimerEndNotification, cancelTimerEndNotification, cancelTaskReminder } from '../services/NotificationService';

// Semicircle arc constants
const SEMI_W = 300;
const SEMI_R = 140;
const SEMI_CX = SEMI_W / 2; // 150
const SEMI_CY = SEMI_R + 20; // 160
const SEMI_H = SEMI_CY + 20; // 180
const SEMI_STROKE = 14;
const SEMI_PATH_LEN = Math.PI * SEMI_R; // ≈ 376.99

// Track path: from left (30, 140) clockwise through top (150, 20) to right (270, 140)
// sweep-flag=1 = clockwise in SVG (y-down) = visually goes UP through the top half
const SEMI_TRACK = `M ${SEMI_CX - SEMI_R},${SEMI_CY} A ${SEMI_R},${SEMI_R} 0 0,1 ${SEMI_CX + SEMI_R},${SEMI_CY}`;

export function TimerScreen() {
  const { timerTaskId, tasks, completeTask, setTimerTask, deferToNextDay, timerWorkMinutes, setTimerWorkMinutes, timerBreakMinutes, setTimerBreakMinutes, fiveMinMode, setFiveMinMode } = useAppStore();

  const [seconds, setSeconds] = useState(timerWorkMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [editingWork, setEditingWork] = useState(false);
  const [workInput, setWorkInput] = useState('');
  const [editingBreak, setEditingBreak] = useState(false);
  const [breakInput, setBreakInput] = useState('');
  const [fiveMinDone, setFiveMinDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseEndTimeRef = useRef<number | null>(null);

  // 「5分だけ」モード時は作業時間を5分に上書き（arc/フェーズ整合のため effective を使用）。
  const effectiveWorkMin = fiveMinMode ? 5 : timerWorkMinutes;
  const workSec = effectiveWorkMin * 60;
  const breakSec = timerBreakMinutes * 60;
  const totalSec = mode === 'work' ? workSec : breakSec;

  const navigation = useNavigation<any>();
  const timerTask = tasks.find((t) => t.id === timerTaskId) ?? null;

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelTimerEndNotification();
      return;
    }
    intervalRef.current = setInterval(() => {
      if (phaseEndTimeRef.current === null) return;
      const remaining = phaseEndTimeRef.current - Date.now();
      if (remaining <= 0) {
        // 「5分だけ」モードで work フェーズが終了したら break に移らず 3 択を表示。
        if (fiveMinMode && mode === 'work') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          cancelTimerEndNotification();
          phaseEndTimeRef.current = null;
          setIsRunning(false);
          setSeconds(0);
          setFiveMinDone(true);
          return;
        }
        const next = mode === 'work' ? 'break' : 'work';
        const nextSec = next === 'work' ? workSec : breakSec;
        phaseEndTimeRef.current = Date.now() + nextSec * 1000;
        setMode(next);
        setSeconds(nextSec);
        const endBody = next === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
        scheduleTimerEndNotification(nextSec, endBody);
      } else {
        setSeconds(Math.ceil(remaining / 1000));
      }
    }, 250);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, workSec, breakSec, fiveMinMode]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active' || !isRunning || phaseEndTimeRef.current === null) return;
      const now = Date.now();
      // 「5分だけ」モードの work 終了がバックグラウンド中に来ていたら 3 択へ。
      if (fiveMinMode && mode === 'work' && phaseEndTimeRef.current <= now) {
        cancelTimerEndNotification();
        phaseEndTimeRef.current = null;
        setIsRunning(false);
        setSeconds(0);
        setFiveMinDone(true);
        return;
      }
      let endTime = phaseEndTimeRef.current;
      let currentMode = mode;
      while (endTime <= now) {
        currentMode = currentMode === 'work' ? 'break' : 'work';
        const nextSec = currentMode === 'work' ? workSec : breakSec;
        endTime += nextSec * 1000;
      }
      phaseEndTimeRef.current = endTime;
      const remaining = Math.ceil((endTime - now) / 1000);
      setSeconds(remaining);
      if (currentMode !== mode) {
        setMode(currentMode);
        cancelTimerEndNotification();
        const body = currentMode === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
        scheduleTimerEndNotification(remaining, body);
      }
    });
    return () => sub.remove();
  }, [isRunning, mode, workSec, breakSec, fiveMinMode]);

  // タイマー対象が変わったら、カウントダウンなしで即開始。走行中でも一旦リセットして再開。
  useEffect(() => {
    if (!timerTaskId) return;
    // fiveMinMode なら開始秒数を 5分に上書き。
    const startSec = (fiveMinMode ? 5 : timerWorkMinutes) * 60;
    cancelTimerEndNotification();
    setMode('work');
    setSeconds(startSec);
    setFiveMinDone(false);
    setEditingWork(false);
    setEditingBreak(false);
    phaseEndTimeRef.current = Date.now() + startSec * 1000;
    setIsRunning(true);
    scheduleTimerEndNotification(startSec, 'ブレイクの時間です');
  }, [timerTaskId, fiveMinMode]);

  function handleStartPause() {
    const newRunning = !isRunning;
    if (newRunning) {
      phaseEndTimeRef.current = Date.now() + seconds * 1000;
      const body = mode === 'work' ? 'ブレイクの時間です' : 'フォーカスの時間です';
      scheduleTimerEndNotification(seconds, body);
    }
    setIsRunning(newRunning);
  }

  // インライン作業時間入力の確定。
  function commitWorkInput() {
    const n = parseInt(workInput, 10);
    if (!isNaN(n) && n >= 1 && n <= 180) {
      setTimerWorkMinutes(n);
      if (mode === 'work' && !isRunning) setSeconds(n * 60);
    }
    setEditingWork(false);
  }

  // インライン休憩時間入力の確定（1〜60分）。
  function commitBreakInput() {
    const n = parseInt(breakInput, 10);
    if (!isNaN(n) && n >= 1 && n <= 60) {
      setTimerBreakMinutes(n);
      if (mode === 'break' && !isRunning) setSeconds(n * 60);
    }
    setEditingBreak(false);
  }

  const handleComplete = useCallback(() => {
    if (!timerTask) return;
    cancelTimerEndNotification();
    if (timerTask.taskReminderTime) cancelTaskReminder(timerTask.id);
    if (Platform.OS !== 'web') {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Vibration.vibrate(80);
      }
    }
    completeTask(timerTask.id);
    setIsRunning(false);
    setFiveMinDone(false);
    setTimerTask(null);
    setFiveMinMode(false);
    navigation.navigate('Home');
  }, [timerTask, completeTask, setTimerTask, setFiveMinMode, navigation]);

  const handleDeferAndGoHome = useCallback(() => {
    cancelTimerEndNotification();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (timerTask) deferToNextDay(timerTask.id);
    setIsRunning(false);
    setFiveMinDone(false);
    setSeconds(timerWorkMinutes * 60);
    setMode('work');
    setTimerTask(null);
    setFiveMinMode(false);
    navigation.navigate('Home');
  }, [timerTask, deferToNextDay, setTimerTask, setFiveMinMode, navigation, timerWorkMinutes]);

  // 「5分だけ」→「続ける」: 通常タイマーに切り替えて即再開（break なし）。
  const handleContinueFull = useCallback(() => {
    const sec = timerWorkMinutes * 60;
    setFiveMinDone(false);
    setFiveMinMode(false);
    setMode('work');
    setSeconds(sec);
    phaseEndTimeRef.current = Date.now() + sec * 1000;
    setIsRunning(true);
    scheduleTimerEndNotification(sec, 'ブレイクの時間です');
  }, [timerWorkMinutes, setFiveMinMode]);

  const ringColor = mode === 'work' ? colors.primary : colors.success;

  // Arc shows ELAPSED time: grows from left→top→right as time passes
  // ratio = remaining fraction (1 at start → 0 at end)
  const ratio = seconds / totalSec;
  // dashOffset=L when ratio=1 (no arc yet), 0 when ratio=0 (full arc)
  const dashOffset = SEMI_PATH_LEN * ratio;

  // Dot at leading edge (moves left→top→right as elapsed time grows)
  // ratio=1 (start): dotAngle=π → left; ratio=0.5: π/2 → top; ratio=0: 0 → right
  const dotAngle = ratio * Math.PI;
  const dotX = SEMI_CX + SEMI_R * Math.cos(dotAngle);
  const dotY = SEMI_CY - SEMI_R * Math.sin(dotAngle);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task card */}
        {timerTask && (
          <View style={styles.timerTaskCard}>
            <View style={[styles.timerTaskCardBar, { backgroundColor: ringColor }]} />
            <View style={styles.timerTaskCardBody}>
              <Text style={styles.timerTaskCardTitle} numberOfLines={2}>{timerTask.title}</Text>
            </View>
          </View>
        )}

        {!isRunning && (
          <View style={styles.durationRow}>
            {editingWork ? (
              <TextInput
                style={styles.durationInput}
                value={workInput}
                onChangeText={(v) => setWorkInput(v.replace(/[^0-9]/g, ''))}
                onSubmitEditing={commitWorkInput}
                onBlur={commitWorkInput}
                keyboardType="number-pad"
                maxLength={3}
                returnKeyType="done"
                autoFocus
              />
            ) : (
              <Pressable
                style={({ pressed }) => [styles.durationChip, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  setWorkInput(String(timerWorkMinutes));
                  setEditingWork(true);
                }}
              >
                <Text style={styles.durationChipText}>作業 {timerWorkMinutes}分</Text>
              </Pressable>
            )}
            <Text style={styles.durationPlus}>+</Text>
            {editingBreak ? (
              <TextInput
                style={styles.durationInput}
                value={breakInput}
                onChangeText={(v) => setBreakInput(v.replace(/[^0-9]/g, ''))}
                onSubmitEditing={commitBreakInput}
                onBlur={commitBreakInput}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
                autoFocus
              />
            ) : (
              <Pressable
                style={({ pressed }) => [styles.durationBreakChip, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  setBreakInput(String(timerBreakMinutes));
                  setEditingBreak(true);
                }}
              >
                <Text style={styles.durationBreakChipText}>休憩 {timerBreakMinutes}分</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Semicircle arc + Time display overlay */}
        <View style={styles.arcWrapper}>
          <Svg width={SEMI_W} height={SEMI_H}>
            {/* Track (background arc) */}
            <Path
              d={SEMI_TRACK}
              stroke={colors.surfaceAlt}
              strokeWidth={SEMI_STROKE}
              fill="none"
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <Path
              d={SEMI_TRACK}
              stroke={ringColor}
              strokeWidth={SEMI_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={SEMI_PATH_LEN}
              strokeDashoffset={dashOffset}
            />
            {/* Dot marker at end of visible arc */}
            <SvgCircle
              cx={dotX}
              cy={dotY}
              r={9}
              fill={ringColor}
            />
          </Svg>
          <View style={styles.timeOverlay}>
            <TimerDisplay seconds={seconds} isRunning={isRunning} color={isRunning ? ringColor : colors.ink} />
          </View>
        </View>

        {/* Play/Pause button */}
        <Pressable
          style={({ pressed }) => [styles.mainBtn, pressed && { opacity: 0.8 }]}
          onPress={handleStartPause}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? '一時停止' : 'スタート'}
        >
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={30}
            color={colors.primary}
          />
        </Pressable>

        {/* Task actions: 完了 / 今日はここまで */}
        {timerTask && (
          <View style={styles.taskActions}>
            <Pressable
              style={({ pressed }) => [styles.completeBtn, pressed && { backgroundColor: colors.primaryDark }]}
              onPress={handleComplete}
            >
              <Text style={styles.completeBtnText}>完了</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.deferBtn, pressed && { opacity: 0.6 }]}
              onPress={handleDeferAndGoHome}
            >
              <Text style={styles.deferBtnText}>今日はここまで</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 「5分だけ」終了後の 3 択モーダル */}
      <Modal
        visible={fiveMinDone}
        transparent
        animationType="fade"
        onRequestClose={handleDeferAndGoHome}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>5分が経ちました</Text>
            <Pressable
              style={({ pressed }) => [styles.modalPrimaryBtn, pressed && { backgroundColor: colors.primaryDark }]}
              onPress={handleComplete}
            >
              <Text style={styles.modalPrimaryText}>完了</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalSecondaryBtn, pressed && { opacity: 0.7 }]}
              onPress={handleContinueFull}
            >
              <Text style={styles.modalSecondaryText}>続ける</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalGhostBtn, pressed && { opacity: 0.6 }]}
              onPress={handleDeferAndGoHome}
            >
              <Text style={styles.modalGhostText}>今日はここまで</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, gap: spacing.xxl, alignItems: 'center', paddingBottom: spacing.xxl },
  timerTaskCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  timerTaskCardBar: {
    height: 4,
  },
  timerTaskCardBody: {
    padding: spacing.lg,
    minHeight: 60 + spacing.lg * 2,
  },
  timerTaskCardTitle: {
    fontSize: 24,
    fontWeight: fontWeight.black,
    color: colors.ink,
    lineHeight: 38,
    letterSpacing: -0.5,
    minHeight: 60,
  },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' },
  durationChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  durationChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0.5 },
  durationPlus: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSub },
  durationBreakChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.success, backgroundColor: colors.successLight },
  durationBreakChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.success, letterSpacing: 0.5 },
  durationInput: { minWidth: 80, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  arcWrapper: {
    width: SEMI_W,
    position: 'relative',
  },
  timeOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mainBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, ...shadow.soft },
  taskActions: { width: '100%', gap: spacing.md, marginTop: spacing.xs },
  completeBtn: { alignItems: 'center', paddingVertical: 24, marginHorizontal: 8, borderRadius: radius.xl, backgroundColor: colors.primary, ...shadow.card },
  completeBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.surface, letterSpacing: 1 },
  deferBtn: { alignItems: 'center', paddingVertical: 16, marginHorizontal: 8, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt, marginTop: spacing.md, ...shadow.soft },
  deferBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 1, color: colors.textSub },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  modalPrimaryBtn: { alignItems: 'center', paddingVertical: 18, borderRadius: radius.md, backgroundColor: colors.primary },
  modalPrimaryText: { fontSize: fontSize.md, fontWeight: fontWeight.black, color: colors.surface, letterSpacing: 1 },
  modalSecondaryBtn: { alignItems: 'center', paddingVertical: 16, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  modalSecondaryText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 1 },
  modalGhostBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: radius.md },
  modalGhostText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSub, letterSpacing: 1 },
});
