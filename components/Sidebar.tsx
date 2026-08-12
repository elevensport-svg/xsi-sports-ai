"use client";

import Link from "next/link";
import { useState } from "react";

const menuItems = [
  {
    icon: "🏠",
    label: "首頁",
    href: "/",
  },
  {
    icon: "⚾",
    label: "MLB",
    href: "/mlb",
  },
  {
    icon: "🏀",
    label: "NBA",
    href: "/nba",
  },
  {
    icon: "⚽",
    label: "足球",
    href: "/football",
  },
  {
    icon: "🎮",
    label: "電競",
    href: "/esports",
  },
];

const aiTools = [
  {
    icon: "🔥",
    label: "串關推薦",
    href: "/tools/parlay",
    badge: "VIP",
    badgeClass:
      "border-yellow-500/30 bg-yellow-400/10 text-yellow-400",
  },
  {
    icon: "🎯",
    label: "波膽推薦",
    href: "/tools/correct-score",
    badge: "VIP",
    badgeClass:
      "border-yellow-500/30 bg-yellow-400/10 text-yellow-400",
  },
  {
    icon: "🧮",
    label: "賠率計算器",
    href: "/tools/odds-calculator",
    badge: "FREE",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
];

export default function Sidebar() {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <aside className="min-h-[calc(100vh-73px)] w-64 border-r border-yellow-500/20 bg-zinc-950 p-4">
      <nav className="space-y-2">

        {/* 一般選單 */}
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-zinc-300 transition hover:bg-yellow-400 hover:text-black"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {/* AI 工具 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setAiOpen((prev) => !prev);
            }}
            className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-zinc-300 transition hover:bg-yellow-400 hover:text-black"
          >
            <div className="flex items-center gap-3">
              <span>🤖</span>
              <span>AI 工具</span>
            </div>

            <span
              className={`text-xs transition-transform duration-200 ${
                aiOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {/* AI 子選單 */}
          {aiOpen && (
            <div className="mt-2 space-y-1 border-l border-yellow-400/20 pl-4">

              <Link
                href="/tools/parlay"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm text-zinc-400 transition hover:bg-yellow-400/10 hover:text-yellow-400"
              >
                <div className="flex items-center gap-3">
                  <span>🔥</span>
                  <span>串關推薦</span>
                </div>

                <span className="rounded-full border border-yellow-500/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-yellow-400">
                  VIP
                </span>
              </Link>

              <Link
                href="/tools/correct-score"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm text-zinc-400 transition hover:bg-yellow-400/10 hover:text-yellow-400"
              >
                <div className="flex items-center gap-3">
                  <span>🎯</span>
                  <span>波膽推薦</span>
                </div>

                <span className="rounded-full border border-yellow-500/30 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-yellow-400">
                  VIP
                </span>
              </Link>

              <Link
                href="/tools/odds-calculator"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm text-zinc-400 transition hover:bg-yellow-400/10 hover:text-yellow-400"
              >
                <div className="flex items-center gap-3">
                  <span>🧮</span>
                  <span>串關賠率計算</span>
                </div>

                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-emerald-400">
                  FREE
                </span>
              </Link>

            </div>
          )}
        </div>

        {/* 歷史戰績 */}
        <Link
          href="/history"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-zinc-300 transition hover:bg-yellow-400 hover:text-black"
        >
          <span>📊</span>
          <span>歷史戰績</span>
        </Link>

        {/* 設定 */}
        <Link
          href="/settings"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-zinc-300 transition hover:bg-yellow-400 hover:text-black"
        >
          <span>⚙️</span>
          <span>設定</span>
        </Link>

      </nav>
    </aside>
  );
}