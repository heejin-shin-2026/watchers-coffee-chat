"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";

export default function SettingsPage() {
  const [regions, setRegions] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [consentText, setConsentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setRegions(d.settings.regions ?? []);
        setInterests(d.settings.interests ?? []);
        setConsentText(d.settings.consent_text ?? "");
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regions, interests, consent_text: consentText }),
    });
    setSaving(false);
    setMsg(res.ok ? "저장되었습니다." : "저장 중 오류가 발생했습니다.");
  };

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="max-w-3xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold text-navy mb-6">설정</h1>

        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <h2 className="font-bold mb-3">선호지역 목록</h2>
          {regions.map((r, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="flex-1 min-h-[44px] rounded-xl border border-slate-200 px-3" value={r.code} onChange={(e) => { const n = [...regions]; n[i] = { ...n[i], code: e.target.value }; setRegions(n); }} placeholder="코드 (예: GANGNAM)" />
              <input className="flex-1 min-h-[44px] rounded-xl border border-slate-200 px-3" value={r.name} onChange={(e) => { const n = [...regions]; n[i] = { ...n[i], name: e.target.value }; setRegions(n); }} placeholder="이름 (예: 강남·서초)" />
              <input className="flex-[2] min-h-[44px] rounded-xl border border-slate-200 px-3" value={r.examples} onChange={(e) => { const n = [...regions]; n[i] = { ...n[i], examples: e.target.value }; setRegions(n); }} placeholder="동네 예시" />
              <button onClick={() => setRegions(regions.filter((_, j) => j !== i))} className="px-3 text-red-500">삭제</button>
            </div>
          ))}
          <button onClick={() => setRegions([...regions, { code: "", name: "", examples: "" }])} className="text-sm text-brand font-bold mt-1">+ 지역 추가</button>
          <p className="text-xs text-muted mt-2">권역이 많아질수록 같은 지역끼리 4명을 모으기 어려워집니다. 5~7개 유지를 권장합니다.</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <h2 className="font-bold mb-3">투자 관심사 목록</h2>
          {interests.map((r, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="flex-1 min-h-[44px] rounded-xl border border-slate-200 px-3" value={r.code} onChange={(e) => { const n = [...interests]; n[i] = { ...n[i], code: e.target.value }; setInterests(n); }} placeholder="코드" />
              <input className="flex-[2] min-h-[44px] rounded-xl border border-slate-200 px-3" value={r.name} onChange={(e) => { const n = [...interests]; n[i] = { ...n[i], name: e.target.value }; setInterests(n); }} placeholder="표시명" />
              <button onClick={() => setInterests(interests.filter((_, j) => j !== i))} className="px-3 text-red-500">삭제</button>
            </div>
          ))}
          <button onClick={() => setInterests([...interests, { code: "", name: "" }])} className="text-sm text-brand font-bold mt-1">+ 관심사 추가</button>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="font-bold mb-3">개인정보 동의 문구</h2>
          <textarea className="w-full rounded-xl border border-slate-200 px-3 py-3 min-h-[160px] text-sm" value={consentText} onChange={(e) => setConsentText(e.target.value)} />
        </div>

        <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl bg-navy text-white font-bold disabled:bg-slate-300">
          {saving ? "저장 중..." : "설정 저장"}
        </button>
        {msg && <p className="text-center text-sm mt-3 text-green-700">{msg}</p>}
      </main>
    </div>
  );
}
