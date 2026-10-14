import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPhone, normalizePhone, maskPhone } from "@/lib/crypto";
import { regionName, interestNames } from "@/lib/constants";

// 본인 신청 상태 조회 (전화번호)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = normalizePhone(String(body?.phone ?? ""));
  if (!/^010\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "PHONE_INVALID", message: "전화번호 11자리를 입력해 주세요." }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data: person } = await db
    .from("persons")
    .select("id, name")
    .eq("phone_hash", hashPhone(phone))
    .maybeSingle();
  if (!person) {
    return NextResponse.json({ found: false });
  }
  const { data: apps } = await db
    .from("applications")
    .select("id, status, region_1, interests, applied_at, receipt_no, rounds(title, status)")
    .eq("person_id", person.id)
    .order("applied_at", { ascending: false })
    .limit(5);
  return NextResponse.json({
    found: true,
    name: person.name,
    phone: maskPhone(phone),
    applications: (apps ?? []).map((a: any) => ({
      receiptNo: a.receipt_no,
      round: a.rounds?.title,
      roundStatus: a.rounds?.status,
      status: a.status,
      region: a.region_1,
      interests: a.interests,
      appliedAt: a.applied_at,
    })),
  });
}
