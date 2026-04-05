# CLAUDE.md — RSW金銭管理システム

## プロジェクト概要
住宅型有料老人ホームのRSW（レジデンシャルソーシャルワーカー）が入居者の金銭管理を透明・安全に行うためのシステム。

## 設計思想
- **資金分離**: 入居者の本体口座にRSW・アレソノワはアクセスしない
- **決済ログ**: すべての支出がシステムを経由し改ざん不能な記録を残す
- **透明性**: 後見監督人（または家族）がリアルタイムで全取引を確認可能

## 技術スタック
- **フロントエンド**: Next.js 15 (App Router) + Tailwind CSS
- **バックエンド**: Supabase (Auth, Database, Storage, Edge Functions)
- **ホスティング**: Vercel
- **PDF生成**: @react-pdf/renderer
- **グラフ**: Recharts
- **言語**: TypeScript

## 開発フェーズ
- **Phase 0**: プロトタイプ（CSV取込、残高表示、取引一覧、レシート撮影）→ docs/PHASE0_SPEC.md
- **Phase 1**: 実運用MVP（認証、カードチェックアウト、アラート、月次レポート）→ docs/PHASE1_SPEC.md
- **Phase 2+**: フル機能（承認ワークフロー、LINE通知、OCR、Expoアプリ等）

## ディレクトリ構成
```
rsw-phase0/
├── CLAUDE.md                     ← このファイル
├── docs/
│   ├── REQUIREMENTS.md           ← 全体要件定義書
│   ├── PHASE0_SPEC.md            ← Phase 0 仕様書
│   ├── PHASE1_SPEC.md            ← Phase 1 仕様書
│   ├── ARCHITECTURE.md           ← アーキテクチャ概要
│   └── MONEY_FLOW.md             ← 資金フロー設計
├── supabase/
│   ├── schema-phase0.sql         ← Phase 0 DB定義
│   ├── schema-phase1.sql         ← Phase 1 追加テーブル
│   └── seed.sql                  ← シードデータ
├── sample-csv/                   ← テスト用freee CSVサンプル
├── app/                          ← Next.js App Router
├── components/
├── lib/
└── .env.local
```

## コーディング規約
- TypeScript strict mode
- コンポーネントは関数コンポーネント + hooks
- Supabaseクライアントは `lib/supabase.ts` に集約
- 型定義は `lib/types.ts` に集約
- CSVパーサーは `lib/csvParser.ts` に分離
- カテゴリ推測は `lib/categoryGuesser.ts` に分離
- 日本語UIテキストはコンポーネント内に直書き（i18n不要）
- エラーハンドリングは try-catch + ユーザー向けトースト表示

## 開発の進め方
1. docsディレクトリの仕様書を読んでから実装を開始すること
2. Phase 0を先に完成させ、Phase 1はPhase 0に機能追加する形で進める
3. Phase 0のコードはPhase 1で捨てる部分がゼロになるよう設計する
4. DBスキーマはphase0用を先に適用し、phase1で追加テーブルのみ適用する
