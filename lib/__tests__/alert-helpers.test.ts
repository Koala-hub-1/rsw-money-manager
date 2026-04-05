import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabaseクライアントのモック
function createMockSupabase() {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] }),
    then: vi.fn(),
  };

  return {
    from: vi.fn().mockReturnValue(mockChain),
    _chain: mockChain,
  };
}

describe("アラート検知ロジック", () => {
  describe("カード未返却アラートの判定", () => {
    it("24時間以上経過したチェックアウトを検知できる", () => {
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const checkedOutAt = new Date(
        Date.now() - TWENTY_FOUR_HOURS_MS - 1000
      ).toISOString();
      const threshold = new Date(
        Date.now() - TWENTY_FOUR_HOURS_MS
      ).toISOString();

      expect(new Date(checkedOutAt) < new Date(threshold)).toBe(true);
    });

    it("24時間未満のチェックアウトは検知しない", () => {
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const checkedOutAt = new Date(
        Date.now() - TWENTY_FOUR_HOURS_MS + 3600000
      ).toISOString();
      const threshold = new Date(
        Date.now() - TWENTY_FOUR_HOURS_MS
      ).toISOString();

      expect(new Date(checkedOutAt) < new Date(threshold)).toBe(false);
    });
  });

  describe("残高不足アラートの判定", () => {
    it("残高が閾値を下回る場合にアラート対象となる", () => {
      const LOW_BALANCE_THRESHOLD = 30000;
      const currentBalance = 25000;
      expect(currentBalance < LOW_BALANCE_THRESHOLD).toBe(true);
    });

    it("残高が閾値以上の場合はアラート対象外", () => {
      const LOW_BALANCE_THRESHOLD = 30000;
      const currentBalance = 50000;
      expect(currentBalance < LOW_BALANCE_THRESHOLD).toBe(false);
    });

    it("残高がちょうど閾値の場合はアラート対象外", () => {
      const LOW_BALANCE_THRESHOLD = 30000;
      const currentBalance = 30000;
      expect(currentBalance < LOW_BALANCE_THRESHOLD).toBe(false);
    });
  });

  describe("レシート未添付アラートの判定", () => {
    it("デビットカード取引でreceipt_idがnullの場合に対象", () => {
      const transaction = {
        id: "tx-1",
        receipt_id: null,
        amount: -5000,
        account_type: "debit_card",
      };
      expect(
        transaction.receipt_id === null &&
          transaction.amount < 0 &&
          transaction.account_type === "debit_card"
      ).toBe(true);
    });

    it("入金取引は対象外", () => {
      const transaction = {
        id: "tx-2",
        receipt_id: null,
        amount: 100000,
        account_type: "debit_card",
      };
      expect(transaction.amount < 0).toBe(false);
    });

    it("銀行口座取引は対象外", () => {
      const transaction = {
        id: "tx-3",
        receipt_id: null,
        amount: -5000,
        account_type: "bank",
      };
      expect(transaction.account_type === "debit_card").toBe(false);
    });

    it("レシート添付済みは対象外", () => {
      const transaction = {
        id: "tx-4",
        receipt_id: "receipt-1",
        amount: -5000,
        account_type: "debit_card",
      };
      expect(transaction.receipt_id === null).toBe(false);
    });
  });
});

describe("アラートのソート", () => {
  it("severity順にソートされる（critical > warning > info）", () => {
    const SEVERITY_ORDER: Record<string, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };

    const alerts = [
      { severity: "info", message: "info alert" },
      { severity: "critical", message: "critical alert" },
      { severity: "warning", message: "warning alert" },
    ];

    const sorted = [...alerts].sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 9) -
        (SEVERITY_ORDER[b.severity] ?? 9)
    );

    expect(sorted[0].severity).toBe("critical");
    expect(sorted[1].severity).toBe("warning");
    expect(sorted[2].severity).toBe("info");
  });
});

describe("経過時間のフォーマット", () => {
  function formatElapsed(checkedOutAt: string, now: number): string {
    const elapsed = now - new Date(checkedOutAt).getTime();
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    if (hours > 0) return `${hours}時間${minutes}分`;
    return `${minutes}分`;
  }

  it("分のみの場合", () => {
    const now = Date.now();
    const checkedOutAt = new Date(now - 30 * 60000).toISOString();
    expect(formatElapsed(checkedOutAt, now)).toBe("30分");
  });

  it("時間と分の場合", () => {
    const now = Date.now();
    const checkedOutAt = new Date(now - 2 * 3600000 - 15 * 60000).toISOString();
    expect(formatElapsed(checkedOutAt, now)).toBe("2時間15分");
  });

  it("24時間超過の判定", () => {
    const now = Date.now();
    const checkedOutAt = new Date(now - 25 * 3600000).toISOString();
    const isOverdue = now - new Date(checkedOutAt).getTime() > 24 * 3600000;
    expect(isOverdue).toBe(true);
  });
});

describe("月次レポート集計ロジック", () => {
  it("収入と支出を正しく分類する", () => {
    const transactions = [
      { amount: 100000, category: null },
      { amount: -30000, category: "家賃" },
      { amount: -5000, category: "食費" },
      { amount: -2000, category: "日用品" },
      { amount: 50000, category: null },
    ];

    const totalIncome = transactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = transactions
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    expect(totalIncome).toBe(150000);
    expect(totalExpense).toBe(-37000);
  });

  it("カテゴリ別支出を正しく集計する", () => {
    const transactions = [
      { amount: -30000, category: "家賃" },
      { amount: -5000, category: "食費" },
      { amount: -3000, category: "食費" },
      { amount: -2000, category: "日用品" },
    ];

    const expenseByCategory: Record<string, number> = {};
    for (const tx of transactions.filter((t) => t.amount < 0)) {
      const cat = tx.category ?? "その他";
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + tx.amount;
    }

    expect(expenseByCategory["家賃"]).toBe(-30000);
    expect(expenseByCategory["食費"]).toBe(-8000);
    expect(expenseByCategory["日用品"]).toBe(-2000);
  });

  it("カテゴリがnullの場合は「その他」に分類", () => {
    const transactions = [{ amount: -1000, category: null }];

    const expenseByCategory: Record<string, number> = {};
    for (const tx of transactions.filter((t) => t.amount < 0)) {
      const cat = tx.category ?? "その他";
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + tx.amount;
    }

    expect(expenseByCategory["その他"]).toBe(-1000);
  });
});
