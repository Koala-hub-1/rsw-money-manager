"use client";

import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function Navigation() {
  const { user, profile, role, loading, signOut } = useAuth();
  const pathname = usePathname();
  const [unresolvedAlertCount, setUnresolvedAlertCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const supabase = createSupabaseBrowser();
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("is_resolved", false)
      .then(({ count }) => {
        setUnresolvedAlertCount(count ?? 0);
      });
  }, [user, pathname]);

  if (loading || !user) return null;

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const linkClass = (path: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive(path)
        ? "bg-blue-100 text-blue-700"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {/* RSW・Admin共通 */}
      {(role === "rsw" || role === "admin") && (
        <>
          <a href="/" className={linkClass("/")}>
            ダッシュボード
          </a>
          <a href="/checkout" className={linkClass("/checkout")}>
            カード管理
          </a>
          <a href="/alerts" className={linkClass("/alerts")}>
            アラート
            {unresolvedAlertCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {unresolvedAlertCount}
              </span>
            )}
          </a>
        </>
      )}

      {/* Admin専用 */}
      {role === "admin" && (
        <>
          <a href="/admin" className={linkClass("/admin")}>
            管理
          </a>
          <a href="/import" className={linkClass("/import")}>
            CSV取込
          </a>
        </>
      )}

      {/* Family / Supervisor */}
      {(role === "family" || role === "supervisor") && (
        <a href="/portal" className={linkClass("/portal")}>
          ポータル
        </a>
      )}

      {/* ユーザー情報 & ログアウト */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {profile?.name}
          <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
            {role}
          </span>
        </span>
        <button
          onClick={signOut}
          className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
