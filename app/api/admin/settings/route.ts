import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { DEFAULT_REGIONS, DEFAULT_INTERESTS } from "@/lib/constants";

export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db.from("settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return NextResponse.json({
    settings: {
      regions: map.get("regions") ?? DEFAULT_REGIONS,
      interests: map.get("interests") ?? DEFAULT_INTERESTS,
      interest_min: map.get("interest_min") ?? 1,
      interest_max: map.get("interest_max") ?? 3,
      consent_text: map.get("consent_text") ?? "",
      consent_version: map.get("consent_version") ?? "v1",
    },
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "잘못된 요청입니다." }, { status: 400 });
  }
  const allowed = ["regions", "interests", "interest_min", "interest_max", "consent_text", "consent_version"];
  const db = supabaseAdmin();
  for (const key of allowed) {
    if (key in body) {
      await db.from("settings").upsert({ key, value: body[key] }, { onConflict: "key" });
    }
  }
  return NextResponse.json({ ok: true });
}
