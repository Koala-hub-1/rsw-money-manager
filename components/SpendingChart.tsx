"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { Transaction, Category } from "@/lib/types";

const CATEGORY_COLORS: Record<Category, string> = {
  家賃: "#3B82F6",
  共益費: "#6366F1",
  食費: "#F97316",
  日用品: "#22C55E",
  医療: "#EF4444",
  交通: "#EAB308",
  娯楽: "#EC4899",
  光熱費: "#A855F7",
  通信: "#06B6D4",
  その他: "#6B7280",
};

interface Props {
  transactions: Transaction[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

export default function SpendingChart({ transactions }: Props) {
  // 支出のみ集計（amountが負の取引）
  const spending = transactions.filter((tx) => tx.amount < 0);

  if (spending.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        支出データがありません
      </p>
    );
  }

  // カテゴリ別に集計
  const categoryMap = new Map<string, number>();
  for (const tx of spending) {
    const cat = tx.category ?? "その他";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Math.abs(tx.amount));
  }

  const data = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  CATEGORY_COLORS[entry.name as Category] ??
                  CATEGORY_COLORS["その他"]
                }
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`¥${formatCurrency(Number(value))}`, "金額"]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
