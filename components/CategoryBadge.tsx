"use client";

import type { Category } from "@/lib/types";

const CATEGORY_COLORS: Record<Category, string> = {
  家賃: "bg-blue-100 text-blue-800",
  共益費: "bg-indigo-100 text-indigo-800",
  食費: "bg-orange-100 text-orange-800",
  日用品: "bg-green-100 text-green-800",
  医療: "bg-red-100 text-red-800",
  交通: "bg-yellow-100 text-yellow-800",
  娯楽: "bg-pink-100 text-pink-800",
  光熱費: "bg-purple-100 text-purple-800",
  通信: "bg-cyan-100 text-cyan-800",
  その他: "bg-gray-100 text-gray-800",
};

interface Props {
  category: string | null;
}

export default function CategoryBadge({ category }: Props) {
  const cat = (category ?? "その他") as Category;
  const colorClass = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["その他"];

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {cat}
    </span>
  );
}
