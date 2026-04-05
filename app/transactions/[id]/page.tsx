"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Transaction, Account, Receipt } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import CategoryBadge from "@/components/CategoryBadge";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

export default function TransactionDetail() {
  const params = useParams();
  const router = useRouter();
  const txId = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    async function fetchData() {
      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", txId)
        .single();

      if (!tx) {
        setLoading(false);
        return;
      }

      setTransaction(tx);
      setCategory(tx.category ?? "その他");

      const { data: acc } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", tx.account_id)
        .single();
      setAccount(acc);

      // レシート取得
      if (tx.receipt_id) {
        const { data: rec } = await supabase
          .from("receipts")
          .select("*")
          .eq("id", tx.receipt_id)
          .single();
        if (rec) {
          setReceipt(rec);
          setMemo(rec.memo ?? "");
          const { data: urlData } = supabase.storage
            .from("receipts")
            .getPublicUrl(rec.image_path);
          setReceiptUrl(urlData.publicUrl);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [txId]);

  const handleCategoryChange = async (newCategory: string) => {
    setCategory(newCategory);
    setSaving(true);
    await supabase
      .from("transactions")
      .update({ category: newCategory })
      .eq("id", txId);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!transaction) {
    return <p className="py-20 text-center text-gray-500">取引が見つかりません</p>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        戻る
      </button>

      {/* 取引情報 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="mb-4 text-lg font-bold text-gray-900">取引詳細</h1>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">日付</span>
            <span className="text-sm font-medium">{transaction.transaction_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">摘要</span>
            <span className="text-sm font-medium">{transaction.description}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">金額</span>
            <span
              className={`text-lg font-bold ${transaction.amount > 0 ? "text-blue-600" : "text-red-600"}`}
            >
              {transaction.amount > 0 ? "+" : ""}¥
              {formatCurrency(Math.abs(transaction.amount))}
            </span>
          </div>
          {account && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">口座</span>
              <span className="text-sm">{account.label}</span>
            </div>
          )}
          {transaction.balance_after !== null && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">取引後残高</span>
              <span className="text-sm">
                ¥{formatCurrency(transaction.balance_after)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* カテゴリ */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-gray-700">カテゴリ</h2>
        <div className="flex items-center gap-3">
          <CategoryBadge category={category} />
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={saving}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* レシート */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-gray-700">レシート</h2>
        {receipt && receiptUrl ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptUrl}
              alt="レシート"
              className="max-h-[300px] rounded-lg object-contain"
            />
            {receipt.memo && (
              <p className="text-sm text-gray-600">{receipt.memo}</p>
            )}
          </div>
        ) : (
          <a
            href={`/receipts/new?transaction_id=${txId}`}
            className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600"
          >
            レシートを追加
          </a>
        )}
      </div>

      {/* メモ */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-gray-700">メモ</h2>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモを入力"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={3}
        />
      </div>
    </div>
  );
}
