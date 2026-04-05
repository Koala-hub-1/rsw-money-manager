"use client";

import type { ColumnMapping } from "@/lib/types";

interface Props {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

const MAPPING_LABELS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "date", label: "日付", required: true },
  { key: "description", label: "摘要", required: true },
  { key: "deposit", label: "入金", required: false },
  { key: "withdrawal", label: "出金", required: false },
  { key: "amount", label: "金額（正負一列）", required: false },
  { key: "balance", label: "残高", required: false },
];

export default function ColumnMapper({
  headers,
  mapping,
  onMappingChange,
}: Props) {
  const handleChange = (key: keyof ColumnMapping, value: string) => {
    const numValue = value === "" ? null : Number(value);
    onMappingChange({
      ...mapping,
      [key]: numValue,
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">カラムマッピング</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {MAPPING_LABELS.map(({ key, label, required }) => (
          <div key={key}>
            <label className="mb-1 block text-xs text-gray-500">
              {label}
              {required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={mapping[key] ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {!required && <option value="">未設定</option>}
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
