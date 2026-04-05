import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  parseCSV,
  parseAmount,
  normalizeDate,
  parseCsvText,
  guessColumnMapping,
  mapRowsToTransactions,
} from "../csvParser";

describe("parseAmount", () => {
  it("カンマ区切りの金額をパース", () => {
    expect(parseAmount('"43,000"')).toBe(43000);
    expect(parseAmount("43,000")).toBe(43000);
  });

  it("通常の数値をパース", () => {
    expect(parseAmount("1280")).toBe(1280);
    expect(parseAmount("650")).toBe(650);
  });

  it("空文字・null・undefinedは0", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });
});

describe("normalizeDate", () => {
  it("YYYY/MM/DDをYYYY-MM-DDに変換", () => {
    expect(normalizeDate("2026/03/01")).toBe("2026-03-01");
  });

  it("YYYY-MM-DDはそのまま", () => {
    expect(normalizeDate("2026-03-01")).toBe("2026-03-01");
  });
});

describe("parseCsvText", () => {
  it("基本的なCSVをパース", () => {
    const csv = "日付,摘要,入金,出金,残高\n2026-03-01,家賃振込,,43000,107000";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["日付", "摘要", "入金", "出金", "残高"]);
    expect(rows).toHaveLength(1);
    expect(rows[0][1]).toBe("家賃振込");
  });

  it("BOM付きCSVを正しくパース", () => {
    const bom = "\uFEFF";
    const csv = `${bom}日付,摘要,入金,出金,残高\n2026-03-01,テスト,,1000,9000`;
    const { headers } = parseCsvText(csv);
    expect(headers[0]).toBe("日付");
  });

  it("メタ情報行をスキップ", () => {
    const csv =
      "freeeレポート\n期間: 2026年3月\n日付,摘要,入金,出金,残高\n2026-03-01,テスト,,1000,9000";
    const { headers, rows } = parseCsvText(csv);
    expect(headers[0]).toBe("日付");
    expect(rows).toHaveLength(1);
  });
});

describe("guessColumnMapping", () => {
  it("標準的なヘッダーを正しくマッピング", () => {
    const headers = ["日付", "摘要", "入金", "出金", "残高"];
    const mapping = guessColumnMapping(headers);
    expect(mapping.date).toBe(0);
    expect(mapping.description).toBe(1);
    expect(mapping.deposit).toBe(2);
    expect(mapping.withdrawal).toBe(3);
    expect(mapping.balance).toBe(4);
  });
});

describe("mapRowsToTransactions", () => {
  it("入金/出金分離形式を正しくパース", () => {
    const rows = [
      ["2026-03-01", "入金テスト", "150000", "", "150000"],
      ["2026-03-01", "出金テスト", "", "43000", "107000"],
    ];
    const mapping = {
      date: 0,
      description: 1,
      deposit: 2,
      withdrawal: 3,
      amount: null,
      balance: 4,
    };
    const txs = mapRowsToTransactions(rows, mapping);
    expect(txs).toHaveLength(2);
    expect(txs[0].amount).toBe(150000);
    expect(txs[0].description).toBe("入金テスト");
    expect(txs[1].amount).toBe(-43000);
    expect(txs[1].balance).toBe(107000);
  });

  it("不正な日付行をスキップ", () => {
    const rows = [
      ["invalid", "テスト", "", "1000", "9000"],
      ["2026-03-01", "テスト", "", "1000", "9000"],
    ];
    const mapping = {
      date: 0,
      description: 1,
      deposit: 2,
      withdrawal: 3,
      amount: null,
      balance: 4,
    };
    const txs = mapRowsToTransactions(rows, mapping);
    expect(txs).toHaveLength(1);
  });
});

describe("parseCSV（sample-csvファイル）", () => {
  it("tanaka_bank_202603.csvを正しくパース", () => {
    const csvPath = join(__dirname, "../../sample-csv/tanaka_bank_202603.csv");
    const csvText = readFileSync(csvPath, "utf-8");
    const { transactions } = parseCSV(csvText);

    expect(transactions.length).toBe(15);

    // 最初の行: 入金
    expect(transactions[0].date).toBe("2026-03-01");
    expect(transactions[0].description).toBe("自動定額振替（本体口座より）");
    expect(transactions[0].amount).toBe(150000);
    expect(transactions[0].balance).toBe(150000);

    // 2行目: 出金
    expect(transactions[1].description).toBe("家賃振込");
    expect(transactions[1].amount).toBe(-43000);
    expect(transactions[1].balance).toBe(107000);

    // 最終行
    const last = transactions[transactions.length - 1];
    expect(last.description).toBe("VISA デビット マツモトキヨシ 新宿店");
    expect(last.amount).toBe(-1580);
    expect(last.balance).toBe(38260);
  });

  it("suzuki_bank_202603.csvを正しくパース", () => {
    const csvPath = join(__dirname, "../../sample-csv/suzuki_bank_202603.csv");
    const csvText = readFileSync(csvPath, "utf-8");
    const { transactions } = parseCSV(csvText);

    expect(transactions.length).toBe(14);

    // 最初の行: 入金
    expect(transactions[0].amount).toBe(120000);

    // NHK受信料
    const nhk = transactions.find((t) => t.description.includes("NHK"));
    expect(nhk).toBeDefined();
    expect(nhk!.amount).toBe(-2170);

    // 最終行
    const last = transactions[transactions.length - 1];
    expect(last.balance).toBe(22220);
  });
});
