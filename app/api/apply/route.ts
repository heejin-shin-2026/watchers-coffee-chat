import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  encryptPhone, hashPhone, normalizePhone, isValidPhone, formatPhone,
} from "@/lib/crypto";
import { CONSENT_POLICY_VERSION, INTEREST_MIN, INTEREST_MAX, DEFAULT_INTERESTS, MESSAGES } from "@/lib/constants";

const ipHits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (ipHits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  ipHits.set(ip, arr);
  return arr.length > 5;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "잘못된 요청입니다." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const phoneRaw = normalizePhone(String(body.phone ?? ""));
  const region1 = String(body.region1 ?? "");
  const region2 = body.region2 ? String(body.region2) : null;
  const school = String(body.school ?? "").trim();
  const interests: string[] = Array.isArray(body.interests) ? body.interests.map(String) : [];
  const memo = String(body.memo ?? "").slice(0, 100);
  const consent = body.consent === true;

  if (name.length < 2 || name.length > 20) {
    return NextResponse.json({ error: "NAME_INVALID", message: "이름을 2~20자로 입력해 주세요." }, { status: 400 });
  }
  if (!isValidPhone(phoneRaw)) {
    return NextResponse.json({ error: "PHONE_INVALID", message: "전화번호 11자리를 입력해 주세요." }, { status: 400 });
  }
  if (!region1) {
    return NextResponse.json({ error: "REGION_REQUIRED", message: "선호지역 1순위를 선택해 주세요." }, { status: 400 });
  }
  if (region2 && region2 === region1) {
    return NextResponse.json({ error: "REGION_DUP", message: "2순위는 1순위와 다른 지역을 선택해 주세요." }, { status: 400 });
  }
  if (!school) {
    return NextResponse.json({ error: "SCHOOL_REQUIRED", message: "대학원 소속을 입력해 주세요." }, { status: 400 });
  }
  const validInterestCodes = new Set(DEFAULT_INTERESTS.map((i) => i.code));
  // 설정에서 바뀔 수 있으므로 DB 설정도 확인 (간소화: 기본 목록 + DB 목록 합집합은 current API에서 내려줌)
  if (interests.length < INTEREST_MIN || interests.length > INTEREST_MAX) {
    return NextResponse.json({ error: "INTEREST_COUNT", message: `관심사는 ${INTEREST_MIN}개 이상 ${INTEREST_MAX}개 이하로 선택해 주세요.` }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "CONSENT_REQUIRED", message: "개인정보 수집·이용에 동의해 주세요." }, { status: 400 });
  }

  const db = supabaseAdmin();

  // 열린 회차 확인 (동시에 1개만 OPEN)
  const { data: round } = await db
    .from("rounds")
    .select("id, title, status, close_at, receipt_counter")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!round || (round.close_at && new Date(round.close_at) < new Date())) {
    return NextResponse.json({ error: "ROUND_CLOSED", message: MESSAGES.closed }, { status: 400 });
  }

  const phoneHash = hashPhone(phoneRaw);

  // persons upsert (전화번호 기준 1인 1행)
  const { data: existingPerson } = await db
    .from("persons")
    .select("id")
    .eq("phone_hash", phoneHash)
    .maybeSingle();

  let personId: string;
  if (existingPerson) {
    personId = existingPerson.id;
    await db.from("persons").update({ name, school }).eq("id", personId);
  } else {
    const { data: p, error: pErr } = await db
      .from("persons")
      .insert({
        name,
        phone_enc: encryptPhone(phoneRaw),
        phone_hash: phoneHash,
        phone_last4: phoneRaw.slice(-4),
        school,
      })
      .select("id")
      .single();
    if (pErr || !p) {
      return NextResponse.json({ error: "DB_ERROR", message: "저장 중 오류가 발생했습니다." }, { status: 500 });
    }
    personId = p.id;
  }

  // 같은 회차 중복 신청 → 덮어쓰기 (3.5절)
  const { data: existingApp } = await db
    .from("applications")
    .select("id, receipt_no")
    .eq("round_id", round.id)
    .eq("person_id", personId)
    .maybeSingle();

  const appPayload = {
    region_1: region1,
    region_2: region2,
    interests,
    memo,
    status: "APPLIED",
    applied_at: new Date().toISOString(),
  };

  let receiptNo: string;
  let updated = false;
  if (existingApp) {
    const { error } = await db.from("applications").update(appPayload).eq("id", existingApp.id);
    if (error) {
      return NextResponse.json({ error: "DB_ERROR", message: "저장 중 오류가 발생했습니다." }, { status: 500 });
    }
    receiptNo = existingApp.receipt_no;
    updated = true;
  } else {
    // 접수번호 발급: R{회차번호}-{순번}
    const counter = (round.receipt_counter ?? 0) + 1;
    await db.from("rounds").update({ receipt_counter: counter }).eq("id", round.id);
    receiptNo = `R${round.id.slice(0, 4).toUpperCase()}-${String(counter).padStart(3, "0")}`;
    const { error } = await db.from("applications").insert({
      round_id: round.id,
      person_id: personId,
      receipt_no: receiptNo,
      ...appPayload,
    });
    if (error) {
      return NextResponse.json({ error: "DB_ERROR", message: "저장 중 오류가 발생했습니다." }, { status: 500 });
    }
  }

  // 동의 로그 (삭제 금지)
  await db.from("consent_logs").insert({
    person_id: personId,
    round_id: round.id,
    policy_version: CONSENT_POLICY_VERSION,
    ip,
  });

  return NextResponse.json({
    receiptNo,
    updated,
    message: updated ? MESSAGES.applyUpdated : MESSAGES.applyDone,
    phone: formatPhone(phoneRaw),
  });
}
