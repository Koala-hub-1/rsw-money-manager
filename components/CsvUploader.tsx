"use client";

import { useState, useCallback } from "react";

interface Props {
  onFileLoaded: (text: string, fileName: string) => void;
}

export default function CsvUploader({ onFileLoaded }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileLoaded(text, file.name);
      };
      reader.readAsText(file, "utf-8");
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
        isDragging
          ? "border-blue-400 bg-blue-50"
          : fileName
            ? "border-green-300 bg-green-50"
            : "border-gray-300 bg-gray-50 hover:border-blue-400"
      }`}
    >
      {fileName ? (
        <>
          <svg
            className="mb-2 h-8 w-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium text-green-700">{fileName}</span>
          <span className="mt-1 text-xs text-gray-400">
            クリックして変更
          </span>
        </>
      ) : (
        <>
          <svg
            className="mb-2 h-8 w-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-sm font-medium text-gray-600">
            CSVファイルを選択
          </span>
          <span className="mt-1 text-xs text-gray-400">
            ドラッグ&ドロップまたはクリック
          </span>
        </>
      )}
      <input
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="hidden"
      />
    </label>
  );
}
