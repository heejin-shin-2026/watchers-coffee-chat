import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptPhone } from "@/lib/crypto";
import { runMatching, type Applicant } from "@/lib/matching";

async function loadApplicants(db: ReturnType<typeof supabaseAdmin>, roundId: string): Promise<Applicant[]> {
  // 이번 회차 신청자 (취소 제외)
  const { data: apps } = await db
    .from("applications")
    .select("id, region_1, region_2, interests, status, applied_at, person_id, persons(name, phone_enc, school)")
    .eq("round_id", roundId)
    .neq("status", "CANCELLED")
    .order("applied_at", { ascending: true });

  // 이전 회차 조 이력: personId -> 함께했던 personId 집합
  const { data: pastGroups } = await db
    .from("groups")
    .select("id, round_id, group_members(person_id)")
    .neq("round_id", roundId);
  const partners = new Map<string, Set<string>>();
  for (const g of pastGroups ?? []) {
    const members: string[] = (g.group_members ?? []).map((m: any) => m.person_id);
    for (const p of members) {
      if (!partners.has(p)) partners.set(p, new Set());
      for (const q of members) if (q !== p) partners.get(p)!.add(q);
    }
  }

  // 직전 회차 대기자
  const { data: prevRound } = await db
    .from("rounds")
    .select("id")
    .neq("id", roundId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevWaitlist = new Set<string>();
  if (prevRound) {
    const { data: wl } = await db
      .from("applications")
      .select("person_id")
      .eq("round_id", prevRound.id)
      .eq("status", "WAITLIST");
    for (const w of wl ?? []) prevWaitlist.add(w.person_id);
  }

  return (apps ?? []).map((a: any) => ({
    applicationId: a.id,
    personId: a.person_id,
    name: a.persons?.name ?? "",
    phone: (() => { try { return decryptPhone(a.persons?.phone_enc ?? ""); } catch { return ""; } })(),
    region1: a.region_1,
    region2: a.region_2,
    interests: a.interests ?? [],
    school: a.persons?.school ?? "",
    appliedAt: a.applied_at,
    noshow: a.status === "NOSHOW",
    prevWaitlist: prevWaitlist.has(a.person_id),
    prevPartners: partners.get(a.person_id) ?? new Set<string>(),
  }));
}

function toDraft(result: ReturnType<typeof runMatching>) {
  return {
    groups: result.groups.map((g) => ({
      members: g.members.map((m) => m.applicationId),
      memberPersons: g.members.map((m) => m.personId),
      leaderId: g.leaderId,
      score: g.score,
      commonInterests: g.commonInterests,
      warnings: g.warnings,
    })),
    waitlist: result.waitlist.map((m) => m.applicationId),
    totalScore: result.totalScore,
    qualityWarning: result.qualityWarning,
    seed: result.seed,
    createdAt: new Date().toISOString(),
  };
}

// 매칭 실행 → 편성안 임시 저장
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: round } = await db.from("rounds").select("id, status").eq("id", id).single();
  if (!round) {
    return NextResponse.json({ error: "NOT_FOUND", message: "회차를 찾을 수 없습니다." }, { status: 404 });
  }
  if (round.status !== "CLOSED" && round.status !== "MATCHED") {
    return NextResponse.json({ error: "NOT_CLOSED", message: "마감된 회차에서만 매칭을 실행할 수 있습니다." }, { status: 400 });
  }

  const applicants = await loadApplicants(db, id);
  if (applicants.length < 4) {
    return NextResponse.json({ error: "TOO_FEW", message: "신청자가 4명 이상이어야 매칭할 수 있습니다." }, { status: 400 });
  }

  const result = runMatching(applicants);
  const draft = toDraft(result);

  // 기존 임시안은 교체
  await db.from("match_runs").delete().eq("round_id", id).is("confirmed_at", null);
  const { data: run, error } = await db
    .from("match_runs")
    .insert({ round_id: id, payload: draft })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: "DB_ERROR", message: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ runId: run.id, draft: await enrichDraft(db, draft) });
}

// 현재 편성안 조회 (화면 표시용으로 신청자 정보 포함)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: run } = await db
    .from("match_runs")
    .select("id, payload, created_at, confirmed_at")
    .eq("round_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) return NextResponse.json({ draft: null });
  return NextResponse.json({
    runId: run.id,
    confirmedAt: run.confirmed_at,
    draft: await enrichDraft(db, run.payload),
  });
}

