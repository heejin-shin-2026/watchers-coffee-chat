"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "준비중", cls: "bg-slate-100 text-slate-600" },
  OPEN: { label: "신청접수중", cls: "bg-green-100 text-green-700" },
  CLOSED: { label: "마감됨", cls: "bg-amber-100 text-amber-700" },
  MATCHED: { label: "매칭완료", cls: "bg-blue-100 text-blue-700" },
  ARCHIVED: { label: "보관됨", cls: "bg-slate-100 text-slate-400" },
};

export default function RoundList() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [autoOpen, setAutoOpen] = useState(false);

  const load = () => {
    fetch("/api/admin/rounds")
      .then((r) => r.json())
      .then((d) => {
        setRounds(d.rounds ?? []);
        setLoading(false);
      });
  };

  useEffect(load, []);

  const create = async () => {
    if (!title.trim()) return alert("회차 제목을 입력해 주세요.");
    const res = await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, close_at: closeAt || null, auto_open: autoOpen }),
    });
    const d = await res.json();
    if (!res.ok) return alert(d.message);
    setShowCreate(false);
    setTitle("");
    setCloseAt("");
    setAutoOpen(false);
    load();
  };

  const setStatus = async (id: string, status: string, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    const res = await fetch(`/api/admin/rounds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (!res.ok) return alert(d.message);
    load();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${location.origin}/apply`);
    alert("신청 링크가 복사되었습니다.");
  };

  if (loading) return <p className="text-muted">불러오는 중...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">회차 관리</h1>
        <div className="flex gap-2">
          <button onClick={copyLink} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold">
            신청 링크 복사
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-bold">
            + 회차 생성
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="font-bold mb-4">새 회차 만들기</h2>
          <input
            className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 mb-3"
            placeholder='예: 2026년 11월 커피챗'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="block text-sm text-muted mb-1">신청 마감 일시 (비워두면 수동 마감)</label>
          <input
            type="datetime-local"
            className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 mb-3"
            value={closeAt}
            onChange={(e) => setCloseAt(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm mb-4">
            <input type="checkbox" checked={autoOpen} onChange={(e) => setAutoOpen(e.target.checked)} className="w-4 h-4" />
            바로 신청 접수 시작하기
          </label>
          <div className="flex gap-2">
            <button onClick={create} className="px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-bold">생성</button>
            <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm">취소</button>
          </div>
        </div>
      )}

      {rounds.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center text-muted">
          아직 회차가 없습니다. 위 버튼으로 첫 회차를 만들어 보세요.
        </div>
      ) : (
        <div className="grid gap-4">
          {rounds.map((r) => {
            const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.DRAFT;
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow p-5 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                    <span className="text-sm text-muted">신청자 {r.applicantCount}명</span>
                  </div>
                  <Link href={`/admin/rounds/${r.id}`} className="text-lg font-bold text-navy hover:underline">
                    {r.title}
                  </Link>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/admin/rounds/${r.id}`} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                    신청자 관리
                  </Link>
                  {(r.status === "CLOSED" || r.status === "MATCHED") && (
                    <Link href={`/admin/rounds/${r.id}/match`} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">
                      매칭
                    </Link>
                  )}
                  {r.status === "MATCHED" && (
                    <Link href={`/admin/rounds/${r.id}/result`} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold">
                      결과 보기
                    </Link>
                  )}
                  {r.status === "DRAFT" && (
                    <button onClick={() => setStatus(r.id, "OPEN", "신청 접수를 시작할까요?")} className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold">
                      접수 시작
                    </button>
                  )}
                  {r.status === "OPEN" && (
                    <button onClick={() => setStatus(r.id, "CLOSED", "신청을 마감할까요? 마감 후에는 신청이 불가합니다.")} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold">
                      마감하기
                    </button>
                  )}
                  {(r.status === "CLOSED" || r.status === "MATCHED") && (
                    <button onClick={() => setStatus(r.id, "ARCHIVED", "회차를 보관할까요?")} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-muted">
                      보관
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
