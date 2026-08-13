import {
  getCurrentMlbSchedule,
} from "../../../lib/api/mlb";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentUserMembership,
} from "../../../lib/membership";

import {
  createAdminClient,
} from "../../../lib/supabase/admin";

import {
  getCachedFootballSchedule,
} from "../../../lib/services/footballSchedule";


const LINE_URL =
  "https://lin.ee/r8t6pBB4";

export const dynamic =
  "force-dynamic";

type SupportedSport =
  | "MLB"
  | "FOOTBALL";

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

  result:
    | string
    | null;

  created_at: string;
};

type ParlayPick = {
  id: string;

  gamePk: string;

  sport:
    SupportedSport;

  awayTeam: string;

  homeTeam: string;

  prediction: string;

  confidence: number;

  gameTime:
    | string
    | null;
};

type ParlayGroup = {
  level: string;

  legs: number;

  averageConfidence:
    number;

  risk: string;

  description: string;

  picks:
    ParlayPick[];
};

/* ==========================================
   共用文字處理
========================================== */

function normalize(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}

/* ==========================================
   排除測試 / 無效資料
========================================== */

function hasInvalidText(
  value: string,
) {
  const text =
    normalize(
      value,
    );

  if (!text) {
    return true;
  }

  return (
    text.includes(
      "test",
    ) ||
    text.includes(
      "測試",
    ) ||
    text.includes(
      "api-test",
    ) ||
    text.includes(
      "???",
    )
  );
}

/* ==========================================
   判斷是否有效
========================================== */

function isValidPrediction(
  item:
    PredictionHistory,
) {
  const sport =
    normalize(
      item.sport,
    );

  const result =
    normalize(
      item.result,
    );

  const gamePk =
    String(
      item.game_pk ??
        "",
    ).trim();

  const homeTeam =
    String(
      item.home_team ??
        "",
    ).trim();

  const awayTeam =
    String(
      item.away_team ??
        "",
    ).trim();

  const prediction =
    String(
      item.prediction ??
        "",
    ).trim();

  /*
   * ========================================
   * 只接受 MLB / FOOTBALL
   * ========================================
   */
  const isMlb =
    sport ===
    "mlb";

  const isFootball =
    sport ===
      "football" ||
    sport ===
      "soccer";

  if (
    !isMlb &&
    !isFootball
  ) {
    return false;
  }

  /*
   * ========================================
   * 只接受 pending
   * ========================================
   */
  if (
    result !==
    "pending"
  ) {
    return false;
  }

  /*
   * ========================================
   * Game ID 必須存在
   * ========================================
   */
  if (!gamePk) {
    return false;
  }

  /*
   * MLB gamePk 必須純數字
   *
   * 足球 Odds API event id
   * 可以是英數混合，
   * 所以不能用純數字限制。
   * ========================================
   */
  if (
    isMlb &&
    !/^\d+$/.test(
      gamePk,
    )
  ) {
    return false;
  }

  /*
   * ========================================
   * 排除無效資料
   * ========================================
   */
  if (
    hasInvalidText(
      homeTeam,
    ) ||
    hasInvalidText(
      awayTeam,
    ) ||
    hasInvalidText(
      prediction,
    )
  ) {
    return false;
  }

  return true;
}

/* ==========================================
   轉成串關 Pick
========================================== */

function toParlayPick(
  item:
    PredictionHistory,
  gameTime:
    | string
    | null,
): ParlayPick {
  const confidenceRaw =
    Number(
      item.confidence ??
        0,
    );

  const confidence =
    Number.isFinite(
      confidenceRaw,
    )
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              confidenceRaw,
            ),
          ),
        )
      : 0;

  const sport =
    normalize(
      item.sport,
    ) === "mlb"
      ? "MLB"
      : "FOOTBALL";

  return {
    id:
      item.id,

    gamePk:
      String(
        item.game_pk,
      ),

    sport,

    awayTeam:
      item.away_team,

    homeTeam:
      item.home_team,

    prediction:
      item.prediction,

    confidence,

    gameTime,
  };
}

