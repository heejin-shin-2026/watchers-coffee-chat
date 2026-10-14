import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptPhone, maskPhone } from "@/lib/crypto";

// 신청자 목록 (검색·필터·집계)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const region = req.nextUrl.searchParams.get("region") ?? "";
  const interest = req.nextUrl.searchParams.get("interest") ?? "";
  const status = req.nextUrl.searchParams.get("status") ?? "";

  const db = supabaseAdmin();
  let query = db
    .from("applications")
    .select("id, receipt_no, region_1, region_2, interests, memo, status, applied_at, person_id, persons(name, phone_enc, phone_last4, school)")
    .eq("round_id", id)
    .order("applied_at", { ascending: false })
    .limit(1000);

  if (region) query = query.eq("region_1", region);
  if (status) query = query.eq("status", status);
  if (interest) query = query.contains("interests", [interest]);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "DB_ERROR", message: "조회 중 오류가 발생했습니다." }, { status: 500 });
  }

  let rows = (data ?? []).map((a: any) => ({
    id: a.id,
    receiptNo: a.receipt_no,
    name: a.persons?.name ?? "",
    phoneMasked: `010-****-${a.persons?.phone_last4 ?? "****"}`,
    phoneLast4: a.persons?.phone_last4 ?? "",
    region1: a.region_1,
    region2: a.region_2,
    interests: a.interests,
    school: a.persons?.school ?? "",
    memo: a.memo ?? "",
    status: a.status,
    appliedAt: a.applied_at,
  }));

  if (q) {
    const needle = q.replace(/-/g, "");
    rows = rows.filter(
      (r) => r.name.includes(q) || r.phoneLast4.includes(needle) || (r.receiptNo ?? "").includes(q)
    );
  }

  // 집계
  const byRegion: Record<string, number> = {};
  const byInterest: Record<string, number> = {};
  for (const r of rows) {
    byRegion[r.region1] = (byRegion[r.region1] ?? 0) + 1;
    for (const i of r.interests ?? []) byInterest[i] = (byInterest[i] ?? 0) + 1;
  }

  return NextResponse.json({ applications: rows, total: rows.length, byRegion, byInterest });
}
