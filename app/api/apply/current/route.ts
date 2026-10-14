import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { DEFAULT_REGIONS, DEFAULT_INTERESTS, INTEREST_MIN, INTEREST_MAX, CONSENT_TEXT, CONSENT_POLICY_VERSION } from "@/lib/constants";

async function getSettings(db: ReturnType<typeof supabaseAdmin>) {
  const { data } = await db.from("settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    regions: map.get("regions") ?? DEFAULT_REGIONS,
    interests: map.get("interests") ?? DEFAULT_INTERESTS,
    interestMin: map.get("interest_min") ?? INTEREST_MIN,
    interestMax: map.get("interest_max") ?? INTEREST_MAX,
    consentText: map.get("consent_text") ?? CONSENT_TEXT,
    consentVersion: map.get("consent_version") ?? CONSENT_POLICY_VERSION,
  };
}

// 현재 열린 회차 + 폼 선택지 (인증 없음)
export async function GET() {
  const db = supabaseAdmin();
  const settings = await getSettings(db);
  const { data: round } = await db
    .from("rounds")
    .select("id, title, status, open_at, close_at")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!round) {
    return NextResponse.json({ open: false, settings });
  }
  // 마감 시각이 지났으면 자동으로 CLOSED 처리
  if (round.close_at && new Date(round.close_at) < new Date()) {
    await db.from("rounds").update({ status: "CLOSED" }).eq("id", round.id);
    return NextResponse.json({ open: false, settings });
  }
  return NextResponse.json({ open: true, round, settings });
}
