"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <header className="bg-navy text-white">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/admin" className="font-bold">
          <span className="text-xs block tracking-widest text-blue-200 font-normal">WATCHERS</span>
          커피챗 관리자
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/admin" className={`px-3 py-2 rounded-lg ${pathname === "/admin" ? "bg-white/15" : "hover:bg-white/10"}`}>
            회차
          </Link>
          <Link href="/admin/settings" className={`px-3 py-2 rounded-lg ${pathname === "/admin/settings" ? "bg-white/15" : "hover:bg-white/10"}`}>
            설정
          </Link>
          <button onClick={logout} className="px-3 py-2 rounded-lg hover:bg-white/10 text-blue-200">
            로그아웃
          </button>
        </nav>
      </div>
    </header>
  );
}
