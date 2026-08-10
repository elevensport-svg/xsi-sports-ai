import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserMembership } from "../../../lib/membership";

const LINE_URL = "https://lin.ee/r8t6pBB4";

export default async function ParlayPage() {
  const membership =
    await getCurrentUserMembership();

  if (!membership.isLoggedIn) {
    redirect("/login");
  }

  const isVip = membership.isVip;

  if (!isVip) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
          >
            ← 回上一頁
          </Link>

          <div className="mt-10 overflow-hidden rounded-3xl border border-yellow-500/20 bg-zinc-900">
            <div className="border-b border-zinc-800 bg-gradient-to-r from-yellow-400/10 to-transparent p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
                XSI AI PARLAY
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                🔥 串關推薦
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                XSI AI 會依據投手、打線、牛棚、近期狀態、
                市場盤口與勝率模型，篩選適合組合的賽事。
              </p>
            </div>

            <div className="flex min-h-[420px] items-center justify-center p-6 sm:p-10">
              <div className="w-full max-w-xl rounded-3xl border border-yellow-500/20 bg-zinc-950 p-8 text-center shadow-2xl">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-400/10 text-4xl">
                  🔒
                </div>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
                  VIP ONLY
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  VIP 專屬串關推薦
                </h2>

                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  此功能僅開放 VIP 會員觀看。
                  升級 VIP 後即可查看每日 XSI AI
                  串關組合、信心度與風險評級。
                </p>

                <a
                  href={LINE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-yellow-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300"
                >
                  升級 VIP 解鎖
                </a>

                <Link
                  href="/"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-zinc-700 px-5 py-3.5 text-sm font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                >
                  返回首頁
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
        >
          ← 回上一頁
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            XSI AI PARLAY
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            🔥 今日串關推薦
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            VIP 專屬 AI 串關組合
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <ParlayCard
            level="穩健型"
            legs={2}
            confidence={82}
            risk="低"
            description="以高信心單場為主，降低串關波動。"
          />

          <ParlayCard
            level="均衡型"
            legs={3}
            confidence={74}
            risk="中"
            description="兼顧賠率與模型信心的三場組合。"
          />

          <ParlayCard
            level="高報酬型"
            legs={4}
            confidence={66}
            risk="高"
            description="提高整體賠率，但風險同步增加。"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
            AI Recommendation
          </p>

          <h2 className="mt-2 text-xl font-black">
            今日推薦內容準備中
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            下一步會把這裡接到你現有的 MLB XSI 分析資料，
            由系統自動挑選高信心場次組成串關。
          </p>
        </div>
      </div>
    </main>
  );
}

function ParlayCard({
  level,
  legs,
  confidence,
  risk,
  description,
}: {
  level: string;
  legs: number;
  confidence: number;
  risk: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-black text-white">
          {level}
        </p>

        <span className="rounded-full border border-yellow-500/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-400">
          {legs} 串 1
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            AI 信心度
          </span>

          <span className="font-black text-white">
            {confidence}%
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-yellow-400"
            style={{
              width: `${confidence}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
        <span className="text-sm text-zinc-500">
          風險
        </span>

        <span className="text-sm font-black text-yellow-400">
          {risk}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-400">
        {description}
      </p>
    </div>
  );
}