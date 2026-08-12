import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentUserMembership,
} from "../../lib/membership";

import {
  formatTaiwanFootballTime,
} from "../../lib/api/football";

import {
  getFootballSchedule,
} from "../../lib/services/footballData";

import {
  createAdminClient,
} from "../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

type PredictionHistory = {
  id: string;
  game_pk: string;
  sport: string;
  home_team: string;
  away_team: string;
  prediction: string;

  totals_prediction:
    | string
    | null;

  totals_confidence:
    | number
    | string
    | null;

  confidence:
    | number
    | string
    | null;

  result:
    | string
    | null;

  created_at: string;
};

type PredictionMapItem = {
  prediction: string;

  confidence: number;

  totalsPrediction:
    | string
    | null;

  totalsConfidence:
    number | null;

  result: string;
};

type FootballPageProps = {
  searchParams?: Promise<{
    league?: string;
  }>;
};

const leagueOrder = [
  "英超",
  "西甲",
  "義甲",
  "德甲",
  "法甲",
  "歐冠",
  "歐霸",
];

function normalize(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}

function getConfidence(
  value:
    | number
    | string
    | null,
) {
  const number =
    Number(
      value ?? 0,
    );

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        number,
      ),
    ),
  );
}

function getResultLabel(
  result: string,
) {
  const normalized =
    normalize(
      result,
    );

  if (
    [
      "win",
      "won",
      "correct",
    ].includes(
      normalized,
    )
  ) {
    return "命中";
  }

  if (
    [
      "loss",
      "lose",
      "lost",
      "wrong",
    ].includes(
      normalized,
    )
  ) {
    return "未命中";
  }

  return "待結算";
}

function getResultClass(
  result: string,
) {
  const normalized =
    normalize(
      result,
    );

  if (
    [
      "win",
      "won",
      "correct",
    ].includes(
      normalized,
    )
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }

  if (
    [
      "loss",
      "lose",
      "lost",
      "wrong",
    ].includes(
      normalized,
    )
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-400";
  }

  return "border-yellow-500/20 bg-yellow-400/10 text-yellow-400";
}

function getLeagueIcon(
  league: string,
) {
  if (
    league === "英超"
  ) {
    return "🏴";
  }

  if (
    league === "西甲"
  ) {
    return "🇪🇸";
  }

  if (
    league === "義甲"
  ) {
    return "🇮🇹";
  }

  if (
    league === "德甲"
  ) {
    return "🇩🇪";
  }

  if (
    league === "法甲"
  ) {
    return "🇫🇷";
  }

  if (
    league === "歐冠"
  ) {
    return "⭐";
  }

  if (
    league === "歐霸"
  ) {
    return "🏆";
  }

  return "⚽";
}

