import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-black">
        {/* 桌機版：右上角官方 LINE */}
        <a
          href="https://lin.ee/tUSSK2z"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-5 top-5 z-[999] hidden w-52 rounded-2xl border border-yellow-500/20 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur lg:block"
        >
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
        </a>

        {children}

        {/* 手機版：縮小成右下角按鈕，不再遮住整個畫面 */}
        <a
          href="https://lin.ee/tUSSK2z"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="加入官方 LINE"
          className="fixed bottom-4 right-4 z-[999] flex h-12 w-12
           items-center justify-center rounded-full bg-[#06C755] text-2xl shadow-2xl lg:hidden"
        >
          💬
        </a>
      </body>
    </html>
  );
}