"use client";

import Link from "next/link";
import type { Transaction } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";

interface Props {
  transactions: Transaction[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

export default function TransactionList({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        取引データがありません
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {transactions.map((tx) => (
        <Link
          key={tx.id}
          href={`/transactions/${tx.id}`}
          className="flex items-center justify-between px-2 py-3 transition-colors hover:bg-gray-50"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-gray-900">
              {tx.description}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {tx.transaction_date}
              </span>
              <CategoryBadge category={tx.category} />
              {tx.receipt_id && (
                <span className="text-xs text-green-500" title="レシート添付済">
                  📎
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-bold ${tx.amount > 0 ? "text-blue-600" : "text-red-600"}`}
            >
              {tx.amount > 0 ? "+" : ""}¥{formatCurrency(Math.abs(tx.amount))}
            </span>
            {tx.balance_after !== null && (
              <p className="text-xs text-gray-400">
                残高 ¥{formatCurrency(tx.balance_after)}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
