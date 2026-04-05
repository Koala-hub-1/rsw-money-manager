"use client";

import Link from "next/link";
import type { Resident, Account, Transaction } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";

interface Props {
  resident: Resident;
  accounts: Account[];
  recentTransactions: Transaction[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

export default function ResidentCard({
  resident,
  accounts,
  recentTransactions,
}: Props) {
  const bankAccount = accounts.find((a) => a.account_type === "bank");
  const debitAccount = accounts.find((a) => a.account_type === "debit_card");

  return (
    <Link href={`/residents/${resident.id}`}>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{resident.name}</h2>
          {resident.name_kana && (
            <span className="text-xs text-gray-400">{resident.name_kana}</span>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-gray-500">銀行口座</p>
            <p className="text-lg font-bold text-blue-700">
              ¥{formatCurrency(bankAccount?.current_balance ?? 0)}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs text-gray-500">デビット</p>
            <p className="text-lg font-bold text-green-700">
              ¥{formatCurrency(debitAccount?.current_balance ?? 0)}
            </p>
          </div>
        </div>

        {recentTransactions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">直近の取引</p>
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {tx.transaction_date.slice(5)}
                  </span>
                  <span className="max-w-[120px] truncate text-gray-700">
                    {tx.description}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${tx.amount > 0 ? "text-blue-600" : "text-red-600"}`}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    ¥{formatCurrency(Math.abs(tx.amount))}
                  </span>
                  <CategoryBadge category={tx.category} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