/* ==========================================
   比賽時間
========================================== */

function formatGameTime(
  gameTime:
    | string
    | null,
) {
  if (!gameTime) {
    return "時間待定";
  }

  try {
    return new Intl.DateTimeFormat(
      "zh-TW",
      {
        timeZone:
          "Asia/Taipei",
        month: "numeric",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).format(
      new Date(
        gameTime,
      ),
    );
  } catch {
    return "時間待定";
  }
}

/* ==========================================
   平均信心
========================================== */

function calculateAverageConfidence(
  picks:
    ParlayPick[],
) {
  if (
    picks.length ===
    0
  ) {
    return 0;
  }

  const total =
    picks.reduce(
      (
        sum,
        pick,
      ) =>
        sum +
        pick.confidence,
      0,
    );

  return Math.round(
    total /
      picks.length,
  );
}

/* ==========================================
   建立串關
========================================== */

function createParlayGroup({
  level,
  legs,
  risk,
  description,
  allPicks,
}: {
  level: string;
  legs: number;
  risk: string;
  description: string;
  allPicks: ParlayPick[];
}): ParlayGroup {
  const picks: ParlayPick[] =
    [];

  const usedMatchups =
    new Set<string>();

  for (
    const pick
    of allPicks
  ) {
    /*
     * ========================================
     * 建立對戰識別
     *
     * 同一組球隊互打，不論 gamePk 是否不同，
     * 同一張串關最多只能選一場。
     *
     * 例如：
     * 坦帕灣光芒 vs 運動家
     * 坦帕灣光芒 vs 運動家
     *
     * 只保留信心較高的那一場。
     * ========================================
     */

    const teamA =
      normalize(
        pick.awayTeam,
      );

    const teamB =
      normalize(
        pick.homeTeam,
      );

    /*
     * 排序後組成 key，
     * 避免主客交換時被當成不同對戰。
     */
    const matchupKey =
      [teamA, teamB]
        .sort()
        .join("::");

    if (
      usedMatchups.has(
        matchupKey,
      )
    ) {
      continue;
    }

    picks.push(
      pick,
    );

    usedMatchups.add(
      matchupKey,
    );

    if (
      picks.length ===
      legs
    ) {
      break;
    }
  }

  return {
    level,
    legs,

    averageConfidence:
      calculateAverageConfidence(
        picks,
      ),

    risk,
    description,
    picks,
  };
}

/* ==========================================
   SPORT 標籤
========================================== */

function getSportLabel(
  sport:
    SupportedSport,
) {
  if (
    sport ===
    "MLB"
  ) {
    return "⚾ MLB";
  }

  return "⚽ 足球";
}

/* ==========================================
   PAGE
========================================== */

export default async function ParlayPage() {
  const membership =
    await getCurrentUserMembership();

  if (
    !membership.isLoggedIn
  ) {
    redirect(
      "/login",
    );
  }

  /*
   * ==========================================
   * 非 VIP
   * ==========================================
   */
  if (
    !membership.isVip
  ) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] px-4 py-6 text-white sm:px-6 md:p-8">

        <div className="mx-auto w-full max-w-[1400px]">

          <Link
            href="/"
            className="inline-flex items-center text-sm font-bold text-zinc-400 transition hover:text-yellow-400"
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
                XSI AI 會整合 MLB 與足球分析，
                依模型信心度自動挑選適合組合的賽事。
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
                  升級 VIP 後即可查看 MLB 與足球
                  XSI AI 串關組合、信心度與風險評級。
                </p>

                <a
                  href={
                    LINE_URL
                  }
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

  /*
   * ==========================================
   * VIP 讀 prediction_history
   * ==========================================
   */
  const supabase =
    createAdminClient();

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
        result,
        created_at
      `,
    )
    .in(
      "sport",
      [
        "MLB",
        "FOOTBALL",
      ],
    )
    .eq(
      "result",
      "pending",
    )
    .order(
      "confidence",
      {
        ascending:
          false,
      },
    );

  if (error) {
    console.error(
      "串關 prediction_history 讀取失敗:",
      error,
    );
  }

  const histories =
  (data ??
    []) as PredictionHistory[];

/*
 * ==========================================
 * 取得目前 MLB / 足球賽程時間
 *
 * MLB：
 * 使用 getCurrentMlbSchedule()
 *
 * FOOTBALL：
 * 使用 football_schedule 快取
 *
 * 串關卡與 TOP PICKS
 * 都統一顯示台灣時間。
 * ==========================================
 */

let currentMlbGamePks =
  new Set<string>();

const mlbGameTimeMap =
  new Map<
    string,
    string
  >();

try {
  const currentMlbGames =
    await getCurrentMlbSchedule();

  currentMlbGamePks =
    new Set(
      currentMlbGames.map(
        (game) =>
          String(
            game.gamePk,
          ),
      ),
    );

  for (
    const game
    of currentMlbGames
  ) {
    mlbGameTimeMap.set(
      String(
        game.gamePk,
      ),
      game.gameDate,
    );
  }

  console.log(
    `🔥 串關頁目前 MLB 有效賽事：${currentMlbGamePks.size} 場`,
  );
} catch (error) {
  console.error(
    "串關頁讀取目前 MLB 賽程失敗:",
    error,
  );
}

const footballGameTimeMap =
  new Map<
    string,
    string
  >();

try {
  const currentFootballGames =
    await getCachedFootballSchedule(
      14,
    );

  for (
    const game
    of currentFootballGames
  ) {
    const gameId =
      String(
        game.id,
      );

    if (
      game.commenceTime
    ) {
      footballGameTimeMap.set(
        gameId,
        game.commenceTime,
      );
    }
  }

  console.log(
    `🔥 串關頁足球賽程時間：${footballGameTimeMap.size} 場`,
  );
} catch (error) {
  console.error(
    "串關頁讀取足球賽程時間失敗:",
    error,
  );
}

/*
 * ==========================================
 * 有效 Pick
 *
 * FOOTBALL：
 * 維持原本 pending 邏輯
 *
 * MLB：
 * 除了 pending 之外，
 * gamePk 還必須存在於目前 MLB 顯示日賽程
 * ==========================================
 */
const availablePicks =
  histories
    .filter(
      isValidPrediction,
    )
    .filter(
      (item) => {
        const sport =
          normalize(
            item.sport,
          );

        /*
         * 足球維持原本邏輯
         */
        if (
          sport === "football" ||
          sport === "soccer"
        ) {
          return true;
        }

        /*
         * MLB 只保留目前顯示日賽程
         */
        if (
          sport === "mlb"
        ) {
          return currentMlbGamePks.has(
            String(
              item.game_pk,
            ),
          );
        }

        return false;
      },
    )
    .map(
      (item) => {
        const sport =
          normalize(
            item.sport,
          );

        const gameTime =
          sport === "mlb"
            ? mlbGameTimeMap.get(
                String(
                  item.game_pk,
                ),
              ) ??
              null
            : footballGameTimeMap.get(
                String(
                  item.game_pk,
                ),
              ) ??
              null;

        return toParlayPick(
          item,
          gameTime,
        );
      },
    )
    .sort(
      (
        a,
        b,
      ) =>
        b.confidence -
        a.confidence,
    );

  /*
   * ==========================================
   * 分別統計
   * ==========================================
   */
  const mlbCount =
    availablePicks.filter(
      (pick) =>
        pick.sport ===
        "MLB",
    ).length;

  const footballCount =
    availablePicks.filter(
      (pick) =>
        pick.sport ===
        "FOOTBALL",
    ).length;

  /*
   * ==========================================
   * 建立串關
   * ==========================================
   */
  const stableParlay =
    createParlayGroup({
      level:
        "穩健型",

      legs:
        2,

      risk:
        "低",

      description:
        "優先使用目前全部 MLB 與足球預測中信心最高的兩場。",

      allPicks:
        availablePicks,
    });

  const balancedParlay =
    createParlayGroup({
      level:
        "均衡型",

      legs:
        3,

      risk:
        "中",

      description:
        "使用前三高信心預測組成三串一，兼顧模型信心與組合報酬。",

      allPicks:
        availablePicks,
    });

  const aggressiveParlay =
    createParlayGroup({
      level:
        "高報酬型",

      legs:
        4,

      risk:
        "高",

      description:
        "加入第四高信心預測提高串關報酬，同時承擔更高組合風險。",

      allPicks:
        availablePicks,
    });

  const parlays = [
    stableParlay,
    balancedParlay,
    aggressiveParlay,
  ];

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-6 text-white sm:px-6 md:p-8">

      <div className="mx-auto w-full max-w-[1400px]">

        <Link
          href="/"
          className="inline-flex items-center text-sm font-bold text-zinc-400 transition hover:text-yellow-400"
        >
          ← 回上一頁
        </Link>

        {/* =========================
            HEADER
        ========================= */}
        <section className="mt-8">

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            XSI AI PARLAY
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            🔥 今日串關推薦
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            MLB + 足球 VIP 專屬 AI 串關組合
          </p>

          {/* =========================
              數量統計
          ========================= */}
          <div className="mt-5 flex flex-wrap gap-2">

            <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-400">
              ⚾ MLB

              <span className="ml-2 text-yellow-400">
                {
                  mlbCount
                } 場
              </span>
            </div>

            <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-400">
              ⚽ 足球

              <span className="ml-2 text-yellow-400">
                {
                  footballCount
                } 場
              </span>
            </div>

            <div className="rounded-full border border-yellow-500/20 bg-yellow-400/10 px-4 py-2 text-xs font-black text-yellow-400">
              合計

              <span className="ml-2">
                {
                  availablePicks.length
                } 場
              </span>
            </div>

          </div>

        </section>

        {/* =========================
            無足夠資料
        ========================= */}
        {availablePicks.length <
        2 ? (
          <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center">

            <div className="text-4xl">
              🤖
            </div>

            <h2 className="mt-4 text-xl font-black">
              今日串關推薦準備中
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              目前有效 AI 預測不足兩場，
              系統完成分析後將自動產生串關組合。
            </p>

          </section>
        ) : (
          <>
            {/* =========================
                串關卡
            ========================= */}
            <section className="mt-8 grid gap-5 lg:grid-cols-3">

              {parlays.map(
                (
                  parlay,
                ) => (
                  <ParlayCard
                    key={
                      parlay.level
                    }
                    parlay={
                      parlay
                    }
                  />
                ),
              )}

            </section>

            {/* =========================
                TOP PICKS
            ========================= */}
            <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">

              <div className="flex flex-wrap items-end justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                    AI TOP PICKS
                  </p>

                  <h2 className="mt-2 text-xl font-black sm:text-2xl">
                    今日高信心候選
                  </h2>

                </div>

                <span className="text-xs text-zinc-500">
                  MLB + 足球依 AI 信心排序
                </span>

              </div>

              <div className="mt-6 grid gap-3">

                {availablePicks
                  .slice(
                    0,
                    10,
                  )
                  .map(
                    (
                      pick,
                      index,
                    ) => (
                      <div
                        key={
                          `${pick.sport}-${pick.gamePk}`
                        }
                        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black">
                                {
                                  index +
                                  1
                                }
                              </span>

                              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-black text-zinc-300">
                                {
                                  getSportLabel(
                                    pick.sport,
                                  )
                                }
                              </span>

                              <span className="text-[10px] text-zinc-600">
                                ID：
                                {
                                  pick.gamePk
                                }
                              </span>

                            </div>

                            <p className="mt-3 text-sm font-bold text-zinc-400">
                              {
                                pick.awayTeam
                              }

                              <span className="mx-2 text-yellow-400">
                                VS
                              </span>

                              {
                                pick.homeTeam
                              }
                            </p>

                            <p className="mt-2 text-xs font-bold text-zinc-500">
                              比賽時間：
                              {
                                formatGameTime(
                                  pick.gameTime,
                                )
                              }
                            </p>

                            <p className="mt-3 break-words text-lg font-black text-yellow-400">
                              {
                                pick.prediction
                              }
                            </p>

                          </div>

                          <div className="shrink-0 text-right">

                            <p className="text-xs text-zinc-500">
                              AI 信心
                            </p>

                            <p className="mt-1 text-2xl font-black text-white">
                              {
                                pick.confidence
                              }
                              %
                            </p>

                          </div>

                        </div>

                      </div>
                    ),
                  )}

              </div>

            </section>
          </>
        )}

      </div>

    </main>
  );
}

/* ==========================================
   PARLAY CARD
========================================== */

function ParlayCard({
  parlay,
}: {
  parlay:
    ParlayGroup;
}) {
  const hasEnoughPicks =
    parlay.picks.length ===
    parlay.legs;

  return (
    <div className="overflow-hidden rounded-3xl border border-yellow-500/20 bg-zinc-900">

      <div className="border-b border-zinc-800 bg-gradient-to-r from-yellow-400/10 to-transparent p-5">

        <div className="flex items-center justify-between gap-3">

          <div>

            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              XSI PARLAY
            </p>

            <h2 className="mt-2 text-xl font-black">
              {
                parlay.level
              }
            </h2>

          </div>

          <span className="rounded-full border border-yellow-500/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-400">
            {
              parlay.legs
            } 串 1
          </span>

        </div>

      </div>

      <div className="p-5">

        {/* =========================
            平均信心
        ========================= */}
        <div>

          <div className="flex items-center justify-between text-sm">

            <span className="text-zinc-500">
              平均 AI 信心
            </span>

            <span className="font-black text-white">
              {
                parlay.averageConfidence
              }
              %
            </span>

          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">

            <div
              className="h-full rounded-full bg-yellow-400"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    parlay.averageConfidence,
                  ),
                )}%`,
              }}
            />

          </div>

        </div>

        {/* =========================
            風險
        ========================= */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">

          <span className="text-sm text-zinc-500">
            組合風險
          </span>

          <span className="text-sm font-black text-yellow-400">
            {
              parlay.risk
            }
          </span>

        </div>

        <p className="mt-4 text-sm leading-6 text-zinc-400">
          {
            parlay.description
          }
        </p>

        {/* =========================
            PICKS
        ========================= */}
        <div className="mt-5 space-y-3">

          {parlay.picks.map(
            (
              pick,
              index,
            ) => (
              <div
                key={
                  `${pick.sport}-${pick.gamePk}`
                }
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              >

                <div className="flex items-center justify-between gap-3">

                  <div className="flex items-center gap-2">

                    <span className="text-xs font-black text-zinc-500">
                      PICK {
                        index +
                        1
                      }
                    </span>

                    <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                      {
                        getSportLabel(
                          pick.sport,
                        )
                      }
                    </span>

                  </div>

                  <span className="text-xs font-black text-white">
                    {
                      pick.confidence
                    }
                    %
                  </span>

                </div>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {
                    pick.awayTeam
                  }

                  {" VS "}

                  {
                    pick.homeTeam
                  }
                </p>

                <p className="mt-2 text-[11px] font-bold text-zinc-600">
                  比賽時間：
                  {
                    formatGameTime(
                      pick.gameTime,
                    )
                  }
                </p>

                <p className="mt-2 break-words text-sm font-black text-yellow-400">
                  {
                    pick.prediction
                  }
                </p>

              </div>
            ),
          )}

          {!hasEnoughPicks && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">

              <p className="text-xs font-bold text-zinc-500">
                目前有效預測不足 {
                  parlay.legs
                } 場
              </p>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}