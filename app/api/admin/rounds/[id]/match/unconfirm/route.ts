import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 확정 취소 → 조 삭제 + 신청자 상태 되돌리기
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: groups } = await db.from("groups").select("id").eq("round_id", id);
  const groupIds = (groups ?? []).map((g) => g.id);
  if (groupIds.length > 0) {
    const { data: members } = await db.from("group_members").select("application_id").in("group_id", groupIds);
    const appIds = (members ?? []).map((m) => m.application_id);
    if (appIds.length > 0) {
      await db.from("applications").update({ status: "APPLIED" }).in("id", appIds);
    }
    await db.from("groups").delete().eq("round_id", id);
  }
  // 대기자도 되돌리기
  await db.from("applications").update({ status: "APPLIED" }).eq("round_id", id).eq("status", "WAITLIST");
  // 확정된 run을 다시 임시안으로
  await db.from("match_runs").update({ confirmed_at: null }).eq("round_id", id).not("confirmed_at", "is", null);
  await db.from("rounds").update({ status: "CLOSED" }).eq("id", id);

  return NextResponse.json({ ok: true });
}
