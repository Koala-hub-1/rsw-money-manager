"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import type { Alert, Resident } from "@/lib/types";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-300 bg-red-50",
  warning: "border-yellow-300 bg-yellow-50",
  info: "border-blue-300 bg-blue-50",
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "重要",
  warning: "警告",
  info: "情報",
};

const TYPE_LABELS: Record<string, string> = {
  card_unreturned: "カード未返却",
  low_balance: "残高不足",
  receipt_missing: "レシート未添付",
};

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<(Alert & { resident?: Resident })[]>(
    []
  );
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [residentFilter, setResidentFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const loadAlerts = useCallback(async () => {
    const supabase = createSupabaseBrowser();

    const [alertsRes, residentsRes] = await Promise.all([
      supabase
        .from("alerts")
        .select("*, residents(*)")
        .order("created_at", { ascending: false }),
      supabase.from("residents").select("*").eq("status", "active"),
    ]);

    const alertData = (alertsRes.data ?? []).map((a) => ({
      ...a,
      resident: a.residents as Resident | undefined,
    }));

    setAlerts(alertData);
    setResidents(residentsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  async function handleResolve(alertId: string) {
    if (!user) return;
    const supabase = createSupabaseBrowser();
    await supabase
      .from("alerts")
      .update({
        is_resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);
    await loadAlerts();
  }

  const filtered = alerts
    .filter((a) => {
      if (!showResolved && a.is_resolved) return false;
      if (typeFilter !== "all" && a.alert_type !== typeFilter) return false;
      if (residentFilter !== "all" && a.resident_id !== residentFilter)
        return false;
      return true;
    })
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">アラート</h1>

      {/* フィルタ */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">全種別</option>
          <option value="card_unreturned">カード未返却</option>
          <option value="low_balance">残高不足</option>
          <option value="receipt_missing">レシート未添付</option>
        </select>

        <select
          value={residentFilter}
          onChange={(e) => setResidentFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">全入居者</option>
          {residents.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          解決済みも表示
        </label>
      </div>

      {/* アラート一覧 */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
            アラートはありません
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 ${
                alert.is_resolved
                  ? "border-gray-200 bg-gray-50 opacity-60"
                  : SEVERITY_STYLES[alert.severity] ?? "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        SEVERITY_BADGE[alert.severity] ?? ""
                      }`}
                    >
                      {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                    </span>
                    <span className="text-xs font-medium text-gray-500">
                      {TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                    </span>
                    {alert.is_resolved && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        解決済み
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-900">{alert.message}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {alert.resident?.name ?? "—"} |{" "}
                    {new Date(alert.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>
                {!alert.is_resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    解決済み
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
