"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Resident, Account, Transaction } from "@/lib/types";
import ResidentCard from "@/components/ResidentCard";

interface ResidentData {
  resident: Resident;
  accounts: Account[];
  recentTransactions: Transaction[];
}

export default function Dashboard() {
  const [data, setData] = useState<ResidentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: residents } = await supabase
        .from("residents")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (!residents) {
        setLoading(false);
        return;
      }

      const result: ResidentData[] = [];
      for (const resident of residents) {
        const { data: accounts } = await supabase
          .from("accounts")
          .select("*")
          .eq("resident_id", resident.id);

        const { data: transactions } = await supabase
          .from("transactions")
          .select("*")
          .eq("resident_id", resident.id)
          .order("transaction_date", { ascending: false })
          .limit(3);

        result.push({
          resident,
          accounts: accounts ?? [],
          recentTransactions: transactions ?? [],
        });
      }

      setData(result);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((d) => (
          <ResidentCard
            key={d.resident.id}
            resident={d.resident}
            accounts={d.accounts}
            recentTransactions={d.recentTransactions}
          />
        ))}
      </div>
      {data.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            入居者データがありません。CSVを取り込んでください。
          </p>
        </div>
      )}
    </div>
  );
}
