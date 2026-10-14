"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DoneInner() {
  const q = useSearchParams();
  const receiptNo = q.get("receiptNo") ?? "";
  const updated = q.get("updated") === "1";
  const name = q.get("name") ?? "";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-softblue flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-xl font-bold text-navy mb-2">
          {updated ? "신청이 업데이트되었습니다" : "신청이 접수되었습니다"}
        </h1>
        <p className="text-muted text-sm mb-6">
          {name}님, {updated ? "최신 내용으로 업데이트했어요." : "커피챗 신청이 완료되었어요."}
        </p>
        <div className="rounded-xl bg-navy text-white py-4 mb-6">
          <p className="text-xs text-blue-200 mb-1">접수번호</p>
          <p className="text-2xl font-bold tracking-wider">{receiptNo}</p>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          접수번호를 스크린샷으로 보관해 주세요.
          <br />
          내용을 바꾸고 싶으면 같은 전화번호로 다시 신청하면 됩니다.
        </p>
      </div>
    </div>
  );
}

export default function DonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted">불러오는 중...</p></div>}>
      <DoneInner />
    </Suspense>
  );
}
