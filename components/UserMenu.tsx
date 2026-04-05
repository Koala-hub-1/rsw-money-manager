"use client";

import { useAuth } from "@/lib/auth-context";

export default function UserMenu() {
  const { user, profile, role, loading, signOut } = useAuth();

  if (loading || !user) return null;

  return (
    <div className="flex items-center gap-2 shrink-0">
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
  );
}
