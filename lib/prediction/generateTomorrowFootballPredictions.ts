import {
  getCachedFootballSchedule,
} from "../services/footballSchedule";

import {
  calculateFootballGameAnalysis,
} from "../xsi/footballGameAnalysis";

import {
  createAdminClient,
} from "../supabase/admin";

import {
  calculateFootballTotalsPrediction,
  type FootballHistoryMatch,
} from "../football/totals-model";

/* ==========================================
   Types
========================================== */

type GenerateOptions = {
  force?: boolean;
};

type PredictionMode =
  | "XSI"
  | "MARKET";

type BatchFootballPredictionResult = {
  scheduleCount: number;

  existing: number;

  missing: number;

  analyzed: number;

  inserted: number;

  updated: number;

  failed: number;

  totalsQualified: number;

  totalsPassed: number;

  historyCount: number;

  xsiModeCount: number;

  marketModeCount: number;

  force: boolean;

  errors: Array<{
    gameId: string;

    message: string;
  }>;
};

type ExistingPrediction = {
  game_pk:
    | string
    | number;
};

type UnknownRecord =
  Record<
    string,
    unknown
  >;

type FootballHistoryRow =
  FootballHistoryMatch & {
    league: string;
  };

type MarketProbability = {
  home: number;
  draw: number;
  away: number;
};

type MarketRecommendation = {
  text: string;
  confidence: number;
};

/* ==========================================
   五大聯賽正式預測模式

   回測結果：
   英超 → MARKET
   西甲 → MARKET
   義甲 → MARKET
   德甲 → XSI
   法甲 → MARKET

   歐冠 / 歐霸尚未完成同等回測，
   暫時保留原本 XSI 流程。
========================================== */

const LEAGUE_PREDICTION_MODE:
  Record<
    string,
    PredictionMode
  > = {
  英超:
    "MARKET",

  西甲:
    "MARKET",

  義甲:
    "MARKET",

  德甲:
    "XSI",

  法甲:
    "MARKET",

  歐冠:
    "XSI",

  歐霸:
    "XSI",
};

const HISTORY_LEAGUES = [
  "英超",
  "西甲",
  "義甲",
  "德甲",
  "法甲",
];

/* ==========================================
   Helpers
========================================== */

function getErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  try {
    return JSON.stringify(
      error,
    );
  } catch {
    return String(
      error,
    );
  }
}

function parsePossibleDate(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string" &&
    !(value instanceof Date)
  ) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(
          value,
        );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  return parsed;
}

function getGameKickoff(
  game:
    unknown,
) {
  if (
    typeof game !==
      "object" ||
    game ===
      null
  ) {
    return null;
  }

  const row =
    game as UnknownRecord;

  const candidates = [
    row.commenceTime,
    row.commence_time,
    row.startTime,
    row.start_time,
    row.kickoff,
    row.kickoffTime,
    row.kickoff_time,
    row.matchDate,
    row.match_date,
    row.gameDate,
    row.game_date,
    row.date,
  ];

  for (
    const candidate
    of candidates
  ) {
    const parsed =
      parsePossibleDate(
        candidate,
      );

    if (
      parsed
    ) {
      return parsed;
    }
  }

  return null;
}

function getPredictionMode(
  leagueShortName:
    string,
): PredictionMode {
  return (
    LEAGUE_PREDICTION_MODE[
      leagueShortName
    ] ??
    "XSI"
  );
}

/* ==========================================
   Market Odds → 去水後 1X2 機率
========================================== */

function impliedProbability(
  odds:
    number | null,
) {
  if (
    odds === null ||
    !Number.isFinite(
      odds,
    ) ||
    odds <= 1
  ) {
    return 0;
  }

  return 1 / odds;
}

