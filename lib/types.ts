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
