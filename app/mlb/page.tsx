import Link from "next/link";
import { redirect } from "next/navigation";

import MlbTomorrowGames from "../../components/MlbTomorrowGames";
import { getCurrentUserMembership } from "../../lib/membership";

export default async function MlbPage() {
  const membership =
    await getCurrentUserMembership();

  if (!membership.isLoggedIn) {
    redirect("/login");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fffaf3] px-4 py-8 text-[#4a4038] sm:px-6 sm:py-10">
      {/* 可愛背景裝飾 */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#fff0a8]/30 blur-3xl" />

      <div className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-[#dff5ff]/50 blur-3xl" />

      <div className="pointer-events-none absolute bottom-20 left-1/3 h-60 w-60 rounded-full bg-[#e4fff1]/40 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1500px]">
        {/* 回首頁 */}
        <Link
          href="/"
          className="
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-[#eadcc8]
            bg-white
            px-4
            py-2.5
            text-sm
            font-black
            text-[#75685e]
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:border-[#ffc94a]
            hover:text-[#a56e14]
            hover:shadow-[0_8px_18px_rgba(95,75,55,0.08)]
          "
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff3c9]">
            ←
          </span>

          <span>
            回首頁
          </span>
        </Link>

        {/* ======================================
            MLB Hero
        ====================================== */}

        <section className="relative mt-8 overflow-hidden rounded-[32px] border border-[#eedfc9] bg-gradient-to-br from-[#fff6d8] via-white to-[#eaf8ff] p-6 shadow-[0_14px_40px_rgba(95,75,55,0.09)] sm:p-8">
          {/* 裝飾 */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#9edcff]/20" />

          <div className="pointer-events-none absolute -bottom-10 left-20 h-28 w-28 rounded-full bg-[#ffd96a]/20" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              {/* MLB 圖示 */}
              <div
                className="
                  flex
                  h-16
                  w-16
                  shrink-0
                  items-center
                  justify-center
                  rounded-[22px]
                  border
                  border-[#e6edf1]
                  bg-white
                  text-3xl
                  shadow-[0_8px_20px_rgba(95,75,55,0.08)]
                  sm:h-20
                  sm:w-20
                  sm:text-4xl
                "
              >
                ⚾
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#fff0bd] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#a8741b]">
                    XSI MLB
                  </span>

                  <span className="rounded-full border border-[#dcecf4] bg-[#eef9ff] px-3 py-1 text-[10px] font-black text-[#568096]">
                    🤖 AI ANALYSIS
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-[#4a4038] sm:text-4xl">
                  MLB 賽事分析
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#928579] sm:text-base">
                  明日 MLB 賽程、投手資訊、球隊近況與 XSI AI
                  完整分析都整理在這裡 ✨
                </p>
              </div>
            </div>

            {/* 右側小卡 */}
            <div
              className="
                rounded-[24px]
                border
                border-[#eee1cf]
                bg-white/80
                p-4
                shadow-sm
                backdrop-blur
                lg:min-w-[240px]
              "
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#e9fff5] text-xl">
                  🐣
                </div>

                <div>
                  <p className="text-xs font-black text-[#655a51]">
                    XSI MLB 小助手
                  </p>

                  <p className="mt-1 text-[11px] font-medium text-[#9f9388]">
                    今天也一起研究比賽吧！
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================
            Schedule Section
        ====================================== */}

        <section className="mt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c68418]">
                TOMORROW SCHEDULE
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#4a4038] sm:text-3xl">
                📅 明日 MLB 賽程
              </h2>

              <p className="mt-2 text-sm text-[#95887c]">
                點擊賽事即可查看完整 XSI AI 分析
              </p>
            </div>

            <div
              className="
                hidden
                items-center
                gap-2
                rounded-full
                border
                border-[#cdebdc]
                bg-[#ecfff5]
                px-3
                py-1.5
                text-xs
                font-black
                text-[#478169]
                sm:flex
              "
            >
              <span>
                ●
              </span>

              <span>
                賽程自動更新
              </span>
            </div>
          </div>

          {/* 原本 MLB 賽程元件完全保留 */}
          <div
            className="
              rounded-[30px]
              border
              border-[#eee0cd]
              bg-white/65
              p-3
              shadow-[0_10px_30px_rgba(95,75,55,0.06)]
              backdrop-blur
              sm:p-5
            "
          >
            <MlbTomorrowGames />
          </div>
        </section>

        {/* 底部提醒 */}
        <div
          className="
            mt-8
            flex
            items-start
            gap-3
            rounded-[22px]
            border
            border-[#eee2d3]
            bg-[#fffdf8]
            p-4
          "
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#fff2c8]">
            💡
          </div>

          <div>
            <p className="text-xs font-black text-[#6c6056]">
              XSI 小提醒
            </p>

            <p className="mt-1 text-xs leading-5 text-[#9b8f84]">
              AI 分析會綜合多項數據提供參考，每場比賽仍可能受到臨場狀況影響。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}