"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/rounds/${id}/result`).then((r) => r.json()).then(setData);
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
  }, [id]);

  const regionName = (code: string) => settings?.regions?.find((r: any) => r.code === code)?.name ?? code;
  const interestName = (code: string) => settings?.interests?.find((r: any) => r.code === code)?.name ?? code;

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const groupText = (g: any) => {
    const lines = g.members.map((m: any) => `${m.name} (${m.phone}) · ${m.school}`).join("\n");
    const common = g.commonInterests.map(interestName).join(", ") || "없음";
    return `[커피챗 ${g.groupNo}조 - ${regionName(g.region)}]\n${lines}\n공통 관심사: ${common}\n네 분이 직접 연락해서 시간과 장소를 정해 주세요!`;
  };

  const leaderText = (g: any) => {
    const others = g.members.filter((m: any) => m.name !== g.leader.name);
    const lines = others.map((m: any) => `${m.name} (${m.phone}) · ${m.school}`).join("\n");
    const common = g.commonInterests.map(interestName).join(", ") || "없음";
    return `[커피챗 ${g.groupNo}조 조장 안내]\n안녕하세요 ${g.leader.name}님! 이번 커피챗 ${g.groupNo}조(${regionName(g.region)})의 조장으로 지정되셨어요 🙏\n아래 세 분께 직접 연락해서 시간과 장소를 정해 주세요.\n${lines}\n공통 관심사: ${common}`;
  };

  if (!data) return <p className="text-muted">불러오는 중...</p>;

  return (
    <div>
      <div className="mb-6">
        <Link href={`/admin/rounds/${id}/match`} className="text-sm text-muted hover:underline">← 매칭 화면</Link>
        <div className="flex items-center justify-between mt-1 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-navy">{data.round?.title} <span className="text-base font-normal text-muted">매칭 결과</span></h1>
          <a href={`/api/admin/rounds/${id}/export?type=result`} className="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">
            전체 리스트 엑셀 다운로드
          </a>
        </div>
        <p className="text-sm text-muted mt-2">⚠️ 엑셀 파일에는 전화번호 전체가 포함됩니다. 안전하게 보관해 주세요.</p>
      </div>

      <div className="grid gap-4">
        {data.groups.map((g: any) => (
          <div key={g.groupNo} className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-bold text-lg text-navy">{g.groupNo}조 · {regionName(g.region)}</h2>
              <div className="flex gap-2">
                <button onClick={() => copy(`g${g.groupNo}`, groupText(g))} className="text-xs px-3 py-1.5 rounded-lg bg-softblue text-brand font-bold">
                  {copied === `g${g.groupNo}` ? "복사됨!" : "조별 안내문 복사"}
                </button>
                <button onClick={() => copy(`l${g.groupNo}`, leaderText(g))} className="text-xs px-3 py-1.5 rounded-lg bg-brand text-white font-bold">
                  {copied === `l${g.groupNo}` ? "복사됨!" : "조장 안내문 복사"}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-cream/60 border border-amber-200 p-3 mb-3">
              <p className="text-sm">
                <span className="font-bold">조장: {g.leader.name}</span>
                <span className="font-mono ml-2">{g.leader.phone}</span>
              </p>
              <p className="text-xs text-muted mt-1">조장에게 직접 연락해서 조원들에게 알아서 연락하라고 안내하세요.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {g.members.map((m: any) => (
                <div key={m.applicationId} className="text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-bold">{m.name}</span>
                  {m.name === g.leader.name && <span className="ml-1.5 text-xs bg-brand text-white rounded-full px-2 py-0.5 font-bold">조장</span>}
                  <span className="block text-xs text-muted font-mono">{m.phone} · {m.school}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">공통 관심사: {g.commonInterests.map(interestName).join(", ") || "없음"}</p>
          </div>
        ))}
      </div>

      {data.waitlist?.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5 mt-4">
          <h2 className="font-bold text-lg text-navy mb-2">대기자 ({data.waitlist.length}명)</h2>
          <p className="text-sm text-muted">{data.waitlist.join(", ")}</p>
          <button
            onClick={() => copy("wl", data.waitlist.map((n: string) => `${n}님, 신청해 주셔서 감사합니다. 이번 회차는 지역별 인원 구성상 대기자로 안내드립니다. 다음 회차에서 우선 배정해 드릴게요.`).join("\n\n"))}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-softblue text-brand font-bold"
          >
            {copied === "wl" ? "복사됨!" : "대기자 안내문 복사"}
          </button>
        </div>
      )}
    </div>
  );
}
