import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { MonthlyReport, Resident } from "@/lib/types";

// Google Fontsからノトサンス日本語を登録
Font.register({
  family: "NotoSansJP",
  src: "https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFJEk757Y0rw_qMHVdbR2L8Y9QTJ1LwkRg8ts.0.woff2",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    padding: 40,
    fontSize: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 10,
    color: "#666",
    textAlign: "center",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottom: "1px solid #333",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottom: "0.5px solid #eee",
  },
  label: {
    width: "60%",
  },
  value: {
    width: "40%",
    textAlign: "right",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottom: "1px solid #333",
    fontWeight: "bold",
  },
  income: {
    color: "#2563eb",
  },
  expense: {
    color: "#dc2626",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
  categoryBar: {
    flexDirection: "row",
    marginTop: 2,
    marginBottom: 4,
    height: 16,
  },
  categoryBarSegment: {
    height: 16,
  },
  categoryLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 2,
  },
  legendColor: {
    width: 10,
    height: 10,
    marginRight: 4,
  },
  legendText: {
    fontSize: 8,
  },
});

// カテゴリの色マップ
const CATEGORY_COLORS: Record<string, string> = {
  家賃: "#3B82F6",
  共益費: "#6366F1",
  食費: "#F97316",
  日用品: "#22C55E",
  医療: "#EF4444",
  交通: "#EAB308",
  娯楽: "#EC4899",
  光熱費: "#8B5CF6",
  通信: "#06B6D4",
  その他: "#6B7280",
};

function formatCurrency(amount: number): string {
  return `¥${new Intl.NumberFormat("ja-JP").format(Math.abs(amount))}`;
}

interface ReportPDFProps {
  report: MonthlyReport;
  resident: Resident;
}

export function ReportPDF({ report, resident }: ReportPDFProps) {
  const categories = report.expense_by_category ?? {};
  const totalExpense = Math.abs(report.total_expense ?? 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>月次金銭管理レポート</Text>
        <Text style={styles.subtitle}>
          {report.year_month} | {resident.name}
        </Text>

        {/* 収支サマリー */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>収支サマリー</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>収入合計（振替入金）</Text>
            <Text style={[styles.value, styles.income]}>
              {formatCurrency(report.total_income ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>支出合計</Text>
            <Text style={[styles.value, styles.expense]}>
              {formatCurrency(report.total_expense ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>月末残高</Text>
            <Text style={styles.value}>
              {formatCurrency(report.ending_balance ?? 0)}
            </Text>
          </View>
        </View>

        {/* カテゴリ別支出 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>カテゴリ別支出</Text>

          {/* 横棒グラフ */}
          {totalExpense > 0 && (
            <View style={styles.categoryBar}>
              {Object.entries(categories).map(([cat, amount]) => (
                <View
                  key={cat}
                  style={[
                    styles.categoryBarSegment,
                    {
                      width: `${(Math.abs(amount) / totalExpense) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[cat] ?? "#6B7280",
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* 凡例 */}
          <View style={styles.categoryLegend}>
            {Object.entries(categories).map(([cat, amount]) => (
              <View key={cat} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: CATEGORY_COLORS[cat] ?? "#6B7280" },
                  ]}
                />
                <Text style={styles.legendText}>
                  {cat}: {formatCurrency(amount)} (
                  {totalExpense > 0
                    ? ((Math.abs(amount) / totalExpense) * 100).toFixed(1)
                    : "0"}
                  %)
                </Text>
              </View>
            ))}
          </View>

          {/* テーブル */}
          {Object.entries(categories)
            .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
            .map(([cat, amount]) => (
              <View key={cat} style={styles.row}>
                <Text style={styles.label}>{cat}</Text>
                <Text style={[styles.value, styles.expense]}>
                  {formatCurrency(amount)}
                </Text>
              </View>
            ))}
        </View>

        {/* アラート件数 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アラート</Text>
          <View style={styles.row}>
            <Text style={styles.label}>当月アラート件数</Text>
            <Text style={styles.value}>{report.alert_count}件</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          RSW金銭管理システム — 自動生成レポート | 生成日時:{" "}
          {new Date(report.generated_at).toLocaleDateString("ja-JP")}
        </Text>
      </Page>
    </Document>
  );
}
