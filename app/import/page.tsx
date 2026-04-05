"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase-browser";
import type {
  Resident,
  Account,
  AccountType,
  ColumnMapping,
  ParsedTransaction,
} from "@/lib/types";
import { parseCsvText, guessColumnMapping, mapRowsToTransactions } from "@/lib/csvParser";
import { guessCategory } from "@/lib/categoryGuesser";
import CsvUploader from "@/components/CsvUploader";
import ColumnMapper from "@/components/ColumnMapper";

const STEPS = [
  "入居者選択",
  "口座種別",
  "CSVファイル",
  "プレビュー",
  "カラムマッピング",
  "取り込み実行",
] as const;

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>("bank");
  const [account, setAccount] = useState<Account | null>(null);

  // CSVデータ
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [fileName, setFileName] = useState("");

  // 取込結果
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("residents")
      .select("*")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => setResidents(data ?? []));
  }, []);

  // 口座種別選択時に口座を取得
  useEffect(() => {
    if (!selectedResidentId || !selectedAccountType) return;
    supabase
      .from("accounts")
      .select("*")
      .eq("resident_id", selectedResidentId)
      .eq("account_type", selectedAccountType)
      .single()
      .then(({ data }) => setAccount(data));
  }, [selectedResidentId, selectedAccountType]);

  const handleFileLoaded = (text: string, name: string) => {
    setFileName(name);
    const parsed = parseCsvText(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    const autoMapping = guessColumnMapping(parsed.headers);
    setMapping(autoMapping);
    setStep(3);
  };

  const handleMappingConfirm = () => {
    if (!mapping) return;
    const txs = mapRowsToTransactions(rows, mapping);
    setTransactions(txs);
    setStep(5);
  };

  const handleImport = async () => {
    if (!account || transactions.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      // トランザクションをDBに挿入
      const insertData = transactions.map((tx) => ({
        resident_id: selectedResidentId,
        account_id: account.id,
        transaction_date: tx.date,
        description: tx.description,
        amount: tx.amount,
        balance_after: tx.balance,
        category: guessCategory(tx.description),
        raw_csv_line: tx.rawLine,
      }));

      const { error: insertError } = await supabase
        .from("transactions")
        .insert(insertData);

      if (insertError) throw insertError;

      // 口座残高を最新取引の残高で更新
      const lastTx = transactions[transactions.length - 1];
      if (lastTx.balance !== null) {
        await supabase
          .from("accounts")
          .update({
            current_balance: lastTx.balance,
            last_updated: new Date().toISOString(),
          })
          .eq("id", account.id);
      }

      // csv_importsに記録
      await supabase.from("csv_imports").insert({
        resident_id: selectedResidentId,
        account_id: account.id,
        file_name: fileName,
        row_count: transactions.length,
      });

      setImportResult(transactions.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取り込みに失敗しました");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">CSV取込</h1>

      {/* ステッププログレス */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-full py-1 text-center text-xs font-medium ${
              i <= step
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            <span className="hidden sm:inline">{s}</span>
            <span className="sm:hidden">{i + 1}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Step 0: 入居者選択 */}
      {step === 0 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            入居者を選択
          </label>
          <select
            value={selectedResidentId}
            onChange={(e) => setSelectedResidentId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setStep(1)}
            disabled={!selectedResidentId}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            次へ
          </button>
        </div>
      )}

      {/* Step 1: 口座種別 */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            口座種別を選択
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["bank", "銀行口座"],
                ["debit_card", "デビットカード"],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                onClick={() => setSelectedAccountType(type)}
                className={`rounded-xl border-2 p-4 text-center text-sm font-medium transition-colors ${
                  selectedAccountType === type
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* Step 2: CSVファイル選択 */}
      {step === 2 && (
        <div className="space-y-4">
          <CsvUploader onFileLoaded={handleFileLoaded} />
          <button
            onClick={() => setStep(1)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            戻る
          </button>
        </div>
      )}

      {/* Step 3: プレビュー */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-700">
            プレビュー（最初の5行）
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 font-medium text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-2 text-gray-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">全{rows.length}行</p>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* Step 4: カラムマッピング */}
      {step === 4 && mapping && (
        <div className="space-y-4">
          <ColumnMapper
            headers={headers}
            mapping={mapping}
            onMappingChange={setMapping}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={handleMappingConfirm}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* Step 5: 取り込み実行 */}
      {step === 5 && (
        <div className="space-y-4">
          {importResult === null ? (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-medium text-gray-700">取込確認</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">入居者</dt>
                    <dd className="font-medium">
                      {residents.find((r) => r.id === selectedResidentId)?.name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">口座種別</dt>
                    <dd className="font-medium">
                      {selectedAccountType === "bank" ? "銀行口座" : "デビットカード"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">ファイル</dt>
                    <dd className="font-medium">{fileName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">取込件数</dt>
                    <dd className="font-medium">{transactions.length}件</dd>
                  </div>
                </dl>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  戻る
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {importing ? "取込中..." : "取り込み実行"}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div className="rounded-xl bg-green-50 p-8">
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-green-500"
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
                <p className="text-lg font-bold text-green-700">
                  {importResult}件の取引を取り込みました
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                ダッシュボードへ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
