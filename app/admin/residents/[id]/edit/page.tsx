"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const CARE_LEVELS = [
  "要支援1",
  "要支援2",
  "要介護1",
  "要介護2",
  "要介護3",
  "要介護4",
  "要介護5",
];

export default function EditResidentPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState({
    name: "",
    name_kana: "",
    birth_date: "",
    gender: "",
    care_level: "",
    health_notes: "",
    move_in_date: "",
    has_family: false,
    status: "active",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase
        .from("residents")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setForm({
          name: data.name ?? "",
          name_kana: data.name_kana ?? "",
          birth_date: data.birth_date ?? "",
          gender: data.gender ?? "",
          care_level: data.care_level ?? "",
          health_notes: data.health_notes ?? "",
          move_in_date: data.move_in_date ?? "",
          has_family: data.has_family ?? false,
          status: data.status ?? "active",
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createSupabaseBrowser();
    const { error: updateError } = await supabase
      .from("residents")
      .update({
        name: form.name,
        name_kana: form.name_kana || null,
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        care_level: form.care_level || null,
        health_notes: form.health_notes || null,
        move_in_date: form.move_in_date || null,
        has_family: form.has_family,
        status: form.status,
      })
      .eq("id", id);

    if (updateError) {
      setError("更新に失敗しました: " + updateError.message);
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
      <h1 className="text-xl font-bold text-gray-900">入居者の編集</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              フリガナ
            </label>
            <input
              type="text"
              value={form.name_kana}
              onChange={(e) => updateField("name_kana", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              生年月日
            </label>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => updateField("birth_date", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              性別
            </label>
            <select
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">未選択</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              要介護度
            </label>
            <select
              value={form.care_level}
              onChange={(e) => updateField("care_level", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">未選択</option>
              {CARE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              入居日
            </label>
            <input
              type="date"
              value={form.move_in_date}
              onChange={(e) => updateField("move_in_date", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            健康メモ
          </label>
          <textarea
            value={form.health_notes}
            onChange={(e) => updateField("health_notes", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has_family"
              checked={form.has_family}
              onChange={(e) => updateField("has_family", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="has_family" className="text-sm text-gray-700">
              家族あり
            </label>
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
              <option value="active">入居中</option>
              <option value="inactive">退去済</option>
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
            {saving ? "更新中..." : "更新する"}
          </button>
          <a
            href="/admin/residents"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </a>
        </div>
      </form>
    </div>
  );
}
