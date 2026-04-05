"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import type {
  Resident,
  Account,
  Transaction,
  Alert,
  MonthlyReport,
} from "@/lib/types";

interface PortalData {
  resident: Resident;
  accounts: Account[];
  recentTransactions: Transaction[];
  unresolvedAlerts: Alert[];
  reports: MonthlyReport[];
}

export default function PortalPage() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<PortalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResident, setSelectedResident] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!user) return;
    const supabase = createSupabaseBrowser();

    // contactsから自分が閲覧可能な入居者を取得
    const { data: contacts } = await supabase
      .from("contacts")
      .select("resident_id")
      .eq("user_id", user.id);

    const residentIds = contacts?.map((c) => c.resident_id) ?? [];
    if (residentIds.length === 0) {
      setLoading(false);
      return;
    }

    const results: PortalData[] = [];
    for (const residentId of residentIds) {
      const [residentRes, accountsRes, transactionsRes, alertsRes, reportsRes] =
        await Promise.all([
          supabase.from("residents").select("*").eq("id", residentId).single(),
          supabase.from("accounts").select("*").eq("resident_id", residentId),
          supabase
            .from("transactions")
            .select("*")
            .eq("resident_id", residentId)
            .order("transaction_date", { ascending: false })
            .limit(10),
          supabase
            .from("alerts")
            .select("*")
            .eq("resident_id", residentId)
            .eq("is_resolved", false)
            .order("created_at", { ascending: false }),
          supabase
            .from("monthly_reports")
            .select("*")
            .eq("resident_id", residentId)
            .order("year_month", { ascending: false })
            .limit(6),
        ]);

      if (residentRes.data) {
        results.push({
          resident: residentRes.data,
          accounts: accountsRes.data ?? [],
          recentTransactions: transactionsRes.data ?? [],
          unresolvedAlerts: alertsRes.data ?? [],
          reports: (reportsRes.data ?? []) as MonthlyReport[],
        });
      }
    }

    setData(results);
    if (results.length > 0) {
      setSelectedResident(results[0].resident.id);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const current = data.find((d) => d.resident.id === selectedResident);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">ポータル</h1>
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
          閲覧可能な入居者情報がありません。管理者に連絡してください。
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {profile?.role === "family" ? "家族ポータル" : "後見監督人ポータル"}
        </h1>
        {data.length > 1 && (
          <select
            value={selectedResident}
            onChange={(e) => setSelectedResident(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {data.map((d) => (
              <option key={d.resident.id} value={d.resident.id}>
                {d.resident.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {current && (
        <>
          {/* 残高 */}
          <div className="grid gap-4 sm:grid-cols-2">
            {current.accounts.map((acc) => (
              <div
                key={acc.id}
                className={`rounded-xl p-4 ${
                  acc.account_type === "bank"
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                <p className="text-xs text-gray-600">{acc.label}</p>
                <p
                  className={`text-xl font-bold ${
                    acc.account_type === "bank"
                      ? "text-blue-700"
                      : "text-green-700"
                  }`}
                >
                  ¥
                  {new Intl.NumberFormat("ja-JP").format(acc.current_balance)}
                </p>
              </div>
            ))}
          </div>

          {/* アラート */}
          {current.unresolvedAlerts.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-red-700">
                未解決アラート ({current.unresolvedAlerts.length})
              </h2>
              <div className="space-y-2">
                {current.unresolvedAlerts.map((alert) => (
                  <div key={alert.id} className="text-sm text-red-600">
                    {alert.message}
                    <span className="ml-2 text-xs text-red-400">
                      {new Date(alert.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 直近取引 */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-600">
              直近の取引
            </h2>
            <div className="space-y-2">
              {current.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm text-gray-900">
                      {tx.description ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.transaction_date}
                      {tx.category && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                          {tx.category}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      tx.amount >= 0 ? "text-blue-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}¥
                    {new Intl.NumberFormat("ja-JP").format(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
              {current.recentTransactions.length === 0 && (
                <p className="text-sm text-gray-500">取引データがありません</p>
              )}
            </div>
          </div>

          {/* 月次レポート */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-600">
              月次レポート
            </h2>
            {current.reports.length === 0 ? (
              <p className="text-sm text-gray-500">
                レポートがまだ生成されていません
              </p>
            ) : (
              <div className="space-y-2">
                {current.reports.map((report) => (
                  <a
                    key={report.id}
                    href={`/residents/${current.resident.id}/reports`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 hover:bg-gray-100"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {report.year_month}
                    </span>
                    <span className="text-xs text-blue-600">
                      詳細・PDF
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
