import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID = ["DRAFT", "OPEN", "CLOSED", "MATCHED", "ARCHIVED"];

// 회차 상태 변경 (마감·공개·보관 등)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "BAD_STATUS", message: "올바른 상태가 아닙니다." }, { status: 400 });
  }
  const db = supabaseAdmin();
  if (status === "OPEN") {
    const { data: existing } = await db.from("rounds").select("id").eq("status", "OPEN").neq("id", id).limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "OPEN_EXISTS", message: "이미 열린 회차가 있습니다." }, { status: 400 });
    }
  }
  const { error } = await db.from("rounds").update({ status }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "DB_ERROR", message: "변경 중 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: round } = await db.from("rounds").select("*").eq("id", id).single();
  if (!round) {
    return NextResponse.json({ error: "NOT_FOUND", message: "회차를 찾을 수 없습니다." }, { status: 404 });
  }
  const { count } = await db.from("applications").select("id", { count: "exact", head: true }).eq("round_id", id);
  return NextResponse.json({ round: { ...round, applicantCount: count ?? 0 } });
}
