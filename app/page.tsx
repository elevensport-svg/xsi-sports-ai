import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import Sidebar from "../components/Sidebar";

import { getCurrentUserMembership } from "../lib/membership";
import { createAdminClient } from "../lib/supabase/admin";

import {
  getPredictionHistoryStats,
  isValidMlbPrediction,
} from "@/lib/prediction/historyStats";

import {
  getSportsNews,
  type SportsNewsItem,
} from "../lib/api/sports-news";

export const dynamic = "force-dynamic";

type PredictionHistory = {
  id: string;
  game_pk: string;
  sport: string;
  home_team: string;
  away_team: string;
  prediction: string;
  confidence:
    | number
    | string
    | null;
  result: string;
  created_at: string;
};

const mobileMenuItems = [
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
  {
    icon: "🔥",
    label: "串關推薦",
    href: "/tools/parlay",
  },
  {
    icon: "🎯",
    label: "波膽推薦",
    href: "/tools/correct-score",
  },
  {
    icon: "🧮",
    label: "串關賠率計算",
    href: "/tools/odds-calculator",
  },
  {
    icon: "📊",
    label: "歷史戰績",
    href: "/history",
  },
];


function normalizePredictionText(
  value: string | null | undefined,
) {
  return String(
    value ?? "",
  ).trim();
}

function predictionHasTeamName(
  item: PredictionHistory,
) {
  const prediction =
    normalizePredictionText(
      item.prediction,
    );

  const awayTeam =
    normalizePredictionText(
      item.away_team,
    );

  const homeTeam =
    normalizePredictionText(
      item.home_team,
    );

  if (!prediction) {
    return false;
  }

  return (
    Boolean(
      awayTeam &&
        prediction.includes(
          awayTeam,
        ),
    ) ||
    Boolean(
      homeTeam &&
        prediction.includes(
          homeTeam,
        ),
    )
  );
}

function isPendingPrediction(
  result: string | null | undefined,
) {
  return (
    String(
      result ?? "",
    )
      .trim()
      .toLowerCase() ===
    "pending"
  );
}

function isValidFreePick(
  item: PredictionHistory,
) {
  const sport =
    String(
      item.sport ?? "",
    )
      .trim()
      .toUpperCase();

  if (
    sport !== "MLB" &&
    sport !== "FOOTBALL"
  ) {
    return false;
  }

  if (
    !isPendingPrediction(
      item.result,
    )
  ) {
    return false;
  }

  if (
    !normalizePredictionText(
      item.prediction,
    )
  ) {
    return false;
  }

  if (
    sport === "MLB"
  ) {
    return (
      isValidMlbPrediction(
        item,
      ) &&
      predictionHasTeamName(
        item,
      )
    );
  }

  return Boolean(
    normalizePredictionText(
      item.home_team,
    ) &&
    normalizePredictionText(
      item.away_team,
    ),
  );
}

function getFreePickHref(
  item: PredictionHistory,
) {
  const sport =
    String(
      item.sport ?? "",
    )
      .trim()
      .toUpperCase();

  if (
    sport === "FOOTBALL"
  ) {
    return `/football/${encodeURIComponent(
      String(
        item.game_pk,
      ),
    )}`;
  }

  return `/mlb/${encodeURIComponent(
    String(
      item.game_pk,
    ),
  )}`;
}

function getTaiwanCreatedDateKey(
  createdAt: string,
) {
  try {
    return new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).format(
      new Date(
        createdAt,
      ),
    );
  } catch {
    return "";
  }
}

export default async function Home() {
  const membership =
    await getCurrentUserMembership();

  if (!membership.isLoggedIn) {
    redirect("/login");
  }

  /*
   * ==========================================
   * MLB 自動結算
   * ==========================================
   */
  
  /*
   * ==========================================
   * 足球自動結算
   * ==========================================
   */
  
  const supabase =
    createAdminClient();

  /*
   * ==========================================
   * 讀取 prediction_history + 體育新聞
   * ==========================================
   */
  const [
    historyResult,
    sportsNews,
  ] = await Promise.all([
    supabase
      .from(
        "prediction_history",
      )
      .select(
        `
          id,
          game_pk,
          sport,
          home_team,
          away_team,
          prediction,
          confidence,
          result,
          created_at
        `,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(
        500,
      ),

    getSportsNews(),
  ]);

  const {
    data: historyData,
    error: historyError,
  } = historyResult;

  if (historyError) {
    console.error(
      "首頁 prediction_history 讀取失敗:",
      historyError,
    );
  }

  const histories =
    (historyData ??
      []) as PredictionHistory[];

  /*
   * ==========================================
   * 統一使用 historyStats.ts
   * ==========================================
   */
  const stats =
    getPredictionHistoryStats(
      histories,
    );

  /*
   * ==========================================
   * XSI 歷史基準
   * ==========================================
   */
  const BASE_TOTAL = 354;
  const BASE_WINS = 269;
  const BASE_LOSSES = 85;

  /*
   * ==========================================
   * 有效新增紀錄
   * ==========================================
   *
   * stats.validRecords 已排除：
   * - 測試資料
   * - 非 MLB
   * - 假 game_pk
   * - 無效球隊名稱
   * - 無效 prediction
   */
  const validNewPredictions =
    stats.validRecords;

  /*
   * ==========================================
   * 累積分析
   * ==========================================
   */
  const totalPredictions =
    BASE_TOTAL +
    validNewPredictions;

  /*
   * ==========================================
   * 命中 / 未命中
   * ==========================================
   */
  const totalWins =
    BASE_WINS +
    stats.wins;

  const totalLosses =
    BASE_LOSSES +
    stats.losses;

  /*
   * ==========================================
   * 待結算
   * ==========================================
   */
  const pendingCount =
    stats.pending;

  /*
   * ==========================================
   * 歷史勝率
   * ==========================================
   */
  const totalSettled =
    totalWins +
    totalLosses;

  const winRate =
    totalSettled > 0
      ? Math.round(
          (totalWins /
            totalSettled) *
            1000,
        ) / 10
      : 0;

  /*
   * ==========================================
   * 今日免費精選
   *
   * MLB + FOOTBALL 都可入選。
   * 只挑：
   * - pending
   * - 有效 prediction
   *
   * 先鎖定最新一批建立日期，
   * 再從該批挑 confidence 最高的一場。
   * MLB 若今日沒有合適資料，
   * 足球會自動補上，不再顯示空白。
   * ==========================================
   */
  const pendingFreePickCandidates =
    histories.filter(
      (item) =>
        isValidFreePick(
          item,
        ),
    );

  const latestPendingDateKey =
    pendingFreePickCandidates
      .map(
        (item) =>
          getTaiwanCreatedDateKey(
            item.created_at,
          ),
      )
      .filter(Boolean)
      .sort()
      .at(-1) ?? "";

  const latestPendingCandidates =
    latestPendingDateKey
      ? pendingFreePickCandidates.filter(
          (item) =>
            getTaiwanCreatedDateKey(
              item.created_at,
            ) ===
            latestPendingDateKey,
        )
      : pendingFreePickCandidates;

  const freePick =
    [...latestPendingCandidates]
      .sort(
        (a, b) => {
          const confidenceDiff =
            Number(
              b.confidence ??
                0,
            ) -
            Number(
              a.confidence ??
                0,
            );

          if (
            confidenceDiff !==
            0
          ) {
            return confidenceDiff;
          }

          return (
            new Date(
              b.created_at,
            ).getTime() -
            new Date(
              a.created_at,
            ).getTime()
          );
        },
      )[0] ?? null;

  /*
   * ==========================================
   * 最新新聞
   * ==========================================
   */
  const latestNews =
    sportsNews.slice(
      0,
      6,
    );

  return (
    <main className="min-h-screen bg-transparent text-[#3f3a36]">

      {/* =========================
          HEADER
      ========================= */}
      <header className="border-b border-[#eee0cd] bg-white/85 backdrop-blur-xl">

        <div className="flex items-center justify-between px-4 py-4 sm:px-6">

          <div className="min-w-0">

            <h1 className="truncate text-xl font-black text-[#4a4038] sm:text-2xl">
              XSI SPORTS AI
            </h1>

            <p className="mt-1 hidden text-sm text-[#95887c] sm:block">
              體育數據分析平台
            </p>

          </div>

          <div className="shrink-0 rounded-lg border border-[#f0dfbd] bg-[#fff5d9] text-[#7b5b19] px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm">
            {membership.isVip
              ? "VIP 會員"
              : membership.name}
          </div>

        </div>

        {/* 手機版選單 */}
        <nav className="border-t border-[#f1e7da] px-3 py-3 md:hidden">

          <div className="flex gap-2 overflow-x-auto pb-1">

            {mobileMenuItems.map(
              (item) => (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  className="flex shrink-0 items-center gap-2 rounded-full border border-[#eee0cd] bg-white shadow-sm px-3 py-2 text-xs font-bold text-[#71665d] transition hover:border-[#ffc94a] hover:text-[#9b6611]"
                >

                  <span>
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>

                </Link>
              ),
            )}

          </div>

        </nav>

      </header>

      <div className="flex min-w-0">

        {/* =========================
            DESKTOP SIDEBAR
        ========================= */}
        <div className="hidden shrink-0 md:block">
          <Sidebar />
        </div>

        {/* =========================
            MAIN CONTENT
        ========================= */}
        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:p-8">

          <div className="mx-auto w-full max-w-[1400px]">

            {/* ==================================
                1. 歷史分析勝率
            ================================== */}
            <section>

              <div className="flex items-end justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c68418]">
                    XSI AI PERFORMANCE
                  </p>

                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    📊 歷史分析勝率
                  </h2>

                  <p className="mt-2 text-sm text-[#95887c]">
                    XSI AI 累積預測統計
                  </p>

                </div>

                <Link
                  href="/history"
                  className="hidden text-sm font-bold text-[#c68418] transition hover:text-yellow-300 sm:block"
                >
                  完整戰績 →
                </Link>

              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">

                <StatCard
                  label="累積分析"
                  value={
                    totalPredictions
                  }
                />

                <StatCard
                  label="歷史勝率"
                  value={`${winRate}%`}
                  highlight
                />

                <StatCard
                  label="命中"
                  value={
                    totalWins
                  }
                />

                <StatCard
                  label="未命中"
                  value={
                    totalLosses
                  }
                />

                <StatCard
                  label="待結算"
                  value={
                    pendingCount
                  }
                />

              </div>

              <Link
                href="/history"
                className="mt-4 flex w-full items-center justify-center rounded-xl border border-[#eee0cd] bg-white px-4 py-3 text-sm font-bold text-[#71665d] transition hover:border-[#ffc94a] hover:text-[#9b6611] sm:hidden"
              >
                查看完整歷史戰績 →
              </Link>

            </section>

            {/* ==================================
                2. 今日免費精選
            ================================== */}
            <section className="mt-12">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c68418]">
                  FREE PICK
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  🔥 今日免費精選
                </h2>

                <p className="mt-2 text-sm text-[#95887c]">
                  每日提供一場 XSI AI 免費分析
                </p>

              </div>

              {freePick ? (
                <div className="relative mt-6 overflow-hidden rounded-[32px] border border-[#efdfc9] bg-white shadow-[0_16px_45px_rgba(95,75,55,0.10)]">

                  {/* 可愛裝飾 */}
                  <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#fff0a8]/35 blur-2xl" />
                  <div className="pointer-events-none absolute -right-10 top-16 h-36 w-36 rounded-full bg-[#dff5ff]/50 blur-2xl" />

                  {/* 上方標籤 */}
                  <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-[#f1e6d8] px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#ffc94a] px-3 py-1 text-xs font-black text-[#4d3a13] shadow-sm">
                        🔥 FREE
                      </span>

                      <span className="rounded-full border border-[#dcecf4] bg-[#eef9ff] px-3 py-1 text-xs font-black text-[#4c7990]">
                        {String(freePick.sport).toUpperCase() === "FOOTBALL"
                          ? "⚽ FOOTBALL"
                          : "⚾ MLB"}
                      </span>
                    </div>

                    <span className="rounded-full bg-[#faf6f0] px-3 py-1 text-[10px] font-bold text-[#aaa096]">
                      Game ID：{freePick.game_pk}
                    </span>
                  </div>

                  {/* 對戰區 */}
                  <div className="relative bg-gradient-to-r from-[#fff9e8] via-white to-[#edf9ff] px-5 py-8 sm:px-8 sm:py-10">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">

                      {/* 客隊 */}
                      <div className="min-w-0 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#eee1d0] bg-white text-2xl shadow-sm sm:h-16 sm:w-16 sm:text-3xl">
                          {String(freePick.sport).toUpperCase() === "FOOTBALL"
                            ? "⚽"
                            : "⚾"}
                        </div>

                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#a3988e]">
                          AWAY・客隊
                        </p>

                        <p className="mt-2 break-words text-base font-black leading-tight text-[#4a4038] sm:text-2xl">
                          {freePick.away_team}
                        </p>
                      </div>

                      {/* VS */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#ffd96d] to-[#ffb94c] text-sm font-black text-[#594217] shadow-[0_8px_20px_rgba(255,185,76,0.28)] sm:h-16 sm:w-16 sm:text-base">
                          VS
                        </div>

                        <span className="mt-2 text-[10px] font-bold text-[#b0a59a]">
                          MATCH
                        </span>
                      </div>

                      {/* 主隊 */}
                      <div className="min-w-0 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#dcecf4] bg-white text-2xl shadow-sm sm:h-16 sm:w-16 sm:text-3xl">
                          {String(freePick.sport).toUpperCase() === "FOOTBALL"
                            ? "⚽"
                            : "⚾"}
                        </div>

                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#a3988e]">
                          HOME・主隊
                        </p>

                        <p className="mt-2 break-words text-base font-black leading-tight text-[#4a4038] sm:text-2xl">
                          {freePick.home_team}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* AI 分析區 */}
                  <div className="relative p-5 sm:p-7">
                    <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">

                      <div className="rounded-[24px] border border-[#f1dfb7] bg-[#fff9e8] p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white text-xl shadow-sm">
                            🤖
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ad8b55]">
                              XSI AI RECOMMENDATION
                            </p>

                            <p className="mt-1 text-xs font-bold text-[#9b8c7d]">
                              小助手今天的賽事觀察
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 break-words text-xl font-black text-[#c47b0e] sm:text-2xl">
                          {freePick.prediction}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-[#dcecf4] bg-[#f1faff] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6d94a8]">
                              ⭐ CONFIDENCE
                            </p>

                            <p className="mt-1 text-xs font-bold text-[#8da0aa]">
                              AI 分析信心值
                            </p>
                          </div>

                          <div className="rounded-full bg-white px-3 py-1.5 text-xl font-black text-[#4a4038] shadow-sm">
                            {Number(freePick.confidence ?? 0)}%
                          </div>
                        </div>

                        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#ffd65f] via-[#ffc247] to-[#ff9f43]"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  Number(freePick.confidence ?? 0),
                                  100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-3 flex justify-between text-[10px] font-bold text-[#9eaaaF]">
                          <span>保守</span>
                          <span>穩定</span>
                          <span>積極</span>
                        </div>
                      </div>

                    </div>

                    <Link
                      href={getFreePickHref(
                        freePick,
                      )}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ffd666] to-[#ffc247] px-5 py-4 text-sm font-black text-[#4d3a13] shadow-[0_8px_18px_rgba(255,183,55,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(255,183,55,0.28)]"
                    >
                      <span>✨</span>
                      <span>查看完整免費分析</span>
                      <span>→</span>
                    </Link>
                  </div>

                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-[#eee0cd] bg-white p-8 text-center shadow-[0_8px_24px_rgba(95,75,55,0.07)]">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#fff5cf] text-3xl">
                    🤖
                  </div>

                  <p className="mt-4 text-lg font-black text-[#4a4038]">
                    今日免費精選準備中
                  </p>

                  <p className="mt-2 text-sm text-[#a3988e]">
                    XSI 小助手正在整理今天的賽事資料 ✨
                  </p>

                </div>
              )}

            </section>

            {/* ==================================
                3. 最新體育新聞
            ================================== */}
            <section className="mt-12 pb-10">

              <div className="flex items-end justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c68418]">
                    SPORTS NEWS
                  </p>

                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    📰 最新體育新聞
                  </h2>

                  <p className="mt-2 text-sm text-[#95887c]">
                    最新 MLB、NBA、足球與電競消息
                  </p>

                </div>

                <div className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-bold text-emerald-400 sm:block">
                  ● 即時更新
                </div>

              </div>

              {latestNews.length ===
              0 ? (
                <div className="mt-6 rounded-2xl border border-[#eee0cd] bg-white p-8 text-center">

                  <p className="text-lg font-black">
                    暫時無法取得最新新聞
                  </p>

                  <p className="mt-2 text-sm text-[#a3988e]">
                    新聞來源可能暫時無法連線，請稍後重新整理。
                  </p>

                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                  {latestNews.map(
                    (
                      article,
                      index,
                    ) => (
                      <NewsCard
                        key={
                          article.id
                        }
                        article={
                          article
                        }
                        priority={
                          index === 0
                        }
                      />
                    ),
                  )}

                </div>
              )}

              {latestNews.length >
                0 && (
                <div className="mt-5 rounded-xl border border-[#eee0cd] bg-white/50 px-4 py-3">

                  <p className="text-xs leading-5 text-[#a3988e]">
                    新聞內容來自外部新聞來源。
                    點擊新聞卡片可前往原始新聞頁面閱讀完整內容。
                  </p>

                </div>
              )}

            </section>

          </div>

        </section>

      </div>

    </main>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value:
    | string
    | number;
  highlight?: boolean;
}) {
  const cardStyles: Record<
    string,
    {
      icon: string;
      bg: string;
      iconBg: string;
      border: string;
      valueColor: string;
      decoration: string;
    }
  > = {
    累積分析: {
      icon: "🧠",
      bg: "bg-[#fffaf0]",
      iconBg: "bg-[#fff0bd]",
      border: "border-[#f1dfba]",
      valueColor: "text-[#665548]",
      decoration: "bg-[#ffd96a]",
    },
    歷史勝率: {
      icon: "🏆",
      bg: "bg-[#fff8df]",
      iconBg: "bg-[#ffe694]",
      border: "border-[#efd47f]",
      valueColor: "text-[#c98213]",
      decoration: "bg-[#ffc94a]",
    },
    命中: {
      icon: "🎯",
      bg: "bg-[#edfff6]",
      iconBg: "bg-[#d6f8e8]",
      border: "border-[#ccebdc]",
      valueColor: "text-[#438065]",
      decoration: "bg-[#8adbb6]",
    },
    未命中: {
      icon: "🌧️",
      bg: "bg-[#fff1f5]",
      iconBg: "bg-[#ffe0e9]",
      border: "border-[#f1d2db]",
      valueColor: "text-[#a76378]",
      decoration: "bg-[#f1a9bc]",
    },
    待結算: {
      icon: "⏳",
      bg: "bg-[#f4f0ff]",
      iconBg: "bg-[#e7dfff]",
      border: "border-[#ded4f4]",
      valueColor: "text-[#74659b]",
      decoration: "bg-[#b9a7e8]",
    },
  };

  const style =
    cardStyles[label] ??
    cardStyles["累積分析"];

  return (
    <div
      className={`group relative overflow-hidden rounded-[26px] border p-5 shadow-[0_8px_24px_rgba(95,75,55,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(95,75,55,0.12)] ${style.bg} ${style.border}`}
    >
      <div
        className={`pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-20 ${style.decoration}`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black tracking-wide text-[#968a80]">
              {label}
            </p>

            <p
              className={`mt-3 text-3xl font-black tracking-tight sm:text-[34px] ${style.valueColor}`}
            >
              {value}
            </p>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-2xl shadow-sm transition duration-200 group-hover:rotate-6 group-hover:scale-110 ${style.iconBg}`}
          >
            {style.icon}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${style.decoration}`}
          />

          <span className="text-[10px] font-bold text-[#aa9e94]">
            {highlight
              ? "XSI AI PERFORMANCE"
              : "XSI DATA"}
          </span>
        </div>
      </div>
    </div>
  );
}

function NewsCard({
  article,
  priority = false,
}: {
  article: SportsNewsItem;
  priority?: boolean;
}) {
  return (
    <a
      href={
        article.url
      }
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-2xl border border-[#eee0cd] bg-white transition hover:border-yellow-400/50 hover:bg-[#eee7df]"
    >

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#fffaf3]">

        {article.image ? (
          <Image
            src={
              article.image
            }
            alt={
              article.title
            }
            fill
            unoptimized
            priority={
              priority
            }
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">

            <div className="text-center">

              <div className="text-4xl">
                {getCategoryIcon(
                  article.category,
                )}
              </div>

              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                XSI SPORTS NEWS
              </p>

            </div>

          </div>
        )}

        <div className="absolute left-3 top-3">

          <span className="rounded-full border border-yellow-500/30 bg-black/80 px-3 py-1 text-xs font-black text-[#c68418] backdrop-blur">
            {getCategoryLabel(
              article.category,
            )}
          </span>

        </div>

      </div>

      <div className="flex min-h-[240px] flex-col p-5">

        <div className="flex items-center justify-between gap-3">

          <span className="text-xs font-bold text-[#a3988e]">
            {article.source}
          </span>

          <span className="text-[11px] text-[#a3988e]">
            {formatNewsTime(
              article.publishedAt,
            )}
          </span>

        </div>

        <h3 className="mt-4 line-clamp-3 text-lg font-black leading-7 text-[#4a4038] transition group-hover:text-[#c68418]">
          {article.title}
        </h3>

        {article.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
            {
              article.description
            }
          </p>
        )}

        <div className="mt-auto border-t border-[#eee5da] pt-4">

          <span className="text-xs font-black text-[#c68418]">
            閱讀完整新聞 →
          </span>

        </div>

      </div>

    </a>
  );
}

function getCategoryLabel(
  category: string,
) {
  if (
    category === "MLB"
  ) {
    return "⚾ MLB";
  }

  if (
    category === "NBA"
  ) {
    return "🏀 NBA";
  }

  if (
    category === "足球"
  ) {
    return "⚽ 足球";
  }

  if (
    category === "電競"
  ) {
    return "🎮 電競";
  }

  return "📰 新聞";
}

function getCategoryIcon(
  category: string,
) {
  if (
    category === "MLB"
  ) {
    return "⚾";
  }

  if (
    category === "NBA"
  ) {
    return "🏀";
  }

  if (
    category === "足球"
  ) {
    return "⚽";
  }

  if (
    category === "電競"
  ) {
    return "🎮";
  }

  return "📰";
}

function formatNewsTime(
  date: string,
) {
  try {
    return new Intl.DateTimeFormat(
      "zh-TW",
      {
        timeZone:
          "Asia/Taipei",

        month: "2-digit",

        day: "2-digit",

        hour: "2-digit",

        minute: "2-digit",

        hour12: false,
      },
    ).format(
      new Date(date),
    );
  } catch {
    return "";
  }
}