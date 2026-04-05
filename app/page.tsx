"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Resident, Account, Transaction, CardCheckout, Alert } from "@/lib/types";
import ResidentCard from "@/components/ResidentCard";

interface ResidentData {
  resident: Resident;
  accounts: Account[];
  recentTransactions: Transaction[];
}

interface ActiveCheckout extends CardCheckout {
  accountLabel: string;
  residentName: string;
}

export default function Dashboard() {
  const [data, setData] = useState<ResidentData[]>([]);
  const [activeCheckouts, setActiveCheckouts] = useState<ActiveCheckout[]>([]);
  const [unresolvedAlertCount, setUnresolvedAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // タイマー更新
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createSupabaseBrowser();

        const [residentsRes, checkoutsRes, alertsRes] = await Promise.all([
          supabase
            .from("residents")
            .select("*")
            .eq("status", "active")
            .order("name"),
          supabase
            .from("card_checkouts")
            .select("*, accounts(label, residents(name))")
            .is("checked_in_at", null)
            .order("checked_out_at", { ascending: false }),
          supabase
            .from("alerts")
            .select("id", { count: "exact", head: true })
            .eq("is_resolved", false),
        ]);

        const residents = residentsRes.data ?? [];
        setUnresolvedAlertCount(alertsRes.count ?? 0);

        // 未返却カード
        const checkouts = (checkoutsRes.data ?? []).map((co) => ({
          ...co,
          accountLabel:
            (co.accounts as { label: string } | null)?.label ?? "カード",
          residentName:
            (co.accounts as { residents?: { name: string } } | null)?.residents
              ?.name ?? "不明",
        }));
        setActiveCheckouts(checkouts);

        const result: ResidentData[] = [];
        for (const resident of residents) {
          const [accountsRes, transactionsRes] = await Promise.all([
            supabase
              .from("accounts")
              .select("*")
              .eq("resident_id", resident.id),
            supabase
              .from("transactions")
              .select("*")
              .eq("resident_id", resident.id)
              .order("transaction_date", { ascending: false })
              .limit(3),
          ]);

          result.push({
            resident,
            accounts: accountsRes.data ?? [],
            recentTransactions: transactionsRes.data ?? [],
          });
        }

        setData(result);
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function formatElapsed(checkedOutAt: string): string {
    const elapsed = now - new Date(checkedOutAt).getTime();
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    if (hours > 0) return `${hours}時間${minutes}分`;
    return `${minutes}分`;
  }

  function isOverdue(checkedOutAt: string): boolean {
    return now - new Date(checkedOutAt).getTime() > 24 * 3600000;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>

      {/* アラートバッジ */}
      {unresolvedAlertCount > 0 && (
        <a
          href="/alerts"
          className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 hover:bg-red-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-red-700">
              未解決のアラートがあります
            </p>
            <p className="text-xs text-red-500">
              {unresolvedAlertCount}件のアラートを確認してください
            </p>
          </div>
          <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
            {unresolvedAlertCount}
          </span>
        </a>
      )}

      {/* 未返却カード一覧 */}
      {activeCheckouts.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-orange-700">
              持出中のカード ({activeCheckouts.length})
            </h2>
            <a
              href="/checkout"
              className="text-xs text-orange-600 hover:text-orange-800"
            >
              カード管理へ
            </a>
          </div>
          <div className="space-y-2">
            {activeCheckouts.map((co) => (
              <div
                key={co.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  isOverdue(co.checked_out_at) ? "bg-red-100" : "bg-white"
                }`}
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {co.residentName}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    {co.accountLabel}
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    isOverdue(co.checked_out_at)
                      ? "text-red-600"
                      : "text-orange-600"
                  }`}
                >
                  {formatElapsed(co.checked_out_at)}
                  {isOverdue(co.checked_out_at) && " (超過)"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 入居者カード */}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((d) => (
          <ResidentCard
            key={d.resident.id}
            resident={d.resident}
            accounts={d.accounts}
            recentTransactions={d.recentTransactions}
          />
        ))}
      </div>
      {data.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            入居者データがありません。CSVを取り込んでください。
          </p>
        </div>
      )}
    </div>
  );
}
