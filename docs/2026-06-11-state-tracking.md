# 状態トラッキング機能 設計メモ

日付: 2026-06-11
担当: 開発部署

## 目的

ADHDサポートアプリ「いっぽ」に、気分（mood）と集中度（focus）を軽量に記録・振り返りできる
状態トラッキング機能を追加する。記録のハードルを極力下げ、ADHD特性に配慮して
「1タップで記録 → 任意でメモ」というフローにする。

## データモデル（useAppStore.ts）

### MoodEntry（気分記録）
- `id: string`
- `timestamp: string`（ISO8601）
- `level: 1|2|3|4|5`
- `memo?: string`

### FocusEntry（集中度記録）
- `id`, `timestamp`, `level`, `taskId`, `taskTitle`, `memo?`

### 追加フィールド
- `moodEntries: MoodEntry[]`
- `focusEntries: FocusEntry[]`
- `focusPromptEnabled: boolean`（タスク完了後の集中度プロンプトON/OFF。初期値true）

### 追加アクション
- `addMoodEntry(level, memo?)`
- `addFocusEntry(level, taskId, taskTitle, memo?)`
- `toggleFocusPrompt()`
- `getMoodEntriesForDate(date)` / `getMoodAverageForDate(date)`（四捨五入・記録なしはnull）
- `getFocusEntriesForDate(date)`

永続化（partialize）に moodEntries / focusEntries / focusPromptEnabled を追加。
onRehydrate で配列・boolean のデフォルト補完を行い、旧データ互換を確保する。

## 色設定（theme/index.ts）

`moodColors` を追加（1=赤 / 2=橙 / 3=黄 / 4=緑 / 5=青）。気分・集中度の両方で共通利用。

## UI構成

### 気分入力（MoodInput.tsx → HomeScreen に常設）
- ＋タスク追加ボタン（bottomBar）の上に happy アイコンを常設。
  当日記録済みなら塗りアイコン（happy）、未記録なら happy-outline。
- タップで5段階アイコンをインライン横展開（LayoutAnimation）。
- 段階タップ → メモ入力モーダル（保存／スキップ）→ addMoodEntry。
- アイコン以外タップで閉じる。

### 集中度モーダル（FocusModal.tsx）
- タスク完了直後、focusPromptEnabled が true のときのみ表示。
- 実装上の完了点は **TimerScreen.handleComplete**（Homeフォーカスカード→Timer→「タスク完了！」が主要動線）。
  仕様書は「HomeScreen の completeTask 呼び出し箇所」と記載しているが、現コードでは
  HomeScreen は completeTask を直接呼ばず、Timer 経由で完了する。実際に動作する完了点に組み込む。
- 5段階アイコン → メモ → 保存（addFocusEntry）／スキップ（記録せず閉じる）。

### 閲覧（ProfileScreen「きろく」セクション）
- react-native-calendars のカレンダー。各日の dot に気分平均色を表示。
- 日付タップ → 下からスライドインする Modal（BottomSheet風）で当日の気分・集中度を時刻昇順表示。
  ●は moodColors の色付き View。記録のないセクションは非表示。
- react-native-gifted-charts の折れ線で気分（#3B82F6）と集中度（#22C55E）を重ね表示。
  期間チップ（1週間／1か月／3か月、デフォルト1か月）で切替。
  expo-linear-gradient を gifted-charts に注入。

### 設定（ProfileScreen）
- リマインダー付近に「集中度プロンプト」トグル（Switch → toggleFocusPrompt）。

## ベータ対応（isPremium無効化）
- isPremium 初期値は既に true。維持。
- PremiumLock は現状どこからも使われていないが、ベータ中は常に children を表示する
  passthrough 実装に変更（`// BETA: 全機能開放` でマーク）。EA時に戻す目印。

## 既知の注意点
- Zustand セレクタ内で filter/map すると web で無限ループするため、セレクタは配列を
  そのまま取得し、render 内で filter/map する。getter アクションは get() ベースで実装。
- グラフ・カレンダーは react-native-web 上でも描画される構成にする。

## ファイル命名
- ドキュメント・非コンポーネントは kebab-case。
- コンポーネントは既存規約（PascalCase）に合わせる（仕様書も FocusModal.tsx と明記）。
</content>
</invoke>
