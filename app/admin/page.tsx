"use client";

import { useAuth } from "@/lib/auth-context";

export default function AdminDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
      <p className="text-sm text-gray-600">
        ようこそ、{profile?.name ?? "管理者"}さん
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href="/admin/residents"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900">入居者管理</h2>
          <p className="mt-1 text-sm text-gray-500">
            入居者の登録・編集・後見契約管理
          </p>
        </a>

        <a
          href="/admin/invitations"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900">招待管理</h2>
          <p className="mt-1 text-sm text-gray-500">
            家族・後見監督人の招待送信
          </p>
        </a>

        <a
          href="/import"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900">CSV取込</h2>
          <p className="mt-1 text-sm text-gray-500">
            銀行・カード明細の取り込み
          </p>
        </a>

        <a
          href="/alerts"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900">アラート</h2>
          <p className="mt-1 text-sm text-gray-500">
            未返却・残高不足・レシート未添付
          </p>
        </a>

        <a
          href="/"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900">ダッシュボード</h2>
          <p className="mt-1 text-sm text-gray-500">
            入居者一覧・残高・直近取引
          </p>
        </a>
      </div>
    </div>
  );
}
