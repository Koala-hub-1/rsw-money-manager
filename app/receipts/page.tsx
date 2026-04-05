"use client";

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ステップ管理
type Step = "capture" | "form" | "candidates" | "manual" | "uploading" | "done";

interface CandidateTransaction {
  id: string;
  resident_id: string;
  account_id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  receipt_id: string | null;
  residents?: { name: string } | null;
}

export default function ReceiptsPage() {
  const [step, setStep] = useState<Step>("capture");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [receiptDate, setReceiptDate] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [candidates, setCandidates] = useState<CandidateTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<CandidateTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // カメラ撮影・ファイル選択
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      setStep("form");
      setError(null);
    },
    []
  );

  // 撮影リセット
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setStep("capture");
    setReceiptDate("");
    setReceiptAmount("");
    setCandidates([]);
    setAllTransactions([]);
    setError(null);
    setManualSearchQuery("");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  // 候補検索
  const handleSearch = useCallback(async () => {
    if (!receiptDate || !receiptAmount) {
      setError("日付と金額を入力してください");
      return;
    }

    const amount = parseInt(receiptAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("金額は正の整数で入力してください");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // 日付±1日の範囲を計算
      const baseDate = new Date(receiptDate);
      const dayBefore = new Date(baseDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(baseDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      // デビットカード取引で、レシート未添付、日付±1日、金額一致の候補を検索
      const { data, error: searchError } = await supabase
        .from("transactions")
        .select(
          `id, resident_id, account_id, transaction_date, description, amount, receipt_id,
           accounts!inner(account_type),
           residents(name)`
        )
        .eq("accounts.account_type", "debit_card")
        .is("receipt_id", null)
        .gte("transaction_date", formatDate(dayBefore))
        .lte("transaction_date", formatDate(dayAfter))
        .eq("amount", -amount) // 支出は負の値で格納
        .order("transaction_date", { ascending: false });

      if (searchError) throw searchError;

      const mapped = (data ?? []).map((t) => ({
        id: t.id,
        resident_id: t.resident_id,
        account_id: t.account_id,
        transaction_date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        receipt_id: t.receipt_id,
        residents: Array.isArray(t.residents) ? t.residents[0] as { name: string } | null : t.residents as { name: string } | null,
      }));

      setCandidates(mapped);

      if (mapped.length === 0) {
        setStep("candidates"); // 候補なし表示→手動選択へ遷移可能
      } else {
        setStep("candidates");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "検索中にエラーが発生しました"
      );
    } finally {
      setIsSearching(false);
    }
  }, [receiptDate, receiptAmount]);

  // 全デビット取引を取得（手動選択用）
  const handleShowAll = useCallback(async () => {
    setIsSearching(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select(
          `id, resident_id, account_id, transaction_date, description, amount, receipt_id,
           accounts!inner(account_type),
           residents(name)`
        )
        .eq("accounts.account_type", "debit_card")
        .is("receipt_id", null)
        .lt("amount", 0)
        .order("transaction_date", { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      const mapped = (data ?? []).map((t) => ({
        id: t.id,
        resident_id: t.resident_id,
        account_id: t.account_id,
        transaction_date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        receipt_id: t.receipt_id,
        residents: Array.isArray(t.residents) ? t.residents[0] as { name: string } | null : t.residents as { name: string } | null,
      }));

      setAllTransactions(mapped);
      setStep("manual");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "取引の取得に失敗しました"
      );
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 取引を選択してアップロード
  const handleSelectTransaction = useCallback(
    async (transactionId: string) => {
      if (!selectedFile) return;

      setStep("uploading");
      setError(null);

      try {
        // Storageにアップロード
        const ext = selectedFile.name.split(".").pop() ?? "jpg";
        const path = `${transactionId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(path, selectedFile);

        if (uploadError) throw uploadError;

        // receiptsテーブルにINSERT
        const { data: receipt, error: insertError } = await supabase
          .from("receipts")
          .insert({ image_path: path })
          .select()
          .single();

        if (insertError) throw insertError;

        // transactionsのreceipt_idを更新
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ receipt_id: receipt.id })
          .eq("id", transactionId);

        if (updateError) throw updateError;

        setStep("done");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "アップロードに失敗しました"
        );
        setStep("candidates");
      }
    },
    [selectedFile]
  );

  // 手動選択のフィルタリング
  const filteredTransactions = allTransactions.filter((t) => {
    if (!manualSearchQuery) return true;
    const q = manualSearchQuery.toLowerCase();
    return (
      t.description?.toLowerCase().includes(q) ||
      t.transaction_date.includes(q) ||
      t.residents?.name.toLowerCase().includes(q) ||
      Math.abs(t.amount).toString().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">レシート撮影</h1>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ステップ1: カメラ撮影 */}
      {step === "capture" && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50">
          <svg
            className="mb-2 h-10 w-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-600">
            レシートを撮影
          </span>
          <span className="mt-1 text-xs text-gray-400">
            タップしてカメラを起動
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}

      {/* ステップ2: プレビュー＋日付・金額入力フォーム */}
      {step === "form" && preview && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="レシートプレビュー"
              className="max-h-[300px] w-full object-contain"
            />
            <button
              onClick={handleReset}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              aria-label="撮り直す"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="receipt-date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                日付
              </label>
              <input
                id="receipt-date"
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="receipt-amount"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                金額（円）
              </label>
              <input
                id="receipt-amount"
                type="number"
                inputMode="numeric"
                min="1"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                placeholder="例: 1500"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isSearching || !receiptDate || !receiptAmount}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSearching ? "検索中..." : "取引を検索"}
          </button>
        </div>
      )}

      {/* ステップ3: 候補表示 */}
      {step === "candidates" && (
        <div className="space-y-4">
          {/* プレビュー（小さく表示） */}
          {preview && (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="レシート"
                className="max-h-[120px] w-full object-contain"
              />
            </div>
          )}

          <div className="text-sm text-gray-600">
            検索条件: {receiptDate} / ¥{parseInt(receiptAmount, 10).toLocaleString()}
          </div>

          {candidates.length > 0 ? (
            <>
              <p className="text-sm font-medium text-gray-700">
                {candidates.length}件の候補が見つかりました
              </p>
              <div className="space-y-2">
                {candidates.map((t) => (
                  <TransactionCard
                    key={t.id}
                    transaction={t}
                    onSelect={handleSelectTransaction}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
              条件に一致する取引が見つかりませんでした
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleShowAll}
              disabled={isSearching}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:bg-gray-100"
            >
              {isSearching ? "読込中..." : "全取引から選択"}
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              撮り直す
            </button>
          </div>
        </div>
      )}

      {/* ステップ4: 手動選択（全デビット取引一覧） */}
      {step === "manual" && (
        <div className="space-y-4">
          {preview && (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="レシート"
                className="max-h-[120px] w-full object-contain"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualSearchQuery}
              onChange={(e) => setManualSearchQuery(e.target.value)}
              placeholder="取引を検索（名前・摘要・金額・日付）"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => setStep("candidates")}
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              戻る
            </button>
          </div>

          <p className="text-xs text-gray-500">
            レシート未添付のデビットカード取引（最新100件）
          </p>

          {filteredTransactions.length > 0 ? (
            <div className="space-y-2">
              {filteredTransactions.map((t) => (
                <TransactionCard
                  key={t.id}
                  transaction={t}
                  onSelect={handleSelectTransaction}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
              該当する取引がありません
            </div>
          )}
        </div>
      )}

      {/* アップロード中 */}
      {step === "uploading" && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-600">アップロード中...</p>
        </div>
      )}

      {/* 完了 */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 p-6 text-center">
            <svg
              className="mx-auto mb-2 h-10 w-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm font-medium text-green-700">
              レシートを保存しました
            </p>
          </div>
          <button
            onClick={handleReset}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            次のレシートを撮影
          </button>
        </div>
      )}
    </div>
  );
}

// 取引カードコンポーネント
function TransactionCard({
  transaction,
  onSelect,
}: {
  transaction: CandidateTransaction;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(transaction.id)}
      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">
            {transaction.description || "摘要なし"}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {transaction.transaction_date}
            {transaction.residents?.name && (
              <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {transaction.residents.name}
              </span>
            )}
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold text-red-600">
          ¥{Math.abs(transaction.amount).toLocaleString()}
        </p>
      </div>
    </button>
  );
}
