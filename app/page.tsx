import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import Sidebar from "../components/Sidebar";

import { getCurrentUserMembership } from "../lib/membership";
import { createAdminClient } from "../lib/supabase/admin";
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
  confidence: number | string | null;
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

export default async function Home() {
  const membership =
    await getCurrentUserMembership();

  if (!membership.isLoggedIn) {
    redirect("/login");
  }

  const supabase =
    createAdminClient();

  const [
    historyResult,
    sportsNews,
  ] = await Promise.all([
    supabase
      .from("prediction_history")
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
      .order("created_at", {
        ascending: false,
      }),

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

  // ==========================================
  // XSI 歷史基準
  // ==========================================

  const BASE_TOTAL = 354;
  const BASE_WINS = 269;
  const BASE_LOSSES = 85;

  // 建立基準時資料庫已有 4 筆紀錄
  const BASE_DATABASE_COUNT = 4;

  const settledGames =
    histories.filter((item) =>
      [
        "win",
        "won",
        "correct",
        "loss",
        "lose",
        "lost",
        "wrong",
      ].includes(
        item.result?.toLowerCase(),
      ),
    );

  const liveWins =
    settledGames.filter((item) =>
      [
        "win",
        "won",
        "correct",
      ].includes(
        item.result?.toLowerCase(),
      ),
    ).length;

  const liveLosses =
    settledGames.filter((item) =>
      [
        "loss",
        "lose",
        "lost",
        "wrong",
      ].includes(
        item.result?.toLowerCase(),
      ),
    ).length;

  const totalWins =
    BASE_WINS + liveWins;

  const totalLosses =
    BASE_LOSSES + liveLosses;

  const newPredictionCount =
    Math.max(
      histories.length -
        BASE_DATABASE_COUNT,
      0,
    );

  const totalPredictions =
    BASE_TOTAL +
    newPredictionCount;

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

  // ==========================================
  // 今日免費精選
  // 目前先使用 MLB 信心度最高紀錄
  // ==========================================

  const freePick =
  [...histories]
    .filter((item) => {
      const gamePk =
        String(item.game_pk ?? "");

      const homeTeam =
        String(item.home_team ?? "");

      const awayTeam =
        String(item.away_team ?? "");

      const prediction =
        String(item.prediction ?? "");

      const isRealGame =
        /^\d+$/.test(gamePk);

      const hasInvalidText =
        homeTeam.includes("?") ||
        awayTeam.includes("?") ||
        prediction.includes("?") ||
        homeTeam
          .toLowerCase()
          .includes("api") ||
        awayTeam
          .toLowerCase()
          .includes("api");

      return (
        item.sport === "MLB" &&
        isRealGame &&
        !hasInvalidText
      );
    })
    .sort(
      (a, b) =>
        Number(
          b.confidence ?? 0,
        ) -
        Number(
          a.confidence ?? 0,
        ),
    )[0] ?? null;

  // 首頁最多顯示 6 則最新新聞
  const latestNews =
    sportsNews.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">

      {/* Header */}
      <header className="border-b border-yellow-500/20 bg-black">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">

          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-yellow-400 sm:text-2xl">
              十一體育分析 AI
            </h1>

            <p className="mt-1 hidden text-sm text-zinc-400 sm:block">
              運動數據智慧平台
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-yellow-500/30 bg-zinc-900 px-3 py-2 text-xs font-bold sm:px-4 sm:text-sm">
            {membership.isVip
              ? "VIP 會員"
              : membership.name}
          </div>

        </div>

        {/* 手機版選單 */}
        <nav className="border-t border-zinc-900 px-3 py-3 md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">

            {mobileMenuItems.map(
              (item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
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

        {/* 桌機 Sidebar */}
        <div className="hidden shrink-0 md:block">
          <Sidebar />
        </div>

        {/* Main Content */}
        <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:p-8">
          <div className="mx-auto w-full max-w-[1400px]">

            {/* ==================================
                1. 歷史分析勝率
            ================================== */}

            <section>
              <div className="flex items-end justify-between gap-4">

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
                    XSI AI PERFORMANCE
                  </p>

                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    📊 歷史分析勝率
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    XSI AI 累積預測統計
                  </p>
                </div>

                <Link
                  href="/history"
                  className="hidden text-sm font-bold text-yellow-400 transition hover:text-yellow-300 sm:block"
                >
                  完整戰績 →
                </Link>

              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

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

              </div>

              <Link
                href="/history"
                className="mt-4 flex w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400 sm:hidden"
              >
                查看完整歷史戰績 →
              </Link>
            </section>

            {/* ==================================
                2. 今日免費精選
            ================================== */}

            <section className="mt-12">

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
                  FREE PICK
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  🔥 今日免費精選
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  每日提供一場 XSI AI 免費分析
                </p>
              </div>

              {freePick ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-yellow-500/20 bg-zinc-900">

                  <div className="border-b border-zinc-800 bg-gradient-to-r from-yellow-400/10 to-transparent p-5 sm:p-7">

                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <div className="flex items-center gap-2">

                        <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-black">
                          FREE
                        </span>

                        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-bold text-zinc-300">
                          {freePick.sport}
                        </span>

                      </div>

                      <span className="text-xs text-zinc-500">
                        Game ID：
                        {freePick.game_pk}
                      </span>

                    </div>

                    <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

                      <div>
                        <p className="text-xs font-bold text-zinc-500">
                          客隊
                        </p>

                        <p className="mt-2 break-words text-lg font-black sm:text-2xl">
                          {
                            freePick.away_team
                          }
                        </p>
                      </div>

                      <div className="text-lg font-black text-yellow-400">
                        VS
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-500">
                          主隊
                        </p>

                        <p className="mt-2 break-words text-lg font-black sm:text-2xl">
                          {
                            freePick.home_team
                          }
                        </p>
                      </div>

                    </div>

                  </div>

                  <div className="p-5 sm:p-7">

                    <div className="grid gap-4 sm:grid-cols-2">

                      <div className="rounded-2xl bg-zinc-950 p-5">

                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                          AI Recommendation
                        </p>

                        <p className="mt-3 text-xl font-black text-yellow-400">
                          {
                            freePick.prediction
                          }
                        </p>

                      </div>

                      <div className="rounded-2xl bg-zinc-950 p-5">

                        <div className="flex items-center justify-between">

                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                            Confidence
                          </p>

                          <p className="text-xl font-black">
                            {Number(
                              freePick.confidence ??
                                0,
                            )}
                            %
                          </p>

                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-yellow-400"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  Number(
                                    freePick.confidence ??
                                      0,
                                  ),
                                  100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>

                      </div>

                    </div>

                    <Link
                      href={`/mlb/${freePick.game_pk}`}
                      className="mt-5 flex w-full items-center justify-center rounded-xl bg-yellow-400 px-5 py-3.5 text-sm font-black text-black transition hover:bg-yellow-300"
                    >
                      查看完整免費分析 →
                    </Link>

                  </div>

                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">

                  <p className="text-lg font-black">
                    今日免費精選準備中
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    XSI AI 分析完成後將自動顯示於此。
                  </p>

                </div>
              )}

            </section>

            {/* ==================================
                3. 真實體育新聞
            ================================== */}

            <section className="mt-12 pb-10">

              <div className="flex items-end justify-between gap-4">

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
                    SPORTS NEWS
                  </p>

                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    📰 最新體育新聞
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    最新 MLB、NBA、足球與電競消息
                  </p>
                </div>

                <div className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-bold text-emerald-400 sm:block">
                  ● 即時更新
                </div>

              </div>

              {latestNews.length ===
              0 ? (
                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">

                  <p className="text-lg font-black">
                    暫時無法取得最新新聞
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    新聞來源可能暫時無法連線，請稍後重新整理。
                  </p>

                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                  {latestNews.map(
                    (article) => (
                      <NewsCard
                        key={
                          article.id
                        }
                        article={
                          article
                        }
                      />
                    ),
                  )}

                </div>
              )}

              {latestNews.length >
                0 && (
                <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">

                  <p className="text-xs leading-5 text-zinc-500">
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
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "border-yellow-500/30 bg-yellow-400/5"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <p className="text-xs font-bold text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-black ${
          highlight
            ? "text-yellow-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function NewsCard({
  article,
}: {
  article: SportsNewsItem;
}) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition hover:border-yellow-400/50 hover:bg-zinc-800"
    >
      {/* 新聞圖片 */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-950">
        {article.image ? (
          <Image
            src={article.image}
            alt={article.title}
            fill
            unoptimized
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

        {/* 分類標籤 */}
        <div className="absolute left-3 top-3">
          <span className="rounded-full border border-yellow-500/30 bg-black/80 px-3 py-1 text-xs font-black text-yellow-400 backdrop-blur">
            {getCategoryLabel(
              article.category,
            )}
          </span>
        </div>
      </div>

      {/* 新聞內容 */}
      <div className="flex min-h-[240px] flex-col p-5">

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-zinc-500">
            {article.source}
          </span>

          <span className="text-[11px] text-zinc-500">
            {formatNewsTime(
              article.publishedAt,
            )}
          </span>
        </div>

        <h3 className="mt-4 line-clamp-3 text-lg font-black leading-7 text-white transition group-hover:text-yellow-400">
          {article.title}
        </h3>

        {article.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
            {article.description}
          </p>
        )}

        <div className="mt-auto border-t border-zinc-800 pt-4">
          <span className="text-xs font-black text-yellow-400">
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
  if (category === "MLB") {
    return "⚾ MLB";
  }

  if (category === "NBA") {
    return "🏀 NBA";
  }

  if (category === "足球") {
    return "⚽ 足球";
  }

  if (category === "電競") {
    return "🎮 電競";
  }

  return "📰 新聞";
}
function getCategoryIcon(
  category: string,
) {
  if (category === "MLB") {
    return "⚾";
  }

  if (category === "NBA") {
    return "🏀";
  }

  if (category === "足球") {
    return "⚽";
  }

  if (category === "電競") {
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