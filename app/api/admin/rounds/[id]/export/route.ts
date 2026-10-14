import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { decryptPhone, formatPhone } from "@/lib/crypto";
import { regionName, interestNames } from "@/lib/constants";
import * as XLSX from "xlsx";

// 엑셀 다운로드: ?type=applicants | result
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const type = req.nextUrl.searchParams.get("type") ?? "applicants";
  const db = supabaseAdmin();

  const { data: round } = await db.from("rounds").select("title").eq("id", id).single();
  const title = round?.title ?? "coffee-chat";

  if (type === "result") {
    const { data: groups } = await db
      .from("groups")
      .select("group_no, region, common_interests, group_members(application_id, is_leader, applications(persons(name, phone_enc, school), region_1, region_2, interests))")
      .eq("round_id", id)
      .order("group_no");
    const rows: any[] = [];
    for (const g of groups ?? []) {
      for (const m of (g as any).group_members ?? []) {
        const a = m.applications;
        let phone = "";
        try { phone = formatPhone(decryptPhone(a.persons?.phone_enc ?? "")); } catch {}
        rows.push({
          "조": `${g.group_no}조`,
          "조장": m.is_leader ? "O" : "",
          "이름": a.persons?.name ?? "",
          "전화번호": phone,
          "지역(1순위)": a.region_1,
          "지역(2순위)": a.region_2 ?? "",
          "소속": a.persons?.school ?? "",
          "관심사": interestNames(a.interests ?? []).join(", "),
        });
      }
    }
    // 대기자
    const { data: wl } = await db
      .from("applications")
      .select("persons(name, phone_enc, school), region_1, interests")
      .eq("round_id", id)
      .eq("status", "WAITLIST");
    for (const w of wl ?? []) {
      let phone = "";
      try { phone = formatPhone(decryptPhone((w as any).persons?.phone_enc ?? "")); } catch {}
      rows.push({
        "조": "대기자",
        "조장": "",
        "이름": (w as any).persons?.name ?? "",
        "전화번호": phone,
        "지역(1순위)": (w as any).region_1,
        "지역(2순위)": "",
        "소속": (w as any).persons?.school ?? "",
        "관심사": interestNames((w as any).interests ?? []).join(", "),
      });
    }
    return xlsxResponse(rows, `${title}-결과.xlsx`);
  }

  // 신청자 목록
  const { data: apps } = await db
    .from("applications")
    .select("receipt_no, region_1, region_2, interests, memo, status, applied_at, persons(name, phone_enc, school)")
    .eq("round_id", id)
    .order("applied_at", { ascending: true });
  const rows = (apps ?? []).map((a: any) => {
    let phone = "";
    try { phone = formatPhone(decryptPhone(a.persons?.phone_enc ?? "")); } catch {}
    return {
      "접수번호": a.receipt_no,
      "이름": a.persons?.name ?? "",
      "전화번호": phone,
      "지역(1순위)": a.region_1,
      "지역(2순위)": a.region_2 ?? "",
      "소속": a.persons?.school ?? "",
      "관심사": interestNames(a.interests ?? []).join(", "),
      "하고싶은말": a.memo ?? "",
      "상태": a.status,
      "신청시각": a.applied_at,
    };
  });
  return xlsxResponse(rows, `${title}-신청자.xlsx`);
}

function xlsxResponse(rows: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "sheet1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