function getMarketProbability({
  homeOdds,
  drawOdds,
  awayOdds,
}: {
  homeOdds:
    number | null;

  drawOdds:
    number | null;

  awayOdds:
    number | null;
}): MarketProbability {
  const home =
    impliedProbability(
      homeOdds,
    );

  const draw =
    impliedProbability(
      drawOdds,
    );

  const away =
    impliedProbability(
      awayOdds,
    );

  const total =
    home +
    draw +
    away;

  if (
    total <= 0
  ) {
    return {
      home:
        33.3,

      draw:
        33.4,

      away:
        33.3,
    };
  }

  return {
    home:
      Number(
        (
          home /
          total *
          100
        ).toFixed(
          1,
        ),
      ),

    draw:
      Number(
        (
          draw /
          total *
          100
        ).toFixed(
          1,
        ),
      ),

    away:
      Number(
        (
          away /
          total *
          100
        ).toFixed(
          1,
        ),
      ),
  };
}

function buildMarketRecommendation({
  homeTeam,
  awayTeam,
  homeOdds,
  drawOdds,
  awayOdds,
}: {
  homeTeam:
    string;

  awayTeam:
    string;

  homeOdds:
    number | null;

  drawOdds:
    number | null;

  awayOdds:
    number | null;
}): MarketRecommendation {
  const probability =
    getMarketProbability({
      homeOdds,
      drawOdds,
      awayOdds,
    });

  const candidates = [
    {
      side:
        "home" as const,

      probability:
        probability.home,

      text:
        `${homeTeam} 主勝`,
    },

    {
      side:
        "draw" as const,

      probability:
        probability.draw,

      text:
        "和局",
    },

    {
      side:
        "away" as const,

      probability:
        probability.away,

      text:
        `${awayTeam} 客勝`,
    },
  ].sort(
    (
      a,
      b,
    ) =>
      b.probability -
      a.probability,
  );

  const best =
    candidates[0];

  return {
    text:
      best.text,

    confidence:
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            best.probability,
          ),
        ),
      ),
  };
}

/* ==========================================
   Load All Five-League Football History

   不再只讀西甲。

   Supabase 常見單次最多回 1000 rows，
   所以這裡用 range() 分頁讀取。
========================================== */

async function loadAllFootballHistory(
  supabase:
    ReturnType<
      typeof createAdminClient
    >,
) {
  const PAGE_SIZE =
    500;

  let from =
    0;

  const history:
    FootballHistoryRow[] =
    [];

  while (
    true
  ) {
    const to =
      from +
      PAGE_SIZE -
      1;

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "football_match_history",
        )
        .select(
          [
            "league",
            "match_date",
            "home_team",
            "away_team",
            "home_score",
            "away_score",
          ].join(
            ",",
          ),
        )
        .in(
          "league",
          HISTORY_LEAGUES,
        )
        .eq(
          "status",
          "finished",
        )
        .order(
          "match_date",
          {
            ascending:
              true,
          },
        )
        .range(
          from,
          to,
        );

    if (
      error
    ) {
      throw new Error(
        `讀取足球歷史資料失敗：${error.message}`,
      );
    }

    const rows =
      (
        data ??
        []
      ) as unknown as FootballHistoryRow[];

    history.push(
      ...rows,
    );

    if (
      rows.length <
      PAGE_SIZE
    ) {
      break;
    }

    from +=
      PAGE_SIZE;
  }

  return history;
}

function groupHistoryByLeague(
  history:
    FootballHistoryRow[],
) {
  const map =
    new Map<
      string,
      FootballHistoryMatch[]
    >();

  for (
    const row
    of history
  ) {
    const league =
      String(
        row.league ??
          "",
      ).trim();

    if (
      !league
    ) {
      continue;
    }

    const existing =
      map.get(
        league,
      ) ??
      [];

    existing.push({
      match_date:
        row.match_date,

      home_team:
        row.home_team,

      away_team:
        row.away_team,

      home_score:
        row.home_score,

      away_score:
        row.away_score,
    });

    map.set(
      league,
      existing,
    );
  }

  return map;
}

/* ==========================================
   Generate Tomorrow Football Predictions
========================================== */

