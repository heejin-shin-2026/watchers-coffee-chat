import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// 서버 전용: service_role 키로 모든 DB 접근 (클라이언트에 노출 금지)
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다. (.env 참조)");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
