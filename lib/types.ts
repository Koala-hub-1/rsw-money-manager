export type AccountType = "bank" | "debit_card";

export interface Resident {
  id: string;
  name: string;
  name_kana: string | null;
  status: string;
  created_at: string;
}

export interface Account {
  id: string;
  resident_id: string;
  account_type: AccountType;
  label: string;
  current_balance: number;
  last_updated: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  resident_id: string;
  account_id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  balance_after: number | null;
  category: string | null;
  receipt_id: string | null;
  raw_csv_line: string | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  image_path: string;
  memo: string | null;
  uploaded_at: string;
}

export interface CsvImport {
  id: string;
  resident_id: string;
  account_id: string;
  file_name: string | null;
  row_count: number | null;
  imported_at: string;
}

// CSVパーサーで使う型
export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  rawLine: string;
}

export interface ColumnMapping {
  date: number;
  description: number;
  deposit: number | null;
  withdrawal: number | null;
  amount: number | null;
  balance: number | null;
}

// カテゴリ定義
export const CATEGORIES = [
  "家賃",
  "共益費",
  "食費",
  "日用品",
  "医療",
  "交通",
  "娯楽",
  "光熱費",
  "通信",
  "その他",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Phase 1: ユーザーロール
export type UserRole = "rsw" | "admin" | "supervisor" | "family";

// Phase 1: ユーザープロファイル
export interface UserProfile {
  id: string;
  role: UserRole;
  facility_id: string | null;
  name: string;
  phone: string | null;
  created_at: string;
}

// Phase 1: 任意後見契約
export interface GuardianshipContract {
  id: string;
  resident_id: string;
  notarial_deed_number: string | null;
  rsw_user_id: string | null;
  supervisor_user_id: string | null;
  proxy_scope: string | null;
  monthly_transfer_limit: number | null;
  per_transaction_limit_physical: number | null;
  per_transaction_limit_online: number | null;
  start_date: string | null;
  status: "active" | "terminated";
  created_at: string;
}

// Phase 1: カードチェックアウト
export interface CardCheckout {
  id: string;
  card_id: string;
  rsw_user_id: string;
  checked_out_at: string;
  checked_in_at: string | null;
  purpose: string | null;
  created_at: string;
}

// Phase 1: アラート
export type AlertType = "card_unreturned" | "low_balance" | "receipt_missing";
export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  resident_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  related_transaction_id: string | null;
  related_checkout_id: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// Phase 1: 月次レポート
export interface MonthlyReport {
  id: string;
  resident_id: string;
  year_month: string;
  total_income: number | null;
  total_expense: number | null;
  expense_by_category: Record<string, number> | null;
  ending_balance: number | null;
  alert_count: number;
  pdf_path: string | null;
  generated_at: string;
}

// Phase 1: 連絡先
export type ContactRole = "family" | "supervisor" | "emergency";

export interface Contact {
  id: string;
  resident_id: string;
  user_id: string | null;
  role: ContactRole;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  notify_realtime: boolean;
  notify_monthly: boolean;
  created_at: string;
}

// Phase 1: 招待
export interface Invitation {
  id: string;
  resident_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

// Phase 1: 入居者拡張フィールド
export interface ResidentExtended extends Resident {
  birth_date: string | null;
  gender: string | null;
  care_level: string | null;
  health_notes: string | null;
  move_in_date: string | null;
  has_family: boolean;
  updated_at: string | null;
}
