import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watchers 커피챗",
  description: "KAIST 경영대학 투자동아리 Watchers 커피챗 자동 매칭",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-50 text-ink min-h-screen">{children}</body>
    </html>
  );
}
