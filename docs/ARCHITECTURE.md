# アーキテクチャ概要

## システム構成図

```
┌─────────────────────────────────────────────────────┐
│  ユーザー                                             │
│  RSW（スマホ） / Admin（PC） / 家族・後見監督人（PC）    │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────┐
│  Next.js 15 (App Router) — Vercel                    │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐   │
│  │ダッシュ   │ │入居者詳細│ │CSVアップロード      │   │
│  │ボード    │ │取引一覧  │ │レシート撮影         │   │
│  │(P0)      │ │(P0)     │ │(P0)               │   │
│  └──────────┘ └──────────┘ └────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐   │
│  │ログイン   │ │カードCO  │ │家族ポータル         │   │
│  │(P1)      │ │(P1)     │ │(P1)               │   │
│  └──────────┘ └──────────┘ └────────────────────┘   │
│  ┌──────────┐ ┌──────────┐                          │
│  │アラート   │ │月次レポ  │  Vercel Cron (P1)        │
│  │(P1)      │ │(P1)     │  → 毎月1日レポート生成    │
│  └──────────┘ └──────────┘                          │
└──────────────┬──────────────────────────────────────┘
               │ Supabase Client SDK
┌──────────────▼──────────────────────────────────────┐
│  Supabase                                            │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐                  │
│  │ Auth (P1)    │  │ Storage (P0) │                  │
│  │ メール認証   │  │ レシート画像  │                  │
│  │ 招待リンク   │  │ 月次PDF      │                  │
│  └─────────────┘  └──────────────┘                  │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ PostgreSQL Database                          │    │
│  │                                              │    │
│  │  Phase 0:                                    │    │
│  │  residents / accounts / transactions         │    │
│  │  receipts / csv_imports                      │    │
│  │                                              │    │
│  │  Phase 1 追加:                                │    │
│  │  user_profiles / guardianship_contracts      │    │
│  │  card_checkouts / alerts                     │    │
│  │  monthly_reports / contacts                  │    │
│  │                                              │    │
│  │  Phase 2+ 追加:                               │    │
│  │  purchase_requests / transfer_requests       │    │
│  │  audit_logs / rsw_assignments                │    │
│  │                                              │    │
│  │  RLS (P1): 全テーブルに行レベルアクセス制御    │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────┐                                    │
│  │ Edge Functions│  アラート検知 / レポート生成 (P1)   │
│  └──────────────┘                                    │
└──────────────────────────────────────────────────────┘

Phase 2+ 外部連携（将来）:
  - LINE Messaging API → 家族リアルタイム通知
  - Google Cloud Vision → レシートOCR
  - ESP32 BLE → スマートカードキャビネット
  - Expo → RSWモバイルアプリ
```

## データフロー

### CSV取込フロー（Phase 0）
```
freee → CSVエクスポート → ブラウザアップロード → csvParser.ts
→ カテゴリ自動推測 → transactions INSERT → accounts.current_balance UPDATE
```

### レシート撮影フロー（Phase 0）
```
スマホカメラ → <input capture> → Supabase Storage → receipts INSERT
→ transactions.receipt_id UPDATE
```

### カードチェックアウトフロー（Phase 1）
```
RSW → チェックアウト申請 → card_checkouts INSERT → タイマー開始
→ 24h超過で alerts INSERT → RSW/admin通知
→ RSW → チェックイン → card_checkouts.checked_in_at UPDATE
```

### 月次レポート生成フロー（Phase 1）
```
Vercel Cron（毎月1日 06:00）→ Edge Function
→ transactions集計（前月分）→ PDF生成 → Storage保存
→ monthly_reports INSERT → contacts通知（メール）
```

### アラート検知フロー（Phase 1）
```
Vercel Cron（毎時）→ Edge Function
→ card_checkouts チェック（24h未返却）
→ accounts チェック（残高不足）
→ transactions チェック（レシート未添付24h）
→ alerts INSERT
```
