import type { SupabaseClient } from "@supabase/supabase-js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * カード未返却アラートを検知して作成する
 * 条件: checked_in_at == null かつ 24時間経過
 */
export async function detectCardUnreturnedAlerts(supabase: SupabaseClient) {
  const threshold = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

  const { data: overdueCheckouts } = await supabase
    .from("card_checkouts")
    .select("id, card_id, checked_out_at, accounts!inner(resident_id)")
    .is("checked_in_at", null)
    .lt("checked_out_at", threshold);

  if (!overdueCheckouts?.length) return [];

  const alerts = [];
  for (const checkout of overdueCheckouts) {
    const accounts = checkout.accounts as unknown as { resident_id: string };
    const residentId = accounts.resident_id;

    // 同一チェックアウトに対するアラートが既にあるかチェック
    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("related_checkout_id", checkout.id)
      .eq("alert_type", "card_unreturned")
      .eq("is_resolved", false)
      .limit(1);

    if (existing?.length) continue;

    alerts.push({
      resident_id: residentId,
      alert_type: "card_unreturned",
      severity: "critical",
      message: "カードが24時間以上未返却です",
      related_checkout_id: checkout.id,
    });
  }

  if (alerts.length) {
    await supabase.from("alerts").insert(alerts);
  }

  return alerts;
}

/**
 * 残高不足アラートを検知して作成する
 * 条件: current_balance < 月額固定費合計（簡易版: 契約の月額上限の50%を閾値とする）
 */
export async function detectLowBalanceAlerts(supabase: SupabaseClient) {
  const LOW_BALANCE_THRESHOLD = 30000; // デフォルト閾値: 3万円

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, resident_id, current_balance, account_type")
    .eq("account_type", "bank");

  if (!accounts?.length) return [];

  const alerts = [];
  for (const account of accounts) {
    if (account.current_balance >= LOW_BALANCE_THRESHOLD) continue;

    // 同一入居者の未解決アラートがあるかチェック
    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("resident_id", account.resident_id)
      .eq("alert_type", "low_balance")
      .eq("is_resolved", false)
      .limit(1);

    if (existing?.length) continue;

    alerts.push({
      resident_id: account.resident_id,
      alert_type: "low_balance",
      severity: "critical",
      message: `口座残高が${LOW_BALANCE_THRESHOLD.toLocaleString()}円を下回っています（現在: ${account.current_balance.toLocaleString()}円）`,
    });
  }

  if (alerts.length) {
    await supabase.from("alerts").insert(alerts);
  }

  return alerts;
}

/**
 * レシート未添付アラートを検知して作成する
 * 条件: デビットカード取引後24時間でreceipt_id == null
 */
export async function detectReceiptMissingAlerts(supabase: SupabaseClient) {
  const threshold = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, resident_id, description, accounts!inner(account_type)")
    .is("receipt_id", null)
    .lt("created_at", threshold)
    .lt("amount", 0);

  if (!transactions?.length) return [];

  // デビットカード取引のみフィルタ
  const debitTransactions = transactions.filter(
    (tx) => {
      const acc = tx.accounts as unknown as { account_type: string };
      return acc.account_type === "debit_card";
    }
  );

  const alerts = [];
  for (const tx of debitTransactions) {
    const { data: existing } = await supabase
      .from("alerts")
      .select("id")
      .eq("related_transaction_id", tx.id)
      .eq("alert_type", "receipt_missing")
      .eq("is_resolved", false)
      .limit(1);

    if (existing?.length) continue;

    alerts.push({
      resident_id: tx.resident_id,
      alert_type: "receipt_missing",
      severity: "info" as const,
      message: `レシートが未添付です: ${tx.description ?? "取引明細"}`,
      related_transaction_id: tx.id,
    });
  }

  if (alerts.length) {
    await supabase.from("alerts").insert(alerts);
  }

  return alerts;
}
