import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XSI Sports AI",
  description: "XSI Sports AI 賽事分析系統",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 桌機版：右上角官方 LINE */}
        <a
  href="https://lin.ee/tUSSK2z"
  target="_blank"
  rel="noopener noreferrer"
  className="fixed right-5 top-5 z-[999] hidden lg:block"
>
  <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900/95 px-5 py-4 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:border-yellow-400">

    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
      OFFICIAL LINE
    </p>

    <p className="mt-2 text-xl font-black text-yellow-400">
      免費 AI 推薦
    </p>

    <p className="mt-1 text-sm text-zinc-300">
      每日免費賽事分享
    </p>

    <div className="mt-4 rounded-xl bg-[#06C755] py-2 text-center font-black text-white">
      💬 立即加入
    </div>

  </div>
</a>

        {/* 手機版：底部官方 LINE */}
        <a
  href="https://lin.ee/tUSSK2z"
  target="_blank"
  rel="noopener noreferrer"
  className="fixed bottom-4 left-4 right-4 z-[999] rounded-xl bg-[#06C755] py-4 text-center font-black text-white shadow-2xl lg:hidden"
>
  💬 加入官方 LINE｜每日免費推薦
</a>
        {children}
      </body>
    </html>
  );
}