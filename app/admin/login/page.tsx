"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.message);
        setLoading(false);
        return;
      }
      router.push("/admin");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={login} className="max-w-sm w-full bg-white rounded-2xl shadow p-8">
        <p className="text-xs tracking-widest text-brand font-bold mb-1">WATCHERS COFFEE CHAT</p>
        <h1 className="text-xl font-bold text-navy mb-6">관리자 로그인</h1>
        <input
          type="email"
          className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 mb-3"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          className="w-full min-h-[48px] rounded-xl border border-slate-200 px-4 mb-4"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button disabled={loading} className="w-full min-h-[52px] rounded-xl bg-navy text-white font-bold disabled:bg-slate-300">
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
