"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { GuardianshipContract, Resident, UserProfile } from "@/lib/types";

export default function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const [resident, setResident] = useState<Resident | null>(null);
  const [contract, setContract] = useState<GuardianshipContract | null>(null);
  const [rswUsers, setRswUsers] = useState<UserProfile[]>([]);
  const [supervisorUsers, setSupervisorUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    notarial_deed_number: "",
    rsw_user_id: "",
    supervisor_user_id: "",
    proxy_scope: "",
    monthly_transfer_limit: "",
    per_transaction_limit_physical: "",
    per_transaction_limit_online: "",
    start_date: "",
    status: "active",
  });

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowser();

      const [residentRes, contractRes, rswRes, supervisorRes] =
        await Promise.all([
          supabase.from("residents").select("*").eq("id", id).single(),
          supabase
            .from("guardianship_contracts")
            .select("*")
            .eq("resident_id", id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from("user_profiles")
            .select("*")
            .eq("role", "rsw"),
          supabase
            .from("user_profiles")
            .select("*")
            .eq("role", "supervisor"),
        ]);

      setResident(residentRes.data);
      setRswUsers(rswRes.data ?? []);
      setSupervisorUsers(supervisorRes.data ?? []);

      if (contractRes.data) {
        const c = contractRes.data as GuardianshipContract;
        setContract(c);
        setForm({
          notarial_deed_number: c.notarial_deed_number ?? "",
          rsw_user_id: c.rsw_user_id ?? "",
          supervisor_user_id: c.supervisor_user_id ?? "",
          proxy_scope: c.proxy_scope ?? "",
          monthly_transfer_limit: c.monthly_transfer_limit?.toString() ?? "",
          per_transaction_limit_physical:
            c.per_transaction_limit_physical?.toString() ?? "",
          per_transaction_limit_online:
            c.per_transaction_limit_online?.toString() ?? "",
          start_date: c.start_date ?? "",
          status: c.status,
        });
      }

      setLoading(false);
    }
    load();
  }, [id]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createSupabaseBrowser();

    const payload = {
      resident_id: id,
      notarial_deed_number: form.notarial_deed_number || null,
      rsw_user_id: form.rsw_user_id || null,
      supervisor_user_id: form.supervisor_user_id || null,
      proxy_scope: form.proxy_scope || null,
      monthly_transfer_limit: form.monthly_transfer_limit
        ? parseInt(form.monthly_transfer_limit)
        : null,
      per_transaction_limit_physical: form.per_transaction_limit_physical
        ? parseInt(form.per_transaction_limit_physical)
        : null,
      per_transaction_limit_online: form.per_transaction_limit_online
        ? parseInt(form.per_transaction_limit_online)
        : null,
      start_date: form.start_date || null,
      status: form.status,
    };

    let result;
    if (contract) {
      result = await supabase
        .from("guardianship_contracts")
        .update(payload)
        .eq("id", contract.id);
    } else {
      result = await supabase.from("guardianship_contracts").insert(payload);
    }

    if (result.error) {
      setError("保存に失敗しました: " + result.error.message);
      setSaving(false);
      return;
    }

    window.location.href = "/admin/residents";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">
        任意後見契約 — {resident?.name}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            公正証書番号
          </label>
          <input
            type="text"
            value={form.notarial_deed_number}
            onChange={(e) =>
              updateField("notarial_deed_number", e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              後見人RSW
            </label>
            <select
              value={form.rsw_user_id}
              onChange={(e) => updateField("rsw_user_id", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">未選択</option>
              {rswUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              後見監督人
            </label>
            <select
              value={form.supervisor_user_id}
              onChange={(e) =>
                updateField("supervisor_user_id", e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">未選択</option>
              {supervisorUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            代理権範囲
          </label>
          <textarea
            value={form.proxy_scope}
            onChange={(e) => updateField("proxy_scope", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              月額振替上限（円）
            </label>
            <input
              type="number"
              value={form.monthly_transfer_limit}
              onChange={(e) =>
                updateField("monthly_transfer_limit", e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              デビット1回上限（円）
            </label>
            <input
              type="number"
              value={form.per_transaction_limit_physical}
              onChange={(e) =>
                updateField("per_transaction_limit_physical", e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              システム決済1回上限（円）
            </label>
            <input
              type="number"
              value={form.per_transaction_limit_online}
              onChange={(e) =>
                updateField("per_transaction_limit_online", e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              契約開始日
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              ステータス
            </label>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="active">有効</option>
              <option value="terminated">終了</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? "保存中..." : contract ? "更新する" : "登録する"}
          </button>
          <a
            href="/admin/residents"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            戻る
          </a>
        </div>
      </form>
    </div>
  );
}
