"use client";

import { useState } from "react";

const STATUS_LABEL: Record<string, string> = {
  APPLIED: "접수됨",
  GROUPED: "조 배정됨",
  WAITLIST: "대기자",
  CANCELLED: "취소됨",
  NOSHOW: "노쇼",
};

export default function CheckPage() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onPhone = (v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(0, 11);
    setPhone(d.length > 7 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d);
  };

  const check = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/apply/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message);
        setResult(null);
      } else {
        setResult(d);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-6 pt-16">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-navy mb-1">내 신청 확인</h1>
        <p className="text-sm text-muted mb-6">신청할 때 입력한 전화번호를 입력해 주세요.</p>
        <input
          className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-[16px] mb-3"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          placeholder="010-1234-5678"
          inputMode="numeric"
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button onClick={check} disabled={loading} className="w-full min-h-[52px] rounded-xl bg-navy text-white font-bold disabled:bg-slate-300">
          {loading ? "조회 중..." : "조회하기"}
        </button>

        {result && (
          <div className="mt-6">
            {!result.found ? (
              <p className="text-sm text-muted text-center">신청 내역이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {result.applications.map((a: any, i: number) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold">{a.round}</span>
                      <span className="text-xs rounded-full bg-softblue text-brand px-2.5 py-1 font-bold">{STATUS_LABEL[a.status] ?? a.status}</span>
                    </div>
                    <p className="text-xs text-muted">접수번호 {a.receiptNo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
