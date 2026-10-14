import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID = ["APPLIED", "GROUPED", "WAITLIST", "CANCELLED", "NOSHOW"];

// 신청 상태 변경 (취소·노쇼 등)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "BAD_STATUS", message: "올바른 상태가 아닙니다." }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db.from("applications").update({ status }).eq("id", appId);
  if (error) {
    return NextResponse.json({ error: "DB_ERROR", message: "변경 중 오류가 발생했습니다." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
