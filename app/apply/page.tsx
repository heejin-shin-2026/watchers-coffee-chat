"use client";

import { useEffect, useState } from "react";

interface Settings {
  regions: { code: string; name: string; examples: string }[];
  interests: { code: string; name: string }[];
  interestMin: number;
  interestMax: number;
  consentText: string;
  consentVersion: string;
}

export default function ApplyPage() {
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region1, setRegion1] = useState("");
  const [region2, setRegion2] = useState("");
  const [school, setSchool] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    fetch("/api/apply/current")
      .then((r) => r.json())
      .then((d) => {
        setRound(d.open ? d.round : null);
        setSettings(d.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const onPhone = (v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(0, 11);
    const f = d.length > 7 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
    setPhone(f);
  };

  const toggleInterest = (code: string) => {
    setInterests((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : prev.length >= (settings?.interestMax ?? 3) ? prev : [...prev, code]
    );
  };

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, region1, region2: region2 || null, school, interests, memo, consent }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message || "오류가 발생했습니다.");
        setSubmitting(false);
        return;
      }
      const q = new URLSearchParams({ receiptNo: d.receiptNo, updated: d.updated ? "1" : "0", name });
      location.href = `/apply/done?${q.toString()}`;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-4xl mb-4">☕</div>
          <h1 className="text-xl font-bold text-navy mb-2">신청이 마감되었습니다</h1>
          <p className="text-muted">이번 회차 신청이 마감되었습니다. 다음 회차를 기다려 주세요.</p>
        </div>
      </div>
    );
  }

  const closeDate = round.close_at ? new Date(round.close_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

  const inputCls =
    "w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white";

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-navy text-white px-5 py-6">
        <p className="text-xs tracking-widest text-blue-200 mb-1">WATCHERS COFFEE CHAT</p>
        <h1 className="text-2xl font-bold">{round.title}</h1>
        {closeDate && <p className="text-sm text-blue-100 mt-1">신청 마감: {closeDate}</p>}
      </header>

      <main className="max-w-lg mx-auto px-5 -mt-3">
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold mb-1.5">이름 <span className="text-brand">*</span></label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="실명을 입력해 주세요" maxLength={20} />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">전화번호 <span className="text-brand">*</span></label>
            <input className={inputCls} value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="010-1234-5678" inputMode="numeric" />
            <p className="text-xs text-muted mt-1">본인 확인용입니다. 같은 번호로 다시 신청하면 내용이 업데이트됩니다.</p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">선호지역 1순위 <span className="text-brand">*</span></label>
            <div className="grid grid-cols-1 gap-2">
              {settings?.regions.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setRegion1(r.code)}
                  className={`text-left rounded-xl border px-4 py-3 ${region1 === r.code ? "border-brand bg-softblue ring-1 ring-brand" : "border-slate-200"}`}
                >
                  <span className="font-bold text-[15px]">{r.name}</span>
                  <span className="block text-xs text-muted mt-0.5">{r.examples}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">선호지역 2순위 <span className="text-muted font-normal">(선택)</span></label>
            <select className={inputCls} value={region2} onChange={(e) => setRegion2(e.target.value)}>
              <option value="">선택 안 함</option>
              {settings?.regions.filter((r) => r.code !== region1).map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">대학원 소속 <span className="text-brand">*</span></label>
            <input className={inputCls} value={school} onChange={(e) => setSchool(e.target.value)} placeholder="예: OO대 경영대학원" maxLength={40} />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">
              투자 관심사 <span className="text-brand">*</span>
              <span className="text-muted font-normal text-xs ml-1">최대 {settings?.interestMax ?? 3}개</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {settings?.interests.map((it) => (
                <button
                  key={it.code}
                  type="button"
                  onClick={() => toggleInterest(it.code)}
                  className={`rounded-full px-4 py-2.5 text-[15px] border min-h-[44px] ${interests.includes(it.code) ? "bg-navy text-white border-navy" : "border-slate-200 bg-white"}`}
                >
                  {it.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">하고 싶은 말 <span className="text-muted font-normal">(선택, 100자)</span></label>
            <textarea className={`${inputCls} py-3`} value={memo} onChange={(e) => setMemo(e.target.value.slice(0, 100))} rows={2} placeholder="운영자에게 전하고 싶은 말 (조 안내문에 표시되지 않습니다)" />
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-5 h-5 accent-[#2563EB]" />
              <span className="text-sm">
                <span className="font-bold">개인정보 수집·이용에 동의합니다 <span className="text-brand">*</span></span>
                <button type="button" onClick={(e) => { e.preventDefault(); setShowConsent(!showConsent); }} className="block text-brand text-xs mt-1 underline">
                  {showConsent ? "접기" : "동의 전문 보기"}
                </button>
              </span>
            </label>
            {showConsent && (
              <pre className="mt-2 text-xs text-muted whitespace-pre-wrap bg-white rounded-lg p-3 border border-slate-100">{settings?.consentText}</pre>
            )}
          </div>

          {error && <p className="text-red-600 text-sm font-bold">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting || !consent}
            className="w-full min-h-[52px] rounded-xl bg-brand text-white text-lg font-bold disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {submitting ? "접수 중..." : "신청하기"}
          </button>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          <a href="/apply/check" className="underline">내 신청 확인하기</a>
        </p>
      </main>
    </div>
  );
}
