"use client";

import { useState, useRef } from "react";

interface Props {
  onCapture: (file: File, memo: string) => Promise<void>;
  isUploading?: boolean;
}

export default function ReceiptCapture({ onCapture, isUploading }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [memo, setMemo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    await onCapture(selectedFile, memo);
    setPreview(null);
    setSelectedFile(null);
    setMemo("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleReset = () => {
    setPreview(null);
    setSelectedFile(null);
    setMemo("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50">
          <svg
            className="mb-2 h-10 w-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-600">
            レシートを撮影
          </span>
          <span className="mt-1 text-xs text-gray-400">
            タップしてカメラを起動
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="レシートプレビュー"
              className="max-h-[400px] w-full object-contain"
            />
            <button
              onClick={handleReset}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />

          <button
            onClick={handleSubmit}
            disabled={isUploading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isUploading ? "アップロード中..." : "レシートを保存"}
          </button>
        </div>
      )}
    </div>
  );
}
