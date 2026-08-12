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

/* ==========================================
   Load All Football History

   Supabase 常見單次最多回 1000 rows，
   所以這裡用 range() 分頁讀取。

   會讀到：
   2023/24
   2024/25
   2025/26
   ...
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
    FootballHistoryMatch[] =
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
            "match_date",
            "home_team",
            "away_team",
            "home_score",
            "away_score",
          ].join(
            ",",
          ),
        )
        .eq(
          "league",
          "西甲",
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
      ) as unknown as FootballHistoryMatch[];

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
     Load Full History
  ========================================== */

  console.log(
    "📚 載入 football_match_history...",
  );

  const footballHistory =
    await loadAllFootballHistory(
      supabase,
    );

  summary.historyCount =
    footballHistory.length;

  console.log(
    `📚 football_match_history：${footballHistory.length} 場`,
  );

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

      console.log(
        `⚽ 開始 XSI 分析 ${gameId}：${game.awayTeam} VS ${game.homeTeam}`,
      );

      /* ======================================
         Original XSI Model
      ====================================== */

      const analysis =
        await calculateFootballGameAnalysis(
          game,
        );

      summary.analyzed +=
        1;

      const baseRecommendation =
        String(
          analysis.recommendation
            ?.text ??
            "",
        ).trim();

      const confidenceRaw =
        Number(
          analysis.recommendation
            ?.confidence ??
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

      if (
        !baseRecommendation
      ) {
        throw new Error(
          "足球分析沒有產生推薦",
        );
      }

      /* ======================================
         STEP 7
         Totals Production Model

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
        const totals =
          calculateFootballTotalsPrediction({
            homeTeam:
              game.homeTeam,

            awayTeam:
              game.awayTeam,

            kickoff,

            history:
              footballHistory,
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
      } else {
        summary.totalsPassed +=
          1;

        console.warn(
          `⚠️ ${gameId} 找不到 kickoff，Totals PASS`,
        );
      }

      /* ======================================
         STEP 8
         Final Recommendation
      ====================================== */

      const recommendation =
        baseRecommendation;

      console.log(
        `🤖 XSI Recommendation：${recommendation}`,
      );

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

              result:
                "pending",
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
          `♻️ 足球 ${gameId} 更新成功：${recommendation}｜Totals ${totalsText || "PASS"}`,
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
        `✅ 足球 ${gameId} 新增成功：${recommendation}｜XSI ${confidence}｜Totals ${totalsText || "PASS"} ${totalsConfidence ?? ""}`,
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