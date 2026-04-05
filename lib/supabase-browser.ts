import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// モジュールレベルで1インスタンスのみ生成
export const supabaseBrowser = createClient(url, key);

// 後方互換
export function createSupabaseBrowser() {
  return supabaseBrowser;
}
