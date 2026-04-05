// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReceiptsPage from "../page";

// Supabaseモック
const mockSelect = vi.fn();
const mockUpload = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "transactions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      order: vi.fn(() => mockSelect()),
                    })),
                  })),
                })),
                lt: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => mockSelect()),
                  })),
                })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => mockUpdate()),
          })),
        };
      }
      if (table === "receipts") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => mockInsert()),
            })),
          })),
        };
      }
      return {};
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => mockUpload()),
      })),
    },
  },
}));

// jsdomではFileReaderが動作しないためモック
const originalFileReader = globalThis.FileReader;

beforeEach(() => {
  vi.clearAllMocks();
  // FileReaderのモック
  globalThis.FileReader = class {
    result = "data:image/jpeg;base64,test";
    onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
    readAsDataURL() {
      setTimeout(() => {
        if (this.onload) {
          this.onload({ target: { result: this.result } } as ProgressEvent<FileReader>);
        }
      }, 0);
    }
  } as unknown as typeof FileReader;
});

describe("ReceiptsPage", () => {
  it("初期状態でカメラ撮影UIが表示される", () => {
    render(<ReceiptsPage />);
    expect(screen.getByText("レシートを撮影")).toBeDefined();
    expect(screen.getByText("タップしてカメラを起動")).toBeDefined();
  });

  it("タイトルが表示される", () => {
    render(<ReceiptsPage />);
    expect(screen.getByText("レシート撮影")).toBeDefined();
  });

  it("ファイル選択後にフォームが表示される", async () => {
    render(<ReceiptsPage />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.accept).toBe("image/*");
    expect(input.getAttribute("capture")).toBe("environment");

    const file = new File(["dummy"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("日付")).toBeDefined();
      expect(screen.getByText("金額（円）")).toBeDefined();
      expect(screen.getByText("取引を検索")).toBeDefined();
    });
  });

  it("日付・金額未入力で検索ボタンがdisabled", async () => {
    render(<ReceiptsPage />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const searchButton = screen.getByText("取引を検索");
      expect(searchButton.closest("button")?.disabled).toBe(true);
    });
  });

  it("候補が見つかった場合にカード表示される", async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        {
          id: "tx-1",
          resident_id: "r-1",
          account_id: "a-1",
          transaction_date: "2026-04-05",
          description: "コンビニ",
          amount: -500,
          receipt_id: null,
          residents: { name: "田中太郎" },
        },
      ],
      error: null,
    });

    render(<ReceiptsPage />);

    // ファイル選択
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("日付")).toBeDefined();
    });

    // フォーム入力
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    const amountInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-04-05" } });
    fireEvent.change(amountInput, { target: { value: "500" } });

    // 検索
    fireEvent.click(screen.getByText("取引を検索"));

    await waitFor(() => {
      expect(screen.getByText("1件の候補が見つかりました")).toBeDefined();
      expect(screen.getByText("コンビニ")).toBeDefined();
      expect(screen.getByText("¥500")).toBeDefined();
      expect(screen.getByText("田中太郎")).toBeDefined();
    });
  });

  it("候補がない場合にメッセージが表示される", async () => {
    mockSelect.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    render(<ReceiptsPage />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("日付")).toBeDefined();
    });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    const amountInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-04-05" } });
    fireEvent.change(amountInput, { target: { value: "999" } });

    fireEvent.click(screen.getByText("取引を検索"));

    await waitFor(() => {
      expect(
        screen.getByText("条件に一致する取引が見つかりませんでした")
      ).toBeDefined();
      expect(screen.getByText("全取引から選択")).toBeDefined();
    });
  });
});
