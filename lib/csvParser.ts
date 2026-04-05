import Papa from "papaparse";
import type { ParsedTransaction, ColumnMapping } from "./types";

// BOM除去
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// ヘッダー行を自動検出（日付・摘要などのキーワードを含む行）
const HEADER_KEYWORDS = ["日付", "摘要", "入金", "出金", "残高", "金額", "取引"];

function findHeaderRowIndex(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const matchCount = HEADER_KEYWORDS.filter((kw) =>
      lines[i].includes(kw)
    ).length;
    if (matchCount >= 2) return i;
  }
  return 0;
}

// 金額文字列をパース（カンマ除去、空文字は0）
export function parseAmount(value: string | undefined | null): number {
  if (!value || value.trim() === "") return 0;
  const cleaned = value.replace(/[",\s]/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// 日付を正規化（YYYY/MM/DD → YYYY-MM-DD）
export function normalizeDate(dateStr: string): string {
  return dateStr.trim().replace(/\//g, "-");
}

// 日付フォーマットの検証
function isValidDate(dateStr: string): boolean {
  const normalized = normalizeDate(dateStr);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized);
}

// CSVテキストをパースしてヘッダーとデータ行を返す
export function parseCsvText(csvText: string): {
  headers: string[];
  rows: string[][];
} {
  const cleaned = stripBom(csvText);
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim() !== "");
  const headerIndex = findHeaderRowIndex(lines);

  // ヘッダー以降のテキストを再結合してPapaParseでパース
  const dataText = lines.slice(headerIndex).join("\n");
  const result = Papa.parse<string[]>(dataText, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.data.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = result.data[0];
  const rows = result.data.slice(1);
  return { headers, rows };
}

// カラムマッピングの自動推測
export function guessColumnMapping(headers: string[]): ColumnMapping {
  let dateCol = -1;
  let descCol = -1;
  let depositCol: number | null = null;
  let withdrawalCol: number | null = null;
  let amountCol: number | null = null;
  let balanceCol: number | null = null;

  headers.forEach((h, i) => {
    const header = h.trim();
    if (header.includes("日付")) dateCol = i;
    if (header.includes("摘要") || header.includes("取引先")) descCol = i;
    if (header.includes("入金") || header === "収入") depositCol = i;
    if (header.includes("出金") || header === "支出") withdrawalCol = i;
    if (header === "金額" || header === "取引金額") amountCol = i;
    if (header.includes("残高")) balanceCol = i;
  });

  // dateColが見つからない場合は最初のカラム
  if (dateCol === -1) dateCol = 0;
  // descColが見つからない場合は2番目のカラム
  if (descCol === -1) descCol = Math.min(1, headers.length - 1);

  return {
    date: dateCol,
    description: descCol,
    deposit: depositCol,
    withdrawal: withdrawalCol,
    amount: amountCol,
    balance: balanceCol,
  };
}

// カラムマッピングを使ってデータ行をトランザクションに変換
export function mapRowsToTransactions(
  rows: string[][],
  mapping: ColumnMapping
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const dateStr = row[mapping.date];
    if (!dateStr || !isValidDate(dateStr)) continue;

    const description = row[mapping.description]?.trim() ?? "";
    let amount = 0;

    if (mapping.deposit !== null && mapping.withdrawal !== null) {
      // 入金/出金が分離されている場合
      const deposit = parseAmount(row[mapping.deposit]);
      const withdrawal = parseAmount(row[mapping.withdrawal]);
      // 入金は正、出金は負
      amount = deposit > 0 ? deposit : -withdrawal;
    } else if (mapping.amount !== null) {
      // 正負1列の場合
      amount = parseAmount(row[mapping.amount]);
    }

    const balance =
      mapping.balance !== null ? parseAmount(row[mapping.balance]) : null;

    transactions.push({
      date: normalizeDate(dateStr),
      description,
      amount,
      balance,
      rawLine: row.join(","),
    });
  }

  return transactions;
}

// メインのパース関数
export function parseCSV(csvText: string): {
  headers: string[];
  rows: string[][];
  mapping: ColumnMapping;
  transactions: ParsedTransaction[];
} {
  const { headers, rows } = parseCsvText(csvText);
  const mapping = guessColumnMapping(headers);
  const transactions = mapRowsToTransactions(rows, mapping);
  return { headers, rows, mapping, transactions };
}
