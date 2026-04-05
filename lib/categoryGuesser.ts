import type { Category } from "./types";

const RULES: [string[], Category][] = [
  [["家賃", "賃料"], "家賃"],
  [["共益", "管理費"], "共益費"],
  [["食費", "給食"], "食費"],
  [["マツモトキヨシ", "ドラッグ", "セブン", "ローソン", "ファミマ", "ファミリーマート", "ダイソー", "ウエルシア"], "日用品"],
  [["病院", "クリニック", "薬局", "調剤"], "医療"],
  [["タクシー", "バス", "電車", "Suica", "PASMO"], "交通"],
  [["Choice100"], "娯楽"],
  [["電気", "ガス", "水道", "NHK"], "光熱費"],
  [["携帯", "docomo", "au", "SoftBank"], "通信"],
];

export function guessCategory(description: string): Category {
  for (const [keywords, category] of RULES) {
    if (keywords.some((kw) => description.includes(kw))) return category;
  }
  return "その他";
}
