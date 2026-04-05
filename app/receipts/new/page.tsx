"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase-browser";
import ReceiptCapture from "@/components/ReceiptCapture";

function ReceiptNewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get("transaction_id");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCapture = async (file: File, memo: string) => {
    if (!transactionId) {
      setError("取引IDが指定されていません");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Storageにアップロード
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${transactionId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // receiptsテーブルにINSERT
      const { data: receipt, error: insertError } = await supabase
        .from("receipts")
        .insert({
          image_path: path,
          memo: memo || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // transactionsのreceipt_idを更新
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ receipt_id: receipt.id })
        .eq("id", transactionId);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push(`/transactions/${transactionId}`);
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "アップロードに失敗しました"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        戻る
      </button>

      <h1 className="text-xl font-bold text-gray-900">レシート撮影</h1>

      {!transactionId && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          取引IDが指定されていません。取引詳細画面からアクセスしてください。
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success ? (
        <div className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
          レシートを保存しました。取引詳細に戻ります...
        </div>
      ) : (
        transactionId && (
          <ReceiptCapture onCapture={handleCapture} isUploading={isUploading} />
        )
      )}
    </div>
  );
}

export default function ReceiptNew() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <ReceiptNewContent />
    </Suspense>
  );
}
