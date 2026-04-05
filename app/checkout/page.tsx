"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import type { Account, Resident, CardCheckout } from "@/lib/types";

interface CheckoutWithDetails extends CardCheckout {
  account?: Account & { resident?: Resident };
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [cards, setCards] = useState<(Account & { resident?: Resident })[]>([]);
  const [activeCheckouts, setActiveCheckouts] = useState<CheckoutWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState("");
  const [purpose, setPurpose] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // タイマー更新（1分ごと）
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowser();

    const [residentsRes, cardsRes, checkoutsRes] = await Promise.all([
      supabase.from("residents").select("*").eq("status", "active"),
      supabase
        .from("accounts")
        .select("*, residents(*)")
        .eq("account_type", "debit_card"),
      supabase
        .from("card_checkouts")
        .select("*, accounts(*, residents(*))")
        .is("checked_in_at", null)
        .order("checked_out_at", { ascending: false }),
    ]);

    setResidents(residentsRes.data ?? []);

    const allCards = (cardsRes.data ?? []).map((c) => ({
      ...c,
      resident: c.residents as Resident | undefined,
    }));
    setCards(allCards);

    const checkouts = (checkoutsRes.data ?? []).map((co) => ({
      ...co,
      account: co.accounts
        ? {
            ...(co.accounts as Account),
            resident: (co.accounts as { residents?: Resident }).residents,
          }
        : undefined,
    }));
    setActiveCheckouts(checkouts);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // チェックアウト済みカードIDのセット
  const checkedOutCardIds = new Set(
    activeCheckouts.map((co) => co.card_id)
  );

  // 利用可能なカード（未チェックアウト）
  const availableCards = cards.filter((c) => !checkedOutCardIds.has(c.id));

  async function handleCheckout() {
    if (!selectedCard || !user) return;
    setProcessing(true);

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.from("card_checkouts").insert({
      card_id: selectedCard,
      rsw_user_id: user.id,
      purpose: purpose || null,
    });

    if (!error) {
      setShowModal(false);
      setSelectedCard("");
      setPurpose("");
      await loadData();
    }
    setProcessing(false);
  }

  async function handleCheckin(checkoutId: string) {
    setProcessing(true);
    const supabase = createSupabaseBrowser();
    await supabase
      .from("card_checkouts")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", checkoutId);
    await loadData();
    setProcessing(false);
  }

  function formatElapsed(checkedOutAt: string): string {
    const elapsed = now - new Date(checkedOutAt).getTime();
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    if (hours > 0) return `${hours}時間${minutes}分`;
    return `${minutes}分`;
  }

  function isOverdue(checkedOutAt: string): boolean {
    return now - new Date(checkedOutAt).getTime() > 24 * 3600000;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">カード管理</h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={availableCards.length === 0}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          チェックアウト
        </button>
      </div>

      {/* チェックアウト中のカード */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          持出中のカード ({activeCheckouts.length})
        </h2>
        {activeCheckouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
            持出中のカードはありません
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeCheckouts.map((co) => (
              <div
                key={co.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  isOverdue(co.checked_out_at)
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {co.account?.resident?.name ?? "不明"} —{" "}
                      {co.account?.label ?? "カード"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      目的: {co.purpose ?? "—"}
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        isOverdue(co.checked_out_at)
                          ? "text-red-600"
                          : "text-orange-600"
                      }`}
                    >
                      経過時間: {formatElapsed(co.checked_out_at)}
                      {isOverdue(co.checked_out_at) && " (24h超過)"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckin(co.id)}
                    disabled={processing}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
                  >
                    返却
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 利用可能なカード */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          利用可能なカード ({availableCards.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableCards.map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="font-medium text-gray-900">
                {card.resident?.name ?? "不明"}
              </p>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-1 text-sm text-green-600">
                残高: ¥
                {new Intl.NumberFormat("ja-JP").format(card.current_balance)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* チェックアウトモーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              カードチェックアウト
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  カード選択 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">カードを選択</option>
                  {availableCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.resident?.name} — {card.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  目的
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="買い物など"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedCard("");
                    setPurpose("");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={!selectedCard || processing}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {processing ? "処理中..." : "チェックアウト"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
