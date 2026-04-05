import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron: 毎月1日に実行
// vercel.jsonに "crons": [{"path": "/api/cron/generate-reports", "schedule": "0 0 1 * *"}] を設定

export async function GET(request: Request) {
  // Cron認証チェック
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // サービスロールキーでSupabaseに接続（RLSバイパス）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );

  // 前月の年月を算出
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearMonth = `${targetDate.getFullYear()}-${String(
    targetDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const monthStart = `${yearMonth}-01`;
  const monthEnd = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  )
    .toISOString()
    .split("T")[0];

  // 全アクティブ入居者を取得
  const { data: residents } = await supabase
    .from("residents")
    .select("id, name")
    .eq("status", "active");

  if (!residents?.length) {
    return NextResponse.json({ message: "No active residents", count: 0 });
  }

  let generatedCount = 0;

  for (const resident of residents) {
    // 既存レポートがあればスキップ
    const { data: existing } = await supabase
      .from("monthly_reports")
      .select("id")
      .eq("resident_id", resident.id)
      .eq("year_month", yearMonth)
      .limit(1);

    if (existing?.length) continue;

    // 当月の取引を取得
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("resident_id", resident.id)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd);

    const txList = transactions ?? [];

    // 収入・支出を集計
    const totalIncome = txList
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = txList
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    // カテゴリ別支出
    const expenseByCategory: Record<string, number> = {};
    for (const tx of txList.filter((t) => t.amount < 0)) {
      const cat = tx.category ?? "その他";
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + tx.amount;
    }

    // 月末残高（銀行口���）
    const { data: accounts } = await supabase
      .from("accounts")
      .select("current_balance")
      .eq("resident_id", resident.id)
      .eq("account_type", "bank")
      .limit(1);

    const endingBalance = accounts?.[0]?.current_balance ?? 0;

    // 当月のアラート件数
    const { count: alertCount } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("resident_id", resident.id)
      .gte("created_at", `${monthStart}T00:00:00`)
      .lte("created_at", `${monthEnd}T23:59:59`);

    // レポート作成
    await supabase.from("monthly_reports").insert({
      resident_id: resident.id,
      year_month: yearMonth,
      total_income: totalIncome,
      total_expense: totalExpense,
      expense_by_category: expenseByCategory,
      ending_balance: endingBalance,
      alert_count: alertCount ?? 0,
    });

    generatedCount++;
  }

  return NextResponse.json({
    message: "Reports generated",
    yearMonth,
    count: generatedCount,
  });
}
