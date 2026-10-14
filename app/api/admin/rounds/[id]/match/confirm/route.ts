import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { regionName } from "@/lib/constants";

// 편성안 확정 → groups/group_members 기록 + 신청자 상태 변경
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: run } = await db
    .from("match_runs")
    .select("id, payload")
    .eq("round_id", id)
    .is("confirmed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) {
    return NextResponse.json({ error: "NO_DRAFT", message: "확정할 편성안이 없습니다." }, { status: 400 });
  }
  const draft = run.payload;

  // 기존 확정 데이터가 있으면 먼저 정리
  await db.from("groups").delete().eq("round_id", id);

  const now = new Date().toISOString();
  for (let i = 0; i < draft.groups.length; i++) {
    const g = draft.groups[i];
    // 조 대표 지역: 가장 많은 1순위
    const { data: apps } = await db
      .from("applications")
      .select("region_1")
      .in("id", g.members);
    const counts = new Map<string, number>();
    for (const a of apps ?? []) counts.set(a.region_1, (counts.get(a.region_1) ?? 0) + 1);
    const topRegion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    const { data: group, error: gErr } = await db
      .from("groups")
      .insert({
        round_id: id,
        group_no: i + 1,
        region: topRegion,
        common_interests: g.commonInterests ?? [],
        score: g.score ?? 0,
        confirmed_at: now,
      })
      .select("id")
      .single();
    if (gErr || !group) {
      return NextResponse.json({ error: "DB_ERROR", message: "조 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
    const memberRows = g.members.map((appId: string, idx: number) => ({
      group_id: group.id,
      application_id: appId,
      person_id: g.memberPersons[idx],
      is_leader: g.memberPersons[idx] === g.leaderId,
    }));
    const { error: mErr } = await db.from("group_members").insert(memberRows);
    if (mErr) {
      return NextResponse.json({ error: "DB_ERROR", message: "조원 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
    await db.from("applications").update({ status: "GROUPED" }).in("id", g.members);
  }

  if (draft.waitlist?.length) {
    await db.from("applications").update({ status: "WAITLIST" }).in("id", draft.waitlist);
  }

  await db.from("match_runs").update({ confirmed_at: now }).eq("id", run.id);
  await db.from("rounds").update({ status: "MATCHED" }).eq("id", id);

  return NextResponse.json({ ok: true, groupCount: draft.groups.length, waitlistCount: draft.waitlist?.length ?? 0 });
}
