"use client";

import Link from "next/link";
import { useState } from "react";

const menuItems = [
  {
    icon: "🏠",
    label: "首頁",
    href: "/",
    bubbleClass:
      "bg-[#fff1bd]",
  },
  {
    icon: "⚾",
    label: "MLB",
    href: "/mlb",
    bubbleClass:
      "bg-[#e8f7ff]",
  },
  {
    icon: "🏀",
    label: "NBA",
    href: "/nba",
    bubbleClass:
      "bg-[#fff0e3]",
  },
  {
    icon: "⚽",
    label: "足球",
    href: "/football",
    bubbleClass:
      "bg-[#e9fff5]",
  },
  {
    icon: "🎮",
    label: "電競",
    href: "/esports",
    bubbleClass:
      "bg-[#f2edff]",
  },
];

export default function Sidebar() {
  const [
    aiOpen,
    setAiOpen,
  ] =
    useState(
      false,
    );

  return (
    <aside
      className="
        sticky
        top-0
        min-h-[calc(100vh-73px)]
        w-64
        border-r
        border-[#eee0cd]
        bg-[#fffdf9]
        p-4
      "
    >
      {/* ======================================
          Brand Card
      ====================================== */}

      <div
        className="
          mb-5
          overflow-hidden
          rounded-[26px]
          border
          border-[#eedfc9]
          bg-gradient-to-br
          from-[#fff6d8]
          via-white
          to-[#eaf8ff]
          p-4
          shadow-[0_8px_22px_rgba(95,75,55,0.08)]
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-[18px]
              bg-white
              text-2xl
              shadow-sm
            "
          >
            🤖
          </div>

          <div>
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.2em]
                text-[#bd8a30]
              "
            >
              XSI SPORTS AI
            </p>

            <p
              className="
                mt-1
                text-sm
                font-black
                text-[#4a4038]
              "
            >
              可愛運動研究室
            </p>
          </div>
        </div>

        <div
          className="
            mt-3
            rounded-2xl
            bg-white/70
            px-3
            py-2
          "
        >
          <p
            className="
              text-[11px]
              font-bold
              leading-5
              text-[#94877b]
            "
          >
            ✨ 每天陪你一起研究賽事
          </p>
        </div>
      </div>

      {/* ======================================
          Navigation
      ====================================== */}

      <nav className="space-y-2">
        {menuItems.map(
          (
            item,
          ) => (
            <Link
              key={
                item.label
              }
              href={
                item.href
              }
              className="
                group
                flex
                w-full
                items-center
                gap-3
                rounded-[18px]
                border
                border-transparent
                px-3
                py-2.5
                text-left
                font-bold
                text-[#6f645c]
                transition
                duration-200
                hover:-translate-y-0.5
                hover:border-[#eedfc9]
                hover:bg-white
                hover:text-[#4a4038]
                hover:shadow-[0_7px_18px_rgba(95,75,55,0.07)]
              "
            >
              <span
                className={`
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-[14px]
                  text-lg
                  transition
                  group-hover:scale-110
                  ${item.bubbleClass}
                `}
              >
                {
                  item.icon
                }
              </span>

              <span>
                {
                  item.label
                }
              </span>
            </Link>
          ),
        )}

        {/* ======================================
            AI Tools
        ====================================== */}

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setAiOpen(
                (
                  prev,
                ) =>
                  !prev,
              );
            }}
            className="
              group
              flex
              w-full
              items-center
              justify-between
              rounded-[18px]
              border
              border-transparent
              px-3
              py-2.5
              text-left
              font-bold
              text-[#6f645c]
              transition
              duration-200
              hover:-translate-y-0.5
              hover:border-[#eedfc9]
              hover:bg-white
              hover:text-[#4a4038]
              hover:shadow-[0_7px_18px_rgba(95,75,55,0.07)]
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <span
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-[14px]
                  bg-[#fff1bd]
                  text-lg
                  transition
                  group-hover:scale-110
                "
              >
                🤖
              </span>

              <span>
                AI 工具
              </span>
            </div>

            <span
              className={`
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-full
                bg-[#fff6dc]
                text-[10px]
                text-[#ad7920]
                transition-transform
                duration-200
                ${
                  aiOpen
                    ? "rotate-180"
                    : ""
                }
              `}
            >
              ▼
            </span>
          </button>

          {/* ======================================
              AI Sub Menu
          ====================================== */}

          {aiOpen && (
            <div
              className="
                ml-4
                mt-2
                space-y-1.5
                rounded-[20px]
                border
                border-[#eee3d5]
                bg-white/80
                p-2
                shadow-[0_8px_20px_rgba(95,75,55,0.06)]
              "
            >
              <Link
                href="/tools/parlay"
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  gap-3
                  rounded-[15px]
                  px-3
                  py-2.5
                  text-sm
                  font-bold
                  text-[#71665d]
                  transition
                  hover:bg-[#fff7df]
                  hover:text-[#aa7517]
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <span>
                    🔥
                  </span>

                  <span>
                    串關推薦
                  </span>
                </div>

                <span
                  className="
                    rounded-full
                    border
                    border-[#f2d57a]
                    bg-[#fff5c9]
                    px-2
                    py-0.5
                    text-[9px]
                    font-black
                    tracking-wider
                    text-[#a47116]
                  "
                >
                  VIP
                </span>
              </Link>

              <Link
                href="/tools/correct-score"
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  gap-3
                  rounded-[15px]
                  px-3
                  py-2.5
                  text-sm
                  font-bold
                  text-[#71665d]
                  transition
                  hover:bg-[#fff0f5]
                  hover:text-[#a75b75]
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <span>
                    🎯
                  </span>

                  <span>
                    波膽推薦
                  </span>
                </div>

                <span
                  className="
                    rounded-full
                    border
                    border-[#f1ceda]
                    bg-[#fff0f5]
                    px-2
                    py-0.5
                    text-[9px]
                    font-black
                    tracking-wider
                    text-[#a75b75]
                  "
                >
                  VIP
                </span>
              </Link>

              <Link
                href="/tools/odds-calculator"
                className="
                  flex
                  w-full
                  items-center
                  justify-between
                  gap-3
                  rounded-[15px]
                  px-3
                  py-2.5
                  text-sm
                  font-bold
                  text-[#71665d]
                  transition
                  hover:bg-[#e9fff5]
                  hover:text-[#3d8063]
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <span>
                    🧮
                  </span>

                  <span>
                    串關賠率計算
                  </span>
                </div>

                <span
                  className="
                    rounded-full
                    border
                    border-[#ccebdc]
                    bg-[#e9fff5]
                    px-2
                    py-0.5
                    text-[9px]
                    font-black
                    tracking-wider
                    text-[#3d8063]
                  "
                >
                  FREE
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* ======================================
            Divider
        ====================================== */}

        <div
          className="
            my-3
            border-t
            border-dashed
            border-[#e9dfd4]
          "
        />

        {/* ======================================
            History
        ====================================== */}

        <Link
          href="/history"
          className="
            group
            flex
            w-full
            items-center
            gap-3
            rounded-[18px]
            border
            border-transparent
            px-3
            py-2.5
            font-bold
            text-[#6f645c]
            transition
            hover:-translate-y-0.5
            hover:border-[#eedfc9]
            hover:bg-white
            hover:text-[#4a4038]
            hover:shadow-[0_7px_18px_rgba(95,75,55,0.07)]
          "
        >
          <span
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-[14px]
              bg-[#e8f7ff]
              text-lg
              transition
              group-hover:scale-110
            "
          >
            📊
          </span>

          <span>
            歷史戰績
          </span>
        </Link>

        {/* ======================================
            Settings
        ====================================== */}

        <Link
          href="/settings"
          className="
            group
            flex
            w-full
            items-center
            gap-3
            rounded-[18px]
            border
            border-transparent
            px-3
            py-2.5
            font-bold
            text-[#6f645c]
            transition
            hover:-translate-y-0.5
            hover:border-[#eedfc9]
            hover:bg-white
            hover:text-[#4a4038]
            hover:shadow-[0_7px_18px_rgba(95,75,55,0.07)]
          "
        >
          <span
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-[14px]
              bg-[#f1edff]
              text-lg
              transition
              group-hover:scale-110
            "
          >
            ⚙️
          </span>

          <span>
            設定
          </span>
        </Link>
      </nav>

      {/* ======================================
          Bottom Decoration
      ====================================== */}

      <div
        className="
          mt-6
          rounded-[22px]
          border
          border-[#eee1cf]
          bg-gradient-to-br
          from-[#fff8df]
          to-[#fff]
          p-4
        "
      >
        <p
          className="
            text-xs
            font-black
            text-[#725f4d]
          "
        >
          🐣 XSI 今日提醒
        </p>

        <p
          className="
            mt-2
            text-[11px]
            leading-5
            text-[#9d9084]
          "
        >
          AI 是分析小幫手，
          每場比賽都記得自己再判斷一下 ✨
        </p>
      </div>
    </aside>
  );
}