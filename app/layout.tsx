import type {
  Metadata,
  Viewport,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

const geistSans =
  Geist({
    variable:
      "--font-geist-sans",

    subsets: [
      "latin",
    ],
  });

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",

    subsets: [
      "latin",
    ],
  });

export const metadata: Metadata =
  {
    title:
      "XSI Sports AI",

    description:
      "XSI Sports AI 可愛運動研究室｜AI 賽事分析系統",
  };

export const viewport: Viewport =
  {
    width:
      "device-width",

    initialScale:
      1,

    themeColor:
      "#fffaf3",
  };

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
        h-full
        antialiased
      `}
    >
      <body
        className="
          min-h-full
          overflow-x-hidden
          bg-[#fffaf3]
          text-[#3f3a36]
        "
      >
        {/* ======================================
            Cute Background Decorations
        ====================================== */}

        <div
          className="
            pointer-events-none
            fixed
            inset-0
            -z-10
            overflow-hidden
          "
        >
          <div
            className="
              absolute
              -left-24
              -top-24
              h-72
              w-72
              rounded-full
              bg-yellow-200/20
              blur-3xl
            "
          />

          <div
            className="
              -right-24
              absolute
              top-32
              h-80
              w-80
              rounded-full
              bg-sky-200/20
              blur-3xl
            "
          />

          <div
            className="
              absolute
              bottom-10
              left-1/3
              h-64
              w-64
              rounded-full
              bg-emerald-200/15
              blur-3xl
            "
          />
        </div>

        {/* ======================================
            Desktop Official LINE
        ====================================== */}

        <a
          href="https://lin.ee/tUSSK2z"
          target="_blank"
          rel="noopener noreferrer"
          className="
            group
            fixed
            right-5
            top-5
            z-[999]
            hidden
            w-56
            overflow-hidden
            rounded-[26px]
            border
            border-[#eee0cd]
            bg-white/95
            p-4
            shadow-[0_12px_35px_rgba(110,85,50,0.12)]
            backdrop-blur-xl
            transition
            duration-200
            hover:-translate-y-1
            hover:shadow-[0_16px_40px_rgba(110,85,50,0.18)]
            lg:block
          "
        >
          {/* 裝飾圓圈 */}

          <div
            className="
              absolute
              -right-5
              -top-5
              h-20
              w-20
              rounded-full
              bg-yellow-200/40
            "
          />

          <div
            className="
              absolute
              -bottom-8
              -left-6
              h-20
              w-20
              rounded-full
              bg-sky-100/50
            "
          />

          <div className="relative">
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
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#eaffef]
                  text-xl
                  shadow-sm
                "
              >
                💬
              </div>

              <div>
                <p
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.22em]
                    text-[#aaa099]
                  "
                >
                  OFFICIAL LINE
                </p>

                <p
                  className="
                    mt-0.5
                    text-base
                    font-black
                    text-[#3f3a36]
                  "
                >
                  XSI 小助手
                </p>
              </div>
            </div>

            <div
              className="
                mt-4
                rounded-2xl
                bg-[#fff8e4]
                p-3
              "
            >
              <p
                className="
                  text-sm
                  font-black
                  text-[#7a5a18]
                "
              >
                🔥 每日免費 AI 精選
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-[#958875]
                "
              >
                賽事分析、系統更新與免費分享
              </p>
            </div>

            <div
              className="
                mt-3
                flex
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-[#06C755]
                py-2.5
                text-sm
                font-black
                text-white
                shadow-[0_6px_14px_rgba(6,199,85,0.20)]
                transition
                group-hover:scale-[1.02]
              "
            >
              <span>
                💬
              </span>

              <span>
                加入官方 LINE
              </span>
            </div>
          </div>
        </a>

        {/* ======================================
            Main Website
        ====================================== */}

        <div
          className="
            relative
            min-h-screen
          "
        >
          {children}
        </div>

        {/* ======================================
            Mobile Official LINE
        ====================================== */}

        <a
          href="https://lin.ee/tUSSK2z"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="加入官方 LINE"
          className="
            fixed
            bottom-5
            right-4
            z-[999]
            flex
            items-center
            gap-2
            rounded-full
            border
            border-white/60
            bg-[#06C755]
            px-4
            py-3
            text-sm
            font-black
            text-white
            shadow-[0_10px_25px_rgba(6,199,85,0.28)]
            transition
            active:scale-95
            lg:hidden
          "
        >
          <span className="text-lg">
            💬
          </span>

          <span>
            免費分析
          </span>
        </a>
      </body>
    </html>
  );
}