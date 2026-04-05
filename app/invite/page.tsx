"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<"loading" | "form" | "success" | "error">(
    "loading"
  );
  const [invitation, setInvitation] = useState<{
    id: string;
    email: string;
    role: string;
    resident_id: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("招待トークンが無効です");
        setStep("error");
        return;
      }

      const supabase = createSupabaseBrowser();
      const { data } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!data) {
        setError("招待リンクが無効または期限切れです");
        setStep("error");
        return;
      }

      setInvitation(data);
      setStep("form");
    }
    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invitation) return;
    setProcessing(true);
    setError("");

    const supabase = createSupabaseBrowser();

    // アカウント作成
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email: invitation.email,
        password,
      });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? "アカウント作成に失敗しました");
      setProcessing(false);
      return;
    }

    // プロファイル作成
    await supabase.from("user_profiles").insert({
      id: signUpData.user.id,
      role: invitation.role,
      name,
    });

    // 連絡先としても登録
    await supabase.from("contacts").insert({
      resident_id: invitation.resident_id,
      user_id: signUpData.user.id,
      role: invitation.role,
      name,
      email: invitation.email,
    });

    // 招待を承認済みに更新
    await supabase
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    setStep("success");
  }

  if (step === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            ログインページへ
          </a>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-sm font-medium text-green-700">
            アカウントが作成されました
          </p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ログインへ進む
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-xl font-bold text-gray-900">
          アカウント設定
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          {invitation?.role === "family" ? "家族" : "後見監督人"}
          として招待されました
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              type="email"
              value={invitation?.email ?? ""}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              パスワード <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="8文字以上"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={processing}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {processing ? "処理中..." : "アカウントを作成"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
