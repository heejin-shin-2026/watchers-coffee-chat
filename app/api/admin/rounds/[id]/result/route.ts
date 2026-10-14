import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptPhone, formatPhone } from "@/lib/crypto";

// 확정된 결과 조회 (안내문 생성용)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: round } = await db.from("rounds").select("id, title, status").eq("id", id).single();
  if (!round) {
    return NextResponse.json({ error: "NOT_FOUND", message: "회차를 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: groups } = await db
    .from("groups")
    .select("id, group_no, region, common_interests, group_members(application_id, is_leader, applications(region_1, region_2, interests, persons(name, phone_enc, school)))")
    .eq("round_id", id)
    .order("group_no");

  const out = (groups ?? []).map((g: any) => {
    const members = (g.group_members ?? []).map((m: any) => {
      const a = m.applications;
      let phone = "";
      try { phone = formatPhone(decryptPhone(a.persons?.phone_enc ?? "")); } catch {}
      return {
        applicationId: m.application_id,
        personId: "",
        name: a.persons?.name ?? "",
        phone,
        school: a.persons?.school ?? "",
        region1: a.region_1,
        isLeader: m.is_leader,
      };
    });
    const leader = members.find((m: any) => m.isLeader) ?? members[0];
    return {
      groupNo: g.group_no,
      region: g.region,
      commonInterests: g.common_interests ?? [],
      members,
      leader,
    };
  });

  const { data: wl } = await db
    .from("applications")
    .select("persons(name)")
    .eq("round_id", id)
    .eq("status", "WAITLIST");
  const waitlist = (wl ?? []).map((w: any) => w.persons?.name ?? "");

  return NextResponse.json({ round, groups: out, waitlist });
}
