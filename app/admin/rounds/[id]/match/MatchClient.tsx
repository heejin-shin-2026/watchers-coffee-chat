"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [draft, setDraft] = useState<any>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [swapSel, setSwapSel] = useState<any>(null); // {gi, mi}

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = () => {
    if (!id) return;
    fetch(`/api/admin/rounds/${id}/match`)
      .then((r) => r.json())
      .then((d) => {
        setDraft(d.draft);
        setConfirmedAt(d.confirmedAt ?? null);
        setLoading(false);
      });
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
  };
  useEffect(load, [id]);

  const run = async () => {
    if (!confirm("자동 매칭을 실행할까요? 기존 편성안은 교체됩니다.")) return;
    setRunning(true);
    const res = await fetch(`/api/admin/rounds/${id}/match`, { method: "POST" });
    const d = await res.json();
    setRunning(false);
    if (!res.ok) return alert(d.message);
    setDraft(d.draft);
    setConfirmedAt(null);
  };

  const adjust = async (body: any) => {
    const res = await fetch(`/api/admin/rounds/${id}/match`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (!res.ok) return alert(d.message);
    setDraft(d.draft);
    setSwapSel(null);
  };

  const confirmMatch = async () => {
    if (!confirm("이 편성안으로 확정할까요? 확정 후 조별 안내가 가능합니다.")) return;
    const res = await fetch(`/api/admin/rounds/${id}/match/confirm`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) return alert(d.message);
    alert(`${d.groupCount}개 조, 대기자 ${d.waitlistCount}명으로 확정되었습니다.`);
    load();
  };

  const unconfirm = async () => {
    if (!confirm("확정을 취소할까요? 안내를 이미 보냈다면 직접 정정 안내가 필요합니다.")) return;
    const res = await fetch(`/api/admin/rounds/${id}/match/unconfirm`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) return alert(d.message);
    load();
  };

  const regionName = (code: string) => settings?.regions?.find((r: any) => r.code === code)?.name ?? code;
  const interestName = (code: string) => settings?.interests?.find((r: any) => r.code === code)?.name ?? code;

  if (loading) return <p className="text-muted">불러오는 중...</p>;

  return (
    <div>
      <div className="mb-6">
        <Link href={`/admin/rounds/${id}`} className="text-sm text-muted hover:underline">← 신청자 관리</Link>
        <div className="flex items-center justify-between mt-1 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-navy">자동 매칭</h1>
          <div className="flex gap-2">
            {!confirmedAt && (
              <button onClick={run} disabled={running} className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold disabled:bg-slate-300">
                {running ? "매칭 중..." : draft ? "다시 매칭" : "자동 매칭 실행"}
              </button>
            )}
            {confirmedAt && (
              <>
                <Link href={`/admin/rounds/${id}/result`} className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold">
                  결과 보기 →
                </Link>
                <button onClick={unconfirm} className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold">
                  확정 취소
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {!draft ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center text-muted">
          신청을 마감한 뒤 매칭을 실행할 수 있습니다.
        </div>
      ) : (
        <>
          {draft.qualityWarning && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 mb-4 text-sm">
              ⚠️ {draft.qualityWarning}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {draft.groups.map((g: any) => (
              <div key={g.groupNo} className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg text-navy">{g.groupNo}조</h2>
                  <span className="text-xs text-muted">점수 {g.score}</span>
                </div>
                {g.warnings?.map((w: string, i: number) => (
                  <p key={i} className="text-xs bg-yellow-50 text-yellow-700 rounded-lg px-2.5 py-1.5 mb-2">⚠️ {w}</p>
                ))}
                <div className="space-y-2">
                  {g.members.map((m: any) => {
                    const isLeader = m.personId === g.leaderId;
                    return (
                      <div key={m.applicationId} className={`rounded-xl border p-3 ${isLeader ? "border-brand bg-softblue" : "border-slate-100"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold">{m.name}</span>
                            {isLeader && <span className="ml-2 text-xs bg-brand text-white rounded-full px-2 py-0.5 font-bold">조장</span>}
                            <span className="block text-xs text-muted font-mono">{m.phone}</span>
                            <span className="block text-xs text-muted">{m.school} · {regionName(m.region1)} · {m.interests.map(interestName).join(", ")}</span>
                          </div>
                          {!confirmedAt && (
                            <div className="flex flex-col gap-1">
                              {!isLeader && (
                                <button onClick={() => adjust({ action: "setLeader", groupIndex: g.groupNo - 1, personId: m.personId })} className="text-xs px-2 py-1 rounded bg-slate-100">
                                  조장으로
                                </button>
                              )}
                              <button
                                onClick={() => setSwapSel(swapSel?.gi === g.groupNo - 1 && swapSel?.mi === m.applicationId ? null : { gi: g.groupNo - 1, mi: m.applicationId })}
                                className="text-xs px-2 py-1 rounded bg-slate-100"
                              >
                                교환
                              </button>
                              <button onClick={() => { if (confirm(`${m.name}님을 대기자로 옮길까요?`)) adjust({ action: "toWaitlist", groupIndex: g.groupNo - 1, memberId: m.applicationId }); }} className="text-xs px-2 py-1 rounded bg-slate-100 text-muted">
                                대기로
                              </button>
                            </div>
                          )}
                        </div>
                        {swapSel?.gi === g.groupNo - 1 && swapSel?.mi === m.applicationId && (
                          <SwapPicker
                            groups={draft.groups}
                            fromGi={g.groupNo - 1}
                            fromMi={m.applicationId}
                            onPick={(tgi: number, tmi: string) => adjust({ action: "swap", groupA: g.groupNo - 1, memberA: m.applicationId, groupB: tgi, memberB: tmi })}
                            onCancel={() => setSwapSel(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted mt-3">공통 관심사: {g.commonInterests.map(interestName).join(", ") || "없음"}</p>
              </div>
            ))}
          </div>

          {draft.waitlist?.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-5 mb-8">
              <h2 className="font-bold text-lg text-navy mb-3">대기자 ({draft.waitlist.length}명)</h2>
              <div className="flex flex-wrap gap-2">
                {draft.waitlist.map((m: any) => (
                  <div key={m.applicationId} className="rounded-xl border border-slate-200 px-3 py-2 text-sm flex items-center gap-2">
                    <span className="font-bold">{m.name}</span>
                    <span className="text-xs text-muted">{regionName(m.region1)}</span>
                    {!confirmedAt && (
                      <select
                        className="text-xs border rounded px-1 py-0.5"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value !== "") {
                            adjust({ action: "fromWaitlist", groupIndex: Number(e.target.value), memberId: m.applicationId });
                          }
                        }}
                      >
                        <option value="">조에 투입</option>
                        {draft.groups.map((g: any) => (
                          <option key={g.groupNo} value={g.groupNo - 1}>{g.groupNo}조로</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!confirmedAt && (
            <button onClick={confirmMatch} className="w-full py-4 rounded-2xl bg-navy text-white text-lg font-bold">
              이 편성안으로 확정하기
            </button>
          )}
        </>
      )}
    </div>
  );
}

function SwapPicker({ groups, fromGi, fromMi, onPick, onCancel }: any) {
  const [tgi, setTgi] = useState("");
  const [tmi, setTmi] = useState("");
  const target = groups.find((g: any) => g.groupNo - 1 === Number(tgi));
  return (
    <div className="mt-2 rounded-lg bg-slate-50 p-2 flex gap-1 items-center flex-wrap">
      <select value={tgi} onChange={(e) => { setTgi(e.target.value); setTmi(""); }} className="text-xs border rounded px-1.5 py-1">
        <option value="">조 선택</option>
        {groups.filter((g: any) => g.groupNo - 1 !== fromGi).map((g: any) => (
          <option key={g.groupNo} value={g.groupNo - 1}>{g.groupNo}조</option>
        ))}
      </select>
      {target && (
        <select value={tmi} onChange={(e) => setTmi(e.target.value)} className="text-xs border rounded px-1.5 py-1">
          <option value="">구성원 선택</option>
          {target.members.map((m: any) => (
            <option key={m.applicationId} value={m.applicationId}>{m.name}</option>
          ))}
        </select>
      )}
      <button disabled={!tmi} onClick={() => onPick(Number(tgi), tmi)} className="text-xs px-2 py-1 rounded bg-brand text-white font-bold disabled:bg-slate-300">
        교환 실행
      </button>
      <button onClick={onCancel} className="text-xs px-2 py-1 text-muted">취소</button>
    </div>
  );
}