export default async function FootballPage({
  searchParams,
}: FootballPageProps) {
  const membership =
    await getCurrentUserMembership();

  if (
    !membership.isLoggedIn
  ) {
    redirect(
      "/login",
    );
  }

  const resolvedSearchParams =
    searchParams
      ? await searchParams
      : {};

  const selectedLeague =
    String(
      resolvedSearchParams
        ?.league ??
        "",
    ).trim();

  /*
   * ==========================================
   * 未來 14 天足球賽事
   * ==========================================
   */
  const games =
  await getFootballSchedule();

  /*
   * ==========================================
   * 每個聯賽場數
   * ==========================================
   */
  const leagueCounts =
    new Map<
      string,
      number
    >();

  for (
    const league
    of leagueOrder
  ) {
    leagueCounts.set(
      league,
      0,
    );
  }

  for (
    const game
    of games
  ) {
    leagueCounts.set(
      game.leagueShortName,
      (
        leagueCounts.get(
          game.leagueShortName,
        ) ?? 0
      ) + 1,
    );
  }

  /*
   * ==========================================
   * 根據網址篩選
   * ==========================================
   */
  const filteredGames =
    selectedLeague
      ? games.filter(
          (game) =>
            game.leagueShortName ===
            selectedLeague,
        )
      : games;

  const supabase =
    createAdminClient();

  const gameIds =
    games.map(
      (game) =>
        String(
          game.id,
        ),
    );

  let histories:
    PredictionHistory[] =
    [];

  if (
    gameIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
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
          totals_prediction,
          totals_confidence,
          result,
          created_at
        `,
      )
      .eq(
        "sport",
        "FOOTBALL",
      )
      .in(
        "game_pk",
        gameIds,
      );

    if (
      error
    ) {
      console.error(
        "足球頁 prediction_history 讀取失敗:",
        error,
      );
    }

    histories =
      (data ??
        []) as PredictionHistory[];
  }

  const predictionMap =
    new Map<
      string,
      PredictionMapItem
    >();

  for (
    const history
    of histories
  ) {
    predictionMap.set(
      String(
        history.game_pk,
      ),
      {
        prediction:
          history.prediction,

        confidence:
          getConfidence(
            history.confidence,
          ),

        totalsPrediction:
          history.totals_prediction
            ? String(
                history.totals_prediction,
              ).trim()
            : null,

        totalsConfidence:
          history.totals_confidence ===
            null
            ? null
            : getConfidence(
                history.totals_confidence,
              ),

        result:
          String(
            history.result ??
              "pending",
          ),
      },
    );
  }

  const analyzedCount =
    predictionMap.size;

  const updateTime =
    new Intl.DateTimeFormat(
      "zh-TW",
      {
        timeZone:
          "Asia/Taipei",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,
      },
    ).format(
      new Date(),
    );

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white sm:px-6 md:p-8">

      <div className="mx-auto w-full max-w-[1400px]">

        {/* =========================
            BACK
        ========================= */}
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
        >
          ← 回上一頁
        </Link>

        {/* =========================
            HERO
        ========================= */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-black">

          <div className="p-6 sm:p-8">

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
              XSI AI FOOTBALL
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              ⚽ 足球賽事分析
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              顯示未來 14 天全球各大聯賽與盃賽賽程，
              並同步 AI 分析預測與信心度。
            </p>

          </div>

        </section>

        {/* =========================
            LEAGUE FILTER
        ========================= */}
        <section className="mt-6">

          <div className="flex gap-3 overflow-x-auto pb-2">

            <Link
              href="/football"
              className={`flex shrink-0 items-center gap-3 rounded-full border px-5 py-3 text-sm font-black transition ${
                !selectedLeague
                  ? "border-yellow-400 bg-yellow-400/10 text-white"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-yellow-400/60"
              }`}
            >
              <span>
                全部
              </span>

              <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-black text-black">
                {
                  games.length
                }
              </span>
            </Link>

            {leagueOrder.map(
              (league) => {
                const count =
                  leagueCounts.get(
                    league,
                  ) ?? 0;

                const isActive =
                  selectedLeague ===
                  league;

                return (
                  <Link
                    key={
                      league
                    }
                    href={`/football?league=${encodeURIComponent(
                      league,
                    )}`}
                    className={`flex shrink-0 items-center gap-3 rounded-full border px-5 py-3 text-sm font-black transition ${
                      isActive
                        ? "border-yellow-400 bg-yellow-400/10 text-white"
                        : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-yellow-400/60 hover:text-white"
                    }`}
                  >
                    <span>
                      {
                        getLeagueIcon(
                          league,
                        )
                      }
                    </span>

                    <span>
                      {
                        league
                      }
                    </span>

                    <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-black text-black">
                      {
                        count
                      }
                    </span>
                  </Link>
                );
              },
            )}

          </div>

        </section>

        {/* =========================
            SUMMARY
        ========================= */}
        <section className="mt-6 grid gap-3 md:grid-cols-3">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-xs font-bold text-zinc-500">
              賽事總數
            </p>

            <p className="mt-2 text-3xl font-black text-yellow-400">
              {
                games.length
              }
              <span className="ml-2 text-base">
                場
              </span>
            </p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-xs font-bold text-zinc-500">
              已有 AI 分析
            </p>

            <p className="mt-2 text-3xl font-black text-yellow-400">
              {
                analyzedCount
              }
              <span className="ml-2 text-base">
                場
              </span>
            </p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-xs font-bold text-zinc-500">
              更新時間
            </p>

            <p className="mt-2 text-lg font-black text-yellow-400">
              {
                updateTime
              }
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              台灣時間
            </p>

          </div>

        </section>

        {/* =========================
            INFO BAR
        ========================= */}
        <section className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-50 px-5 py-4 text-sm font-bold text-zinc-900">

          💡 目前顯示未來 14 天賽程

          {selectedLeague && (
            <span className="ml-2">
              ｜目前篩選：
              {
                selectedLeague
              }
            </span>
          )}

        </section>

        {/* =========================
            EMPTY
        ========================= */}
        {filteredGames.length ===
        0 ? (
          <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center">

            <div className="text-5xl">
              ⚽
            </div>

            <h2 className="mt-5 text-xl font-black">
              {
                selectedLeague
                  ? `${selectedLeague} 目前沒有賽事`
                  : "目前沒有符合條件的足球賽事"
              }
            </h2>

            <p className="mt-3 text-sm text-zinc-500">
              可以切換其他聯賽查看近期賽程。
            </p>

          </section>
        ) : (
          <section className="mt-8 grid gap-5 lg:grid-cols-2">

            {filteredGames.map(
              (game) => {
                const prediction =
                  predictionMap.get(
                    String(
                      game.id,
                    ),
                  );

                return (
                  <div
                    key={
                      game.id
                    }
                    className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"
                  >

                    <div className="border-b border-zinc-800 bg-zinc-950/60 p-5">

                      <div className="flex flex-wrap items-center justify-between gap-3">

                        <span className="rounded-full border border-yellow-500/20 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-400">
                          {
                            getLeagueIcon(
                              game.leagueShortName,
                            )
                          }
                          {" "}
                          {
                            game.leagueShortName
                          }
                        </span>

                        <span className="text-xs font-bold text-zinc-500">
                          {
                            formatTaiwanFootballTime(
                              game.commenceTime,
                            )
                          }
                        </span>

                      </div>

                    </div>

                    <div className="p-5 sm:p-6">

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">

                        <div>

                          <p className="text-xs font-bold text-zinc-500">
                            客隊
                          </p>

                          <h2 className="mt-2 break-words text-lg font-black sm:text-xl">
                            {
                              game.awayTeam
                            }
                          </h2>

                        </div>

                        <div className="font-black text-yellow-400">
                          VS
                        </div>

                        <div className="text-right">

                          <p className="text-xs font-bold text-zinc-500">
                            主隊
                          </p>

                          <h2 className="mt-2 break-words text-lg font-black sm:text-xl">
                            {
                              game.homeTeam
                            }
                          </h2>

                        </div>

                      </div>

                      {/* AI */}
                      <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-400/5 p-5">

                        <div className="flex flex-wrap items-center justify-between gap-3">

                          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                            XSI AI Recommendation
                          </p>

                          {prediction && (
                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] font-black ${getResultClass(
                                prediction.result,
                              )}`}
                            >
                              {
                                getResultLabel(
                                  prediction.result,
                                )
                              }
                            </span>
                          )}

                        </div>

                        {prediction ? (
                          <>
                            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">

                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                                推薦
                              </p>

                              <p className="mt-2 text-xl font-black text-white">
                                {
                                  prediction.prediction
                                }
                              </p>

                              <div className="mt-4">

                                <div className="flex items-center justify-between text-xs">

                                  <span className="text-zinc-500">
                                    XSI 評分
                                  </span>

                                  <span className="font-black text-yellow-400">
                                    {
                                      prediction.confidence
                                    }
                                  </span>

                                </div>

                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">

                                  <div
                                    className="h-full rounded-full bg-yellow-400"
                                    style={{
                                      width: `${prediction.confidence}%`,
                                    }}
                                  />

                                </div>

                              </div>

                            </div>

                            {prediction.totalsPrediction && (
                              <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-400/5 p-4">

                                <div className="flex items-center justify-between gap-3">

                                  <div>

                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">
                                      大小
                                    </p>

                                    <p className="mt-2 text-xl font-black text-white">
                                      {
                                        prediction.totalsPrediction
                                      }
                                    </p>

                                  </div>

                                  {prediction.totalsConfidence !==
                                    null && (
                                    <div className="text-right">

                                      <p className="text-[10px] font-bold text-zinc-500">
                                        模型機率
                                      </p>

                                      <p className="mt-1 text-lg font-black text-yellow-400">
                                        {
                                          prediction.totalsConfidence
                                        }
                                        %
                                      </p>

                                    </div>
                                  )}

                                </div>

                                {prediction.totalsConfidence !==
                                  null && (
                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">

                                    <div
                                      className="h-full rounded-full bg-yellow-400"
                                      style={{
                                        width: `${prediction.totalsConfidence}%`,
                                      }}
                                    />

                                  </div>
                                )}

                              </div>
                            )}
                          </>
                        ) : (
                          <div className="mt-3">

                            <p className="text-sm font-bold text-zinc-400">
                              尚未產生 AI 分析
                            </p>

                            <p className="mt-2 text-xs text-zinc-600">
                              執行足球批次預測後會自動同步。
                            </p>

                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                );
              },
            )}

          </section>
        )}

      </div>

    </main>
  );
}