"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { ResidentExtended } from "@/lib/types";

export default function AdminResidentsPage() {
  const [residents, setResidents] = useState<ResidentExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchResidents() {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase
        .from("residents")
        .select("*")
        .order("name");
      setResidents((data as ResidentExtended[]) ?? []);
      setLoading(false);
    }
    fetchResidents();
  }, []);

  const filtered = residents.filter((r) => {
    const matchesSearch =
      !search ||
      r.name.includes(search) ||
      (r.name_kana && r.name_kana.includes(search));
    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">入居者管理</h1>
        <a
          href="/admin/residents/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          新規登録
        </a>
      </div>

      {/* 検索・フィルタ */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="名前・カナで検索"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">全ステータス</option>
          <option value="active">入居中</option>
          <option value="inactive">退去済</option>
        </select>
      </div>

      {/* 入居者一覧 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">名前</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">カナ</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">要介護度</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">入居日</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ステータス</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {r.name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.name_kana ?? "-"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.care_level ?? "-"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {r.move_in_date ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.status === "active" ? "入居中" : "退去済"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <a
                      href={`/admin/residents/${r.id}/edit`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      編集
                    </a>
                    <a
                      href={`/admin/residents/${r.id}/contract`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      契約
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">
            該当する入居者がいません
          </div>
        )}
      </div>
    </div>
  );
}