export async function generateTomorrowFootballPredictions(
  options:
    GenerateOptions =
      {},
): Promise<BatchFootballPredictionResult> {
  const force =
    options.force ===
    true;

  const summary:
    BatchFootballPredictionResult = {
    scheduleCount:
      0,

    existing:
      0,

    missing:
      0,

    analyzed:
      0,

    inserted:
      0,

    updated:
      0,

    failed:
      0,

    totalsQualified:
      0,

    totalsPassed:
      0,

    historyCount:
      0,

    xsiModeCount:
      0,

    marketModeCount:
      0,

    force,

    errors:
      [],
  };

  /* ==========================================
     STEP 1
     football_schedule
     未來 14 天
  ========================================== */

  const games =
    await getCachedFootballSchedule(
      14,
    );

  summary.scheduleCount =
    games.length;

  console.log(
    `⚽ football_schedule 取得 ${games.length} 場`,
  );

  if (
    games.length ===
    0
  ) {
    console.log(
      "⚠️ football_schedule 目前沒有可分析的足球賽事。",
    );

    return summary;
  }

  const supabase =
    createAdminClient();

  /* ==========================================
     STEP 2
     Load Five-League History
  ========================================== */

  console.log(
    "📚 載入五大聯賽 football_match_history...",
  );

  const footballHistory =
    await loadAllFootballHistory(
      supabase,
    );

  const footballHistoryByLeague =
    groupHistoryByLeague(
      footballHistory,
    );

  summary.historyCount =
    footballHistory.length;

  console.log(
    `📚 football_match_history：${footballHistory.length} 場`,
  );

  for (
    const [
      league,
      history,
    ]
    of footballHistoryByLeague
  ) {
    console.log(
      `📚 ${league}：${history.length} 場`,
    );
  }

  /* ==========================================
     STEP 3
     Get Event IDs
  ========================================== */

  const gameIds =
    games.map(
      (
        game,
      ) =>
        String(
          game.id,
        ),
    );

  /* ==========================================
     STEP 4
     Existing Predictions
  ========================================== */

  const {
    data:
      existingData,

    error:
      existingError,
  } =
    await supabase
      .from(
        "prediction_history",
      )
      .select(
        "game_pk",
      )
      .in(
        "game_pk",
        gameIds,
      );

  if (
    existingError
  ) {
    throw new Error(
      `讀取既有足球預測失敗：${existingError.message}`,
    );
  }

  const existingRows =
    (
      existingData ??
      []
    ) as ExistingPrediction[];

  const existingGameIds =
    new Set(
      existingRows.map(
        (
          row,
        ) =>
          String(
            row.game_pk,
          ),
      ),
    );

  summary.existing =
    existingGameIds.size;

  console.log(
    `⚽ 足球 AI 預測：${summary.existing}/${summary.scheduleCount} 已存在`,
  );

  /* ==========================================
     STEP 5
     Determine Targets

     force=false
     → 只跑 missing

     force=true
     → 全部重算
  ========================================== */

  const targetGames =
    force
      ? games
      : games.filter(
          (
            game,
          ) =>
            !existingGameIds.has(
              String(
                game.id,
              ),
            ),
        );

  summary.missing =
    targetGames.length;

  if (
    force
  ) {
    console.log(
      `🔄 FORCE MODE：重新分析 ${targetGames.length} 場`,
    );
  } else {
    console.log(
      `🆕 Missing Predictions：${targetGames.length} 場`,
    );
  }

  if (
    targetGames.length ===
    0
  ) {
    console.log(
      "✅ football_schedule 內所有足球賽事皆已有 AI 預測。",
    );

    return summary;
  }

  /* ==========================================
     STEP 6
     Analyze Each Game
  ========================================== */

  for (
    const game
    of targetGames
  ) {
    const gameId =
      String(
        game.id,
      );

    try {
      console.log(
        "--------------------------------------",
      );

      const gameLeague =
        String(
          game.leagueShortName ??
            "",
        ).trim();

      const predictionMode =
        getPredictionMode(
          gameLeague,
        );

      console.log(
        `⚽ 開始分析 ${gameId}：${game.awayTeam} VS ${game.homeTeam}`,
      );

      console.log(
        `🏆 聯賽：${gameLeague || "未知"}｜正式模式：${predictionMode}`,
      );

      /* ======================================
         Original XSI Analysis

         即使正式模式是 MARKET，
         仍保留完整 XSI 分析資料，
         供頁面分析與德甲 XSI 使用。
      ====================================== */

      const analysis =
        await calculateFootballGameAnalysis(
          game,
        );

      summary.analyzed +=
        1;

      const xsiRecommendation =
        String(
          analysis.recommendation
            ?.text ??
            "",
        ).trim();

      const xsiConfidenceRaw =
        Number(
          analysis.recommendation
            ?.confidence ??
            0,
        );

      const xsiConfidence =
        Number.isFinite(
          xsiConfidenceRaw,
        )
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  xsiConfidenceRaw,
                ),
              ),
            )
          : 0;

      if (
        !xsiRecommendation
      ) {
        throw new Error(
          "足球分析沒有產生推薦",
        );
      }

      /* ======================================
         STEP 7
         League Strategy

         MARKET：
         用 1X2 Odds 去水後市場機率決定推薦。

         XSI：
         使用原 calculateFootballGameAnalysis 推薦。
      ====================================== */

      const marketRecommendation =
        buildMarketRecommendation({
          homeTeam:
            game.homeTeam,

          awayTeam:
            game.awayTeam,

          homeOdds:
            analysis.market
              .homeWinOdds,

          drawOdds:
            analysis.market
              .drawOdds,

          awayOdds:
            analysis.market
              .awayWinOdds,
        });

      let recommendation =
        xsiRecommendation;

      let confidence =
        xsiConfidence;

      if (
        predictionMode ===
        "MARKET"
      ) {
        recommendation =
          marketRecommendation.text;

        confidence =
          marketRecommendation.confidence;

        summary.marketModeCount +=
          1;
      } else {
        summary.xsiModeCount +=
          1;
      }

      console.log(
        `🤖 XSI Recommendation：${xsiRecommendation} (${xsiConfidence})`,
      );

      console.log(
        `📈 Market Recommendation：${marketRecommendation.text} (${marketRecommendation.confidence})`,
      );

      console.log(
        `✅ Official Recommendation：${recommendation}｜Mode ${predictionMode}`,
      );

      /* ======================================
         STEP 8
         Totals Production Model

         每場只能使用「自己的聯賽歷史」，
         不再全部拿西甲歷史計算。

         OVER >= 65%
         UNDER >= 56%
      ====================================== */

      const kickoff =
        getGameKickoff(
          game,
        );

      let totalsText =
        "";

      let totalsConfidence:
        number | null =
        null;

      if (
        kickoff
      ) {
        const leagueHistory =
          footballHistoryByLeague.get(
            gameLeague,
          ) ??
          [];

        if (
          leagueHistory.length ===
          0
        ) {
          summary.totalsPassed +=
            1;

          console.log(
            `⏭️ Totals：PASS｜${gameLeague || "未知聯賽"} 沒有歷史資料`,
          );
        } else {
          const totals =
            calculateFootballTotalsPrediction({
              homeTeam:
                game.homeTeam,

              awayTeam:
                game.awayTeam,

              kickoff,

              history:
                leagueHistory,
            });

          if (
            totals.qualified
          ) {
            totalsText =
              totals.recommendation;

            totalsConfidence =
              Number.isFinite(
                totals.confidence,
              )
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        totals.confidence,
                      ),
                    ),
                  )
                : null;

            summary.totalsQualified +=
              1;

            console.log(
              `📊 Totals：${totals.recommendation}`,
            );

            console.log(
              `🎯 Totals Confidence：${totals.confidence}%`,
            );

            console.log(
              `⚽ Expected Goals：${totals.expectedHomeGoals} - ${totals.expectedAwayGoals}`,
            );

            console.log(
              `📈 Expected Total：${totals.expectedTotal}`,
            );

            console.log(
              `🔺 OVER：${Math.round(
                totals.overProbability *
                  1000,
              ) /
                10}%`,
            );

            console.log(
              `🔻 UNDER：${Math.round(
                totals.underProbability *
                  1000,
              ) /
                10}%`,
            );
          } else {
            summary.totalsPassed +=
              1;

            console.log(
              "⏭️ Totals：PASS",
            );

            console.log(
              `📈 Expected Total：${totals.expectedTotal}`,
            );
          }
        }
      } else {
        summary.totalsPassed +=
          1;

        console.warn(
          `⚠️ ${gameId} 找不到 kickoff，Totals PASS`,
        );
      }

      console.log(
        `⚽ Totals Recommendation：${totalsText || "PASS"}`,
      );

      /* ======================================
         STEP 9
         Write Prediction History

         force=true + existing
         → UPDATE

         otherwise
         → INSERT
      ====================================== */

      const alreadyExists =
        existingGameIds.has(
          gameId,
        );

      if (
        force &&
        alreadyExists
      ) {
        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "prediction_history",
            )
            .update({
              sport:
                "FOOTBALL",

              home_team:
                game.homeTeam,

              away_team:
                game.awayTeam,

              prediction:
                recommendation,

              confidence,

              totals_prediction:
                totalsText ||
                null,

              totals_confidence:
                totalsConfidence,
            })
            .eq(
              "game_pk",
              gameId,
            );

        if (
          updateError
        ) {
          throw updateError;
        }

        summary.updated +=
          1;

        console.log(
          `♻️ 足球 ${gameId} 更新成功：${recommendation}｜Mode ${predictionMode}｜Totals ${totalsText || "PASS"}`,
        );

        continue;
      }

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "prediction_history",
          )
          .insert({
            game_pk:
              gameId,

            sport:
              "FOOTBALL",

            home_team:
              game.homeTeam,

            away_team:
              game.awayTeam,

            prediction:
              recommendation,

            confidence,

            totals_prediction:
              totalsText ||
              null,

            totals_confidence:
              totalsConfidence,

            result:
              "pending",
          });

      if (
        insertError
      ) {
        /* ==================================
           Concurrent Duplicate Protection
        ================================== */

        if (
          insertError.code ===
          "23505"
        ) {
          console.log(
            `ℹ️ 足球 ${gameId} 已存在，略過。`,
          );

          summary.existing +=
            1;

          continue;
        }

        throw insertError;
      }

      summary.inserted +=
        1;

      console.log(
        `✅ 足球 ${gameId} 新增成功：${recommendation}｜Mode ${predictionMode}｜Confidence ${confidence}｜Totals ${totalsText || "PASS"} ${totalsConfidence ?? ""}`,
      );
    } catch (
      error
    ) {
      summary.failed +=
        1;

      const message =
        getErrorMessage(
          error,
        );

      summary.errors.push({
        gameId,

        message,
      });

      console.error(
        `❌ 足球 ${gameId} 預測失敗：`,
        error,
      );
    }
  }

  /* ==========================================
     STEP 10
     Complete
  ========================================== */

  console.log(
    "======================================",
  );

  console.log(
    "🏁 足球 AI 批次預測完成",
  );

  console.log(
    `🔄 Force：${force}`,
  );

  console.log(
    `football_schedule：${summary.scheduleCount}`,
  );

  console.log(
    `football_match_history：${summary.historyCount}`,
  );

  console.log(
    `原本已有預測：${summary.existing}`,
  );

  console.log(
    `本次處理：${summary.missing}`,
  );

  console.log(
    `完成分析：${summary.analyzed}`,
  );

  console.log(
    `成功新增：${summary.inserted}`,
  );

  console.log(
    `成功更新：${summary.updated}`,
  );

  console.log(
    `📈 MARKET Mode：${summary.marketModeCount}`,
  );

  console.log(
    `🤖 XSI Mode：${summary.xsiModeCount}`,
  );

  console.log(
    `📊 Totals 出手：${summary.totalsQualified}`,
  );

  console.log(
    `⏭️ Totals PASS：${summary.totalsPassed}`,
  );

  console.log(
    `失敗：${summary.failed}`,
  );

  console.log(
    "======================================",
  );

  return summary;
}