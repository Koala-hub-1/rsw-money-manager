# Phase 0: プロトタイプ仕様書

## 目的
freeeのCSVデータを使い、2名分のモックで「お金の流れが見える」体験を作る。
渡辺氏に触ってもらい、システム化の具体イメージを共有するためのプロトタイプ。

## スコープ

### やること
1. freeeからエクスポートしたCSV（銀行口座明細・デビットカード明細）を取り込む
2. 入居者2名分の口座残高・カード残高を一覧表示する
3. 取引明細を一覧表示し、各取引のカテゴリ（何に使ったか）を表示する
4. スマホからレシート写真を撮影し、デビットカードの明細と紐づける
5. 入居者ごとの支出内訳（カテゴリ別）をグラフで表示する

### やらないこと
- 認証（ログイン機能なし）
- RLS（Row Level Security）
- 承認ワークフロー
- 異常検知アラート
- LINE通知 / OCR / PDF月次レポート

## 技術構成

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js 15 (App Router) + Tailwind CSS |
| バックエンド | Supabase (Database + Storage) |
| グラフ | Recharts |
| ホスティング | Vercel |
| スマホ対応 | レスポンシブWeb（Expoアプリは作らない） |

## freee CSVフォーマット

### 取り込み元
freeeの ［分析・レポート］→［現預金レポート］→ 口座選択 → ［CSVエクスポート］
入居者ごとに口座・カードが異なるため、1ファイル = 1口座 or 1カード。

### 想定カラム
```csv
日付,摘要,入金,出金,残高
2026-03-01,家賃振込,,43000,107000
2026-03-05,VISA デビット マツモトキヨシ,,1280,94720
```

### パーサー要件（lib/csvParser.ts）
- UTF-8 BOM付きに対応
- ヘッダー行を自動検出（freeeはヘッダー前にメタ情報行が入る場合あり）
- 日付: YYYY-MM-DD or YYYY/MM/DD
- 金額: カンマ区切り対応（"43,000" → 43000）
- 入金/出金が分かれている場合と正負1列の両方に対応

### 取り込みフロー
1. 入居者を選択
2. 口座種別を選択（銀行口座 / デビットカード）
3. CSVファイルをアップロード
4. プレビュー表示（最初の5行）
5. カラムマッピング確認（自動推測 + 手動修正可）
6. 取り込み実行

## カテゴリ自動推測（lib/categoryGuesser.ts）

```typescript
const RULES: [string[], string][] = [
  [['家賃', '賃料'], '家賃'],
  [['共益', '管理費'], '共益費'],
  [['食費', '給食'], '食費'],
  [['マツモトキヨシ', 'ドラッグ', 'セブン', 'ローソン', 'ファミマ', 'ダイソー'], '日用品'],
  [['病院', 'クリニック', '薬局', '調剤'], '医療'],
  [['タクシー', 'バス', '電車', 'Suica', 'PASMO'], '交通'],
  [['Choice100'], '娯楽'],
  [['電気', 'ガス', '水道', 'NHK'], '光熱費'],
  [['携帯', 'docomo', 'au', 'SoftBank'], '通信'],
];

export function guessCategory(description: string): string {
  for (const [keywords, category] of RULES) {
    if (keywords.some(kw => description.includes(kw))) return category;
  }
  return 'その他';
}
```

取り込み時に自動推測し、取引詳細画面でユーザーが手動修正可能。

## 画面仕様（5画面）

### 画面1: ダッシュボード `/`
- 入居者カード × 2（名前、銀行残高、デビット残高、直近取引3件）
- カードタップで入居者詳細へ遷移
- 「CSVアップロード」ボタン

### 画面2: 入居者詳細 `/residents/[id]`
- 残高サマリ（銀行口座・デビット）
- 支出内訳グラフ（Recharts 円グラフ、カテゴリ別、今月）
- 月間支出額（今月合計）
- 取引明細リスト（日付、摘要、金額、カテゴリバッジ、レシート有無アイコン）
- フィルタ（月選択、口座種別、カテゴリ）

### 画面3: 取引詳細 `/transactions/[id]`
- 取引情報（日付、摘要、金額、口座、取引後残高）
- カテゴリ（ドロップダウンで変更可能）
- レシート（紐づけ済み画像 or 「レシートを追加」ボタン）
- メモ（自由入力欄）

### 画面4: レシート撮影 `/receipts/new?transaction_id=xxx`
- カメラ起動: `<input type="file" accept="image/*" capture="environment">`
- プレビュー表示
- メモ入力欄
- 送信 → Supabase Storageにアップロード → transactions.receipt_id更新

### 画面5: CSVアップロード `/import`
| ステップ | 内容 |
|----------|------|
| 1 | 入居者選択（ドロップダウン） |
| 2 | 口座種別選択（銀行口座 / デビットカード） |
| 3 | CSVファイル選択 |
| 4 | プレビュー（最初の5行） |
| 5 | カラムマッピング（自動推測 + 手動修正） |
| 6 | 取り込み実行 → 件数表示 → ダッシュボードへ |

## ディレクトリ構成

```
app/
├── layout.tsx
├── page.tsx                      -- ダッシュボード
├── residents/[id]/page.tsx       -- 入居者詳細
├── transactions/[id]/page.tsx    -- 取引詳細
├── receipts/new/page.tsx         -- レシート撮影
└── import/page.tsx               -- CSVアップロード

components/
├── ResidentCard.tsx
├── TransactionList.tsx
├── CategoryBadge.tsx
├── SpendingChart.tsx              -- Recharts円グラフ
├── CsvUploader.tsx
├── ColumnMapper.tsx
└── ReceiptCapture.tsx

lib/
├── supabase.ts                    -- Supabaseクライアント
├── csvParser.ts                   -- CSVパース + カラム自動推測
├── categoryGuesser.ts             -- カテゴリ自動推測
└── types.ts                       -- 型定義
```

## 開発スケジュール

| 日 | タスク | 成果物 |
|----|--------|--------|
| Day 1 | Supabase + Next.jsセットアップ、DB作成、シードデータ | 動く空プロジェクト |
| Day 2 | CSVパーサー + アップロード画面 | freee CSVを取り込める |
| Day 3 | ダッシュボード + 入居者詳細画面 | 残高・明細が見える |
| Day 4 | カテゴリ自動推測 + 支出内訳グラフ | 何に使っているか見える |
| Day 5 | レシート撮影 + 取引紐づけ | スマホからレシートが撮れる |
| Day 6 | UI仕上げ + Vercelデプロイ | 渡辺氏に共有できるURL |
