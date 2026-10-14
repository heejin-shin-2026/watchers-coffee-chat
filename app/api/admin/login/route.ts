import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSession, setSessionCookie, checkLoginAllowed, recordLoginAttempt, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const allowed = await checkLoginAllowed(email);
  if (!allowed.ok) {
    return NextResponse.json(
      { error: "LOCKED", message: `로그인 실패가 반복되어 잠시 잠겼습니다. ${allowed.retryAfterSec}초 후 다시 시도해 주세요.` },
      { status: 429 }
    );
  }

  const db = supabaseAdmin();
  const { data: admin } = await db.from("admins").select("id, email, password_hash").eq("email", email).maybeSingle();

  let ok = false;
  let adminEmail = "";
  if (admin) {
    ok = await verifyPassword(password, admin.password_hash);
    adminEmail = admin.email;
  }
  await recordLoginAttempt(email, ok);
  if (!ok) {
    return NextResponse.json({ error: "INVALID", message: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await createSession(adminEmail);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
