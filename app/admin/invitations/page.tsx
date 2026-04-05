"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import type { Resident } from "@/lib/types";

interface InvitationRecord {
  id: string;
  resident_id: string;
  email: string;
  role: string;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  resident?: Resident;
}

export default function InvitationsPage() {
  const { user } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    resident_id: "",
    role: "family",
    email: "",
  });

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowser();

    const [residentsRes, invitationsRes] = await Promise.all([
      supabase.from("residents").select("*").eq("status", "active").order("name"),
      supabase
        .from("invitations")
        .select("*, residents(*)")
        .order("created_at", { ascending: false }),
    ]);

    setResidents(residentsRes.data ?? []);
    const invData = (invitationsRes.data ?? []).map((inv) => ({
      ...inv,
      resident: inv.residents as Resident | undefined,
    }));
    setInvitations(invData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(null);
    setSending(true);

    const supabase = createSupabaseBrowser();

    // 招待トークン生成
    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: insertError } = await supabase.from("invitations").insert({
      resident_id: form.resident_id,
      email: form.email,
      role: form.role,
      invited_by: user.id,
      token,
      expires_at: expiresAt,
    });

    if (insertError) {
      setError("招待の送信に失敗しました: " + insertError.message);
      setSending(false);
      return;
    }

    // 招待リンクを表示（実際のメール送信はSupabase Edge Functionで行う想定）
    const inviteUrl = `${window.location.origin}/invite?token=${token}`;
    setSuccess(`招待リンクを生成しました: ${inviteUrl}`);
    setForm({ resident_id: "", role: "family", email: "" });
    await loadData();
    setSending(false);
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
      <h1 className="text-xl font-bold text-gray-900">招待管理</h1>

      {/* 招待送信フォーム */}
      <form
        onSubmit={handleSend}
        className="rounded-xl border border-gray-200 bg-white p-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-gray-600">
          新規招待の送信
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              入居者 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.resident_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, resident_id: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">選択してください</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ロール <span className="text-red-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="family">家族</option>
              <option value="supervisor">後見監督人</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-600 break-all">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          {sending ? "送信中..." : "招待を送信"}
        </button>
      </form>

      {/* 招待履歴 */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-600">招待履歴</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  入居者
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  メール
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  ロール
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  送信日
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3">{inv.resident?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
                      {inv.role === "family" ? "家族" : "後見監督人"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.accepted_at ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        承認済み
                      </span>
                    ) : new Date(inv.expires_at) < new Date() ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        期限切れ
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        未承認
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(inv.created_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invitations.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">
              招待履歴がありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
