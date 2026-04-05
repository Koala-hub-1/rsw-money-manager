"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { UserProfile, UserRole } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange だけでセッションを検知する（getSession不要）
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        if (!mounted) return;
        setUser(currentUser);

        if (currentUser) {
          const { data } = await supabaseBrowser
            .from("user_profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();
          if (mounted) setProfile(data);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // 初回: セッションがない場合も loading を解除するためのフォールバック
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 2000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  }

  // 未認証時にログインページ以外ならリダイレクト
  useEffect(() => {
    if (loading) return;
    if (!user && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path !== "/login" && !path.startsWith("/invite") && !path.startsWith("/test")) {
        window.location.href = "/login";
      }
    }
  }, [loading, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: (profile?.role as UserRole) ?? null,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
