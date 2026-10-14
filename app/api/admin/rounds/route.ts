import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 회차 목록 (신청자 수 포함)
export async function GET() {
  const db = supabaseAdmin();
  const { data: rounds, error } = await db
    .from("rounds")
    .select("id, title, status, open_at, close_at, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "DB_ERROR", message: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
  const withCounts = await Promise.all(
    (rounds ?? []).map(async (r) => {
      const { count } = await db.from("applications").select("id", { count: "exact", head: true }).eq("round_id", r.id);
      return { ...r, applicantCount: count ?? 0 };
    })
  );
  return NextResponse.json({ rounds: withCounts });
}

// 회차 생성 (OPEN은 동시에 1개만)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const openAt = body?.open_at ? new Date(body.open_at).toISOString() : new Date().toISOString();
  const closeAt = body?.close_at ? new Date(body.close_at).toISOString() : null;
  const autoOpen = body?.auto_open === true;

  if (!title) {
    return NextResponse.json({ error: "TITLE_REQUIRED", message: "회차 제목을 입력해 주세요." }, { status: 400 });
  }
  const db = supabaseAdmin();
  let status = "DRAFT";
  if (autoOpen) {
    const { data: existing } = await db.from("rounds").select("id").eq("status", "OPEN").limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "OPEN_EXISTS", message: "이미 열린 회차가 있습니다. 먼저 마감해 주세요." }, { status: 400 });
    }
    status = "OPEN";
  }
  const { data, error } = await db
    .from("rounds")
    .insert({ title, status, open_at: openAt, close_at: closeAt })
    .select("id, title, status")
    .single();
  if (error) {
    return NextResponse.json({ error: "DB_ERROR", message: "생성 중 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ round: data });
}
