"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { MonthlyReport, Resident } from "@/lib/types";
import dynamic from "next/dynamic";

// PDFコンポーネントはクライアントのみで動的読み込み
const PDFDownloadButton = dynamic(
  () => import("@/components/PDFDownloadButton"),
  { ssr: false }
);

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  const [resident, setResident] = useState<Resident | null>(null);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowser();

      const [residentRes, reportsRes] = await Promise.all([
        supabase.from("residents").select("*").eq("id", id).single(),
        supabase
          .from("monthly_reports")
          .select("*")
          .eq("resident_id", id)
          .order("year_month", { ascending: false }),
      ]);

      setResident(residentRes.data);
      const reportData = (reportsRes.data ?? []) as MonthlyReport[];
      setReports(reportData);
      if (reportData.length > 0) {
        setSelectedMonth(reportData[0].year_month);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const selectedReport = reports.find((r) => r.year_month === selectedMonth);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        入居者が見つかりません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          月次レポート — {resident.name}
        </h1>
        <a
          href={`/residents/${id}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          入居者詳細へ
        </a>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
          レポートがまだ生成されていません
        </div>
      ) : (
        <>
          {/* 月選択 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              対象月:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {reports.map((r) => (
                <option key={r.year_month} value={r.year_month}>
                  {r.year_month}
                </option>
              ))}
            </select>
          </div>

          {/* レポート内容 */}
          {selectedReport && (
            <div className="space-y-4">
              {/* 収支サマリー */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-sm font-semibold text-gray-600">
                  収支サマリー
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-xs text-blue-600">収入合計</p>
                    <p className="text-lg font-bold text-blue-700">
                      ¥
                      {new Intl.NumberFormat("ja-JP").format(
                        selectedReport.total_income ?? 0
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-xs text-red-600">支出合計</p>
                    <p className="text-lg font-bold text-red-700">
                      ¥
                      {new Intl.NumberFormat("ja-JP").format(
                        Math.abs(selectedReport.total_expense ?? 0)
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs text-gray-600">月末残高</p>
                    <p className="text-lg font-bold text-gray-900">
                      ¥
                      {new Intl.NumberFormat("ja-JP").format(
                        selectedReport.ending_balance ?? 0
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* カテゴリ別支出 */}
              {selectedReport.expense_by_category && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="mb-4 text-sm font-semibold text-gray-600">
                    カテゴリ別支出
                  </h2>
                  <div className="space-y-2">
                    {Object.entries(selectedReport.expense_by_category)
                      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                      .map(([cat, amount]) => (
                        <div
                          key={cat}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
                        >
                          <span className="text-sm text-gray-700">{cat}</span>
                          <span className="text-sm font-medium text-red-600">
                            ¥
                            {new Intl.NumberFormat("ja-JP").format(
                              Math.abs(amount)
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* アラート件数 */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    当月アラート件数
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {selectedReport.alert_count}件
                  </span>
                </div>
              </div>

              {/* PDFダウンロード */}
              <PDFDownloadButton
                report={selectedReport}
                resident={resident}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
