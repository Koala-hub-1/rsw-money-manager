"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Resident, Account, Transaction, AccountType } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import TransactionList from "@/components/TransactionList";
import SpendingChart from "@/components/SpendingChart";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

export default function ResidentDetail() {
  const params = useParams();
  const residentId = params.id as string;

  const [resident, setResident] = useState<Resident | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // フィルタ
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedAccountType, setSelectedAccountType] = useState<
    AccountType | "all"
  >("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      const [residentRes, accountsRes, txRes] = await Promise.all([
        supabase.from("residents").select("*").eq("id", residentId).single(),
        supabase.from("accounts").select("*").eq("resident_id", residentId),
        supabase
          .from("transactions")
          .select("*")
          .eq("resident_id", residentId)
          .order("transaction_date", { ascending: false }),
      ]);

      setResident(residentRes.data);
      setAccounts(accountsRes.data ?? []);
      setTransactions(txRes.data ?? []);
      setLoading(false);
    }

    fetchData();
  }, [residentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!resident) {
    return <p className="py-20 text-center text-gray-500">入居者が見つかりません</p>;
  }

  const bankAccount = accounts.find((a) => a.account_type === "bank");
  const debitAccount = accounts.find((a) => a.account_type === "debit_card");

  // フィルタリング
  const filteredTransactions = transactions.filter((tx) => {
    const txMonth = tx.transaction_date.slice(0, 7);
    if (txMonth !== selectedMonth) return false;

    if (selectedAccountType !== "all") {
      const account = accounts.find((a) => a.id === tx.account_id);
      if (account && account.account_type !== selectedAccountType) return false;
    }

    if (selectedCategory !== "all" && tx.category !== selectedCategory)
      return false;

    return true;
  });

  // 月間支出合計
  const monthlySpending = filteredTransactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  // 年月リスト生成
  const months = [
    ...new Set(transactions.map((tx) => tx.transaction_date.slice(0, 7))),
  ].sort().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{resident.name}</h1>
        {resident.name_kana && (
          <p className="text-sm text-gray-400">{resident.name_kana}</p>
        )}
      </div>

      {/* 残高サマリ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-xs text-gray-500">銀行口座</p>
          <p className="text-xl font-bold text-blue-700">
            ¥{formatCurrency(bankAccount?.current_balance ?? 0)}
          </p>
          <p className="text-xs text-gray-400">{bankAccount?.label}</p>
        </div>
        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-xs text-gray-500">デビット</p>
          <p className="text-xl font-bold text-green-700">
            ¥{formatCurrency(debitAccount?.current_balance ?? 0)}
          </p>
          <p className="text-xs text-gray-400">{debitAccount?.label}</p>
        </div>
      </div>

      {/* 月間支出 */}
      <div className="rounded-xl bg-red-50 p-4">
        <p className="text-xs text-gray-500">
          月間支出（{selectedMonth}）
        </p>
        <p className="text-2xl font-bold text-red-700">
          ¥{formatCurrency(monthlySpending)}
        </p>
      </div>

      {/* 支出内訳グラフ */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-700">
          カテゴリ別支出内訳
        </h2>
        <SpendingChart transactions={filteredTransactions} />
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={selectedAccountType}
          onChange={(e) =>
            setSelectedAccountType(e.target.value as AccountType | "all")
          }
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="all">全口座</option>
          <option value="bank">銀行口座</option>
          <option value="debit_card">デビットカード</option>
        </select>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="all">全カテゴリ</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* 取引一覧 */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-medium text-gray-700">取引明細</h2>
        </div>
        <TransactionList transactions={filteredTransactions} />
      </div>
    </div>
  );
}