async function enrichDraft(db: ReturnType<typeof supabaseAdmin>, draft: any) {
  const appIds: string[] = [
    ...draft.groups.flatMap((g: any) => g.members),
    ...draft.waitlist,
  ];
  if (appIds.length === 0) return draft;
  const { data: apps } = await db
    .from("applications")
    .select("id, region_1, region_2, interests, applied_at, person_id, persons(name, phone_enc, school)")
    .in("id", appIds);
  const map = new Map(
    (apps ?? []).map((a: any) => [
      a.id,
      {
        applicationId: a.id,
        personId: a.person_id,
        name: a.persons?.name ?? "",
        phone: (() => { try { return decryptPhone(a.persons?.phone_enc ?? ""); } catch { return ""; } })(),
        region1: a.region_1,
        region2: a.region_2,
        interests: a.interests ?? [],
        school: a.persons?.school ?? "",
        appliedAt: a.applied_at,
      },
    ])
  );
  return {
    ...draft,
    groups: draft.groups.map((g: any, i: number) => ({
      ...g,
      groupNo: i + 1,
      members: g.members.map((id: string) => map.get(id)).filter(Boolean),
    })),
    waitlist: draft.waitlist.map((id: string) => map.get(id)).filter(Boolean),
  };
}

// 수동 조정: 교환 / 대기자 교체 / 조장 변경
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;

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
    return NextResponse.json({ error: "NO_DRAFT", message: "확정 전 편성안이 없습니다." }, { status: 400 });
  }
  const draft = run.payload;

  if (action === "swap") {
    // { groupA: 0-based index, memberA: applicationId, groupB, memberB }
    const { groupA, memberA, groupB, memberB } = body;
    const ga = draft.groups[groupA];
    const gb = draft.groups[groupB];
    if (!ga || !gb) return NextResponse.json({ error: "BAD_REQUEST", message: "조 번호가 올바르지 않습니다." }, { status: 400 });
    const ia = ga.members.indexOf(memberA);
    const ib = gb.members.indexOf(memberB);
    if (ia < 0 || ib < 0) return NextResponse.json({ error: "BAD_REQUEST", message: "구성원을 찾을 수 없습니다." }, { status: 400 });
    [ga.members[ia], gb.members[ib]] = [gb.members[ib], ga.members[ia]];
    [ga.memberPersons[ia], gb.memberPersons[ib]] = [gb.memberPersons[ib], ga.memberPersons[ia]];
  } else if (action === "toWaitlist") {
    // { groupIndex, memberId } → 조원을 대기자로
    const { groupIndex, memberId } = body;
    const g = draft.groups[groupIndex];
    if (!g) return NextResponse.json({ error: "BAD_REQUEST", message: "조 번호가 올바르지 않습니다." }, { status: 400 });
    const i = g.members.indexOf(memberId);
    if (i < 0) return NextResponse.json({ error: "BAD_REQUEST", message: "구성원을 찾을 수 없습니다." }, { status: 400 });
    g.members.splice(i, 1);
    g.memberPersons.splice(i, 1);
    draft.waitlist.push(memberId);
  } else if (action === "fromWaitlist") {
    // { groupIndex, memberId } → 대기자를 조에 투입
    const { groupIndex, memberId } = body;
    const g = draft.groups[groupIndex];
    if (!g) return NextResponse.json({ error: "BAD_REQUEST", message: "조 번호가 올바르지 않습니다." }, { status: 400 });
    const wi = draft.waitlist.indexOf(memberId);
    if (wi < 0) return NextResponse.json({ error: "BAD_REQUEST", message: "대기자를 찾을 수 없습니다." }, { status: 400 });
    draft.waitlist.splice(wi, 1);
    g.members.push(memberId);
    // memberPersons 복원: enrich 시 매핑되므로 applicationId만으로 충분 — 여기서는 personId 조회
    const { data: app } = await db.from("applications").select("person_id").eq("id", memberId).single();
    g.memberPersons.push(app?.person_id ?? "");
  } else if (action === "setLeader") {
    // { groupIndex, personId }
    const { groupIndex, personId } = body;
    const g = draft.groups[groupIndex];
    if (!g || !g.memberPersons.includes(personId)) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "조 구성원이 아닙니다." }, { status: 400 });
    }
    g.leaderId = personId;
  } else {
    return NextResponse.json({ error: "BAD_ACTION", message: "지원하지 않는 조정입니다." }, { status: 400 });
  }

  // 조장 유효성: 조장이 조를 떠났으면 가장 빠른 신청자로 재지정
  for (const g of draft.groups) {
    if (!g.memberPersons.includes(g.leaderId) && g.memberPersons.length > 0) {
      g.leaderId = g.memberPersons[0];
    }
  }

  await db.from("match_runs").update({ payload: draft }).eq("id", run.id);
  return NextResponse.json({ draft: await enrichDraft(db, draft) });
}
