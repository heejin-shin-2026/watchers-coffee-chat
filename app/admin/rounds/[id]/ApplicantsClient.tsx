"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  APPLIED: "접수",
  GROUPED: "조배정",
  WAITLIST: "대기",
  CANCELLED: "취소",
  NOSHOW: "노쇼",
};

export default function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [round, setRound] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [byRegion, setByRegion] = useState<Record<string, number>>({});
  const [byInterest, setByInterest] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [fRegion, setFRegion] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = () => {
    if (!id) return;
    fetch(`/api/admin/rounds/${id}`).then((r) => r.json()).then((d) => setRound(d.round));
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (fRegion) sp.set("region", fRegion);
    if (fStatus) sp.set("status", fStatus);
    fetch(`/api/admin/rounds/${id}/applications?${sp.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setApps(d.applications ?? []);
        setByRegion(d.byRegion ?? {});
        setByInterest(d.byInterest ?? {});
      });
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
  };

  useEffect(load, [id]);

  const applyFilter = () => load();

  const setAppStatus = async (appId: string, status: string, label: string) => {
    if (!confirm(`이 신청을 '${label}' 처리할까요?`)) return;
    const res = await fetch(`/api/admin/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const d = await res.json();
      return alert(d.message);
    }
    load();
  };

  const regionName = (code: string) => settings?.regions?.find((r: any) => r.code === code)?.name ?? code;
  const interestName = (code: string) => settings?.interests?.find((r: any) => r.code === code)?.name ?? code;

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-muted hover:underline">← 회차 목록</Link>
        <h1 className="text-2xl font-bold text-navy mt-1">{round?.title} <span className="text-base font-normal text-muted">신청자 관리</span></h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-xs text-muted mb-1">전체 신청자</p>
          <p className="text-2xl font-bold">{apps.length}명</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 col-span-1">
          <p className="text-xs text-muted mb-1">지역별</p>
          <div className="text-sm space-y-0.5">
            {Object.entries(byRegion).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span>{regionName(k)}</span><b>{v}</b></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-4 col-span-2">
          <p className="text-xs text-muted mb-1">관심사별</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(byInterest).map(([k, v]) => (
              <span key={k} className="text-xs bg-softblue text-brand rounded-full px-2.5 py-1 font-bold">{interestName(k)} {v}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-4 flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-muted">검색 (이름·전화번호 뒤 4자리·접수번호)</label>
          <input className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 mt-1" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyFilter()} />
        </div>
        <div>
          <label className="text-xs text-muted">지역</label>
          <select className="min-h-[44px] rounded-xl border border-slate-200 px-3 mt-1" value={fRegion} onChange={(e) => setFRegion(e.target.value)}>
            <option value="">전체</option>
            {settings?.regions?.map((r: any) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted">상태</label>
          <select className="min-h-[44px] rounded-xl border border-slate-200 px-3 mt-1" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">전체</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button onClick={applyFilter} className="min-h-[44px] px-5 rounded-xl bg-navy text-white text-sm font-bold">조회</button>
        <a href={`/api/admin/rounds/${id}/export?type=applicants`} className="min-h-[44px] px-5 rounded-xl border border-slate-200 text-sm font-bold inline-flex items-center">
          엑셀 다운로드
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-xs text-muted border-b">
              <th className="p-3">접수번호</th>
              <th className="p-3">이름</th>
              <th className="p-3">전화번호</th>
              <th className="p-3">지역</th>
              <th className="p-3">소속</th>
              <th className="p-3">관심사</th>
              <th className="p-3">상태</th>
              <th className="p-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="p-3 font-mono text-xs">{a.receiptNo}</td>
                <td className="p-3 font-bold">{a.name}</td>
                <td className="p-3 font-mono">{a.phoneMasked}</td>
                <td className="p-3">{regionName(a.region1)}</td>
                <td className="p-3 text-muted">{a.school}</td>
                <td className="p-3 text-xs">{a.interests.map(interestName).join(", ")}</td>
                <td className="p-3"><span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">{STATUS_LABEL[a.status]}</span></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {a.status === "APPLIED" && (
                      <>
                        <button onClick={() => setAppStatus(a.id, "CANCELLED", "취소")} className="text-xs px-2 py-1 rounded bg-slate-100">취소</button>
                        <button onClick={() => setAppStatus(a.id, "NOSHOW", "노쇼")} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600">노쇼</button>
                      </>
                    )}
                    {(a.status === "CANCELLED" || a.status === "NOSHOW") && (
                      <button onClick={() => setAppStatus(a.id, "APPLIED", "접수로 복원")} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">복원</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {apps.length === 0 && <p className="p-8 text-center text-muted">아직 신청이 없습니다. 단톡방에 신청 링크를 공지했는지 확인해 보세요.</p>}
      </div>

      <div className="mt-6 flex gap-2">
        {(round?.status === "CLOSED" || round?.status === "MATCHED") && (
          <Link href={`/admin/rounds/${id}/match`} className="px-6 py-3 rounded-xl bg-brand text-white font-bold">
            매칭 화면으로 →
          </Link>
        )}
      </div>
    </div>
  );
}
