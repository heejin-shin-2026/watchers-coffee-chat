import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "./supabase";

export const ADMIN_COOKIE = "wc_admin";
const SESSION_DAYS = 7;
const MAX_FAIL = 5;
const LOCK_MINUTES = 10;

function jwtSecret(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_JWT_SECRET이 설정되지 않았습니다.");
  return new TextEncoder().encode(s);
}

export async function createSession(email: string): Promise<string> {
  return new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(jwtSecret());
}

export async function verifyAdmin(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

// 로그인 시도 기록 + 잠금 확인
export async function checkLoginAllowed(email: string): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - LOCK_MINUTES * 60 * 1000).toISOString();
  const { data } = await db
    .from("login_attempts")
    .select("attempted_at")
    .eq("email", email)
    .eq("success", false)
    .gte("attempted_at", since)
    .order("attempted_at", { ascending: false })
    .limit(MAX_FAIL);
  const fails = data ?? [];
  if (fails.length >= MAX_FAIL) {
    const last = new Date(fails[0].attempted_at).getTime();
    const retryAfterSec = Math.max(
      1,
      Math.ceil((last + LOCK_MINUTES * 60 * 1000 - Date.now()) / 1000)
    );
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

export async function recordLoginAttempt(email: string, success: boolean) {
  const db = supabaseAdmin();
  await db.from("login_attempts").insert({ email, ip: await clientIp(), success });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
