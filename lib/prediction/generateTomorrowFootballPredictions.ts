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

type TotalsPassDiagnostics = {
  missingKickoff: number;
  missingLeagueHistory: number;
  insufficientHistory: number;
  insufficientHomeSamples: number;
  insufficientAwaySamples: number;
  insufficientLeagueSamples: number;
  probabilityBelowThreshold: number;
  other: number;
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

  totalsPassDiagnostics:
    TotalsPassDiagnostics;

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

type FootballHistoryRow =
  FootballHistoryMatch & {
    league: string;
  };

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

    totalsPassDiagnostics: {
      missingKickoff: 0,
      missingLeagueHistory: 0,
      insufficientHistory: 0,
      insufficientHomeSamples: 0,
      insufficientAwaySamples: 0,
      insufficientLeagueSamples: 0,
      probabilityBelowThreshold: 0,
      other: 0,
    },

    historyCount:
      0,

    force,

    errors:
      [],
  };

  /*
   * Totals Missing Team Summary
   * key = team name
   * value = 最低樣本數 + 出現次數
   */
  const missingHomeTeams =
    new Map<
      string,
      {
        samples: number;
        occurrences: number;
      }
    >();

  const missingAwayTeams =
    new Map<
      string,
      {
        samples: number;
        occurrences: number;
      }
    >();

  function recordMissingTeam(
    map:
      Map<
        string,
        {
          samples: number;
          occurrences: number;
        }
      >,
    team:
      string,
    samples:
      number,
  ) {
    const current =
      map.get(
        team,
      );

    if (
      current
    ) {
      map.set(
        team,
        {
          samples:
            Math.min(
              current.samples,
              samples,
            ),

          occurrences:
            current.occurrences +
            1,
        },
      );

      return;
    }

    map.set(
      team,
      {
        samples,
        occurrences:
          1,
      },
    );
  }

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

  const footballHistoryByLeague =
    groupHistoryByLeague(
      footballHistory,
    );

  console.log(
    "📚 History by League：",
    Object.fromEntries(
      Array.from(
        footballHistoryByLeague.entries(),
      ).map(
        (
          [
            league,
            rows,
          ],
        ) => [
          league,
          rows.length,
        ],
      ),
    ),
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
        const gameLeague =
          String(
            game.leagueShortName ??
            "",
          ).trim();

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

          summary
            .totalsPassDiagnostics
            .missingLeagueHistory +=
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

              /*
               * History V2
               *
               * teamHistory：
               * 使用所有已同步歷史資料，
               * 讓球隊可跨賽事累積主 / 客場樣本。
               *
               * leagueHistory：
               * 只使用目前聯賽，
               * 保留該聯賽自己的平均進球基準。
               *
               * history：
               * 保留舊參數相容性。
               */
              history:
                leagueHistory,

              teamHistory:
                footballHistory,

              leagueHistory:
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

          const hasInsufficientHistory =
            totals.reasons.some(
              (reason) =>
                reason.includes(
                  "歷史樣本不足",
                ),
            );

          if (
            hasInsufficientHistory
          ) {
            summary
              .totalsPassDiagnostics
              .insufficientHistory +=
              1;

            if (
              totals.sample.homeMatches <
              4
            ) {
              recordMissingTeam(
                missingHomeTeams,
                game.homeTeam,
                totals.sample.homeMatches,
              );
            }

            if (
              totals.sample.awayMatches <
              4
            ) {
              recordMissingTeam(
                missingAwayTeams,
                game.awayTeam,
                totals.sample.awayMatches,
              );
            }

            if (
              totals.sample.homeMatches <
              4
            ) {
              summary
                .totalsPassDiagnostics
                .insufficientHomeSamples +=
                1;
            }

            if (
              totals.sample.awayMatches <
              4
            ) {
              summary
                .totalsPassDiagnostics
                .insufficientAwaySamples +=
                1;
            }

            if (
              totals.sample.leagueMatches <
              20
            ) {
              summary
                .totalsPassDiagnostics
                .insufficientLeagueSamples +=
                1;
            }
          } else if (
            totals.reasons.some(
              (reason) =>
                reason.includes(
                  "大小球訊號未達出手門檻",
                ),
            )
          ) {
            summary
              .totalsPassDiagnostics
              .probabilityBelowThreshold +=
              1;
          } else {
            summary
              .totalsPassDiagnostics
              .other +=
              1;
          }

          console.log(
            "⏭️ Totals：PASS",
          );

          console.log(
            `📈 Expected Total：${totals.expectedTotal}`,
          );

          console.log(
            `🧪 PASS Reasons：${totals.reasons.join(
              "｜",
            )}`,
          );

          if (
            hasInsufficientHistory
          ) {
            console.log(
              "🔎 TOTALS TEAM NAME DIAGNOSTIC",
            );

            console.log(
              `🏠 主隊：${totals.nameDiagnostics.home.requestedName}`,
            );

            console.log(
              `   主場樣本：${totals.sample.homeMatches}`,
            );

            console.log(
              `   正規化：${totals.nameDiagnostics.home.normalizedRequestedName}`,
            );

            console.log(
              `   可能歷史名稱：${
                totals.nameDiagnostics.home.candidateNames.length > 0
                  ? totals.nameDiagnostics.home.candidateNames.join("｜")
                  : "無"
              }`,
            );

            console.log(
              `✈️ 客隊：${totals.nameDiagnostics.away.requestedName}`,
            );

            console.log(
              `   客場樣本：${totals.sample.awayMatches}`,
            );

            console.log(
              `   正規化：${totals.nameDiagnostics.away.normalizedRequestedName}`,
            );

            console.log(
              `   可能歷史名稱：${
                totals.nameDiagnostics.away.candidateNames.length > 0
                  ? totals.nameDiagnostics.away.candidateNames.join("｜")
                  : "無"
              }`,
            );
          }
        }
        }
      } else {
        summary.totalsPassed +=
          1;

        summary
          .totalsPassDiagnostics
          .missingKickoff +=
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
    "======================================",
  );

  console.log(
    "🧪 TOTALS V6 PASS DIAGNOSTICS",
  );

  console.log(
    `找不到 kickoff：${summary.totalsPassDiagnostics.missingKickoff}`,
  );

  console.log(
    `聯賽沒有歷史資料：${summary.totalsPassDiagnostics.missingLeagueHistory}`,
  );

  console.log(
    `歷史樣本不足：${summary.totalsPassDiagnostics.insufficientHistory}`,
  );

  console.log(
    `├─ 主隊主場 < 4：${summary.totalsPassDiagnostics.insufficientHomeSamples}`,
  );

  console.log(
    `├─ 客隊客場 < 4：${summary.totalsPassDiagnostics.insufficientAwaySamples}`,
  );

  console.log(
    `└─ 聯盟歷史 < 20：${summary.totalsPassDiagnostics.insufficientLeagueSamples}`,
  );

  console.log(
    `機率未達門檻：${summary.totalsPassDiagnostics.probabilityBelowThreshold}`,
  );

  console.log(
    `其他：${summary.totalsPassDiagnostics.other}`,
  );

  console.log(
    "======================================",
  );

  console.log(
    `失敗：${summary.failed}`,
  );

  console.log(
    "======================================",
  );


  console.log(
    "======================================",
  );

  console.log(
    "⚠️ TOTALS MISSING TEAM SUMMARY",
  );

  console.log(
    "======================================",
  );

  const sortedMissingHomeTeams =
    Array.from(
      missingHomeTeams.entries(),
    ).sort(
      (
        a,
        b,
      ) =>
        a[1].samples -
          b[1].samples ||
        b[1].occurrences -
          a[1].occurrences ||
        a[0].localeCompare(
          b[0],
        ),
    );

  const sortedMissingAwayTeams =
    Array.from(
      missingAwayTeams.entries(),
    ).sort(
      (
        a,
        b,
      ) =>
        a[1].samples -
          b[1].samples ||
        b[1].occurrences -
          a[1].occurrences ||
        a[0].localeCompare(
          b[0],
        ),
    );

  console.log(
    `🏠 主隊不足：${sortedMissingHomeTeams.length} 隊`,
  );

  if (
    sortedMissingHomeTeams.length ===
    0
  ) {
    console.log(
      "  無",
    );
  } else {
    for (
      const [
        team,
        info,
      ] of sortedMissingHomeTeams
    ) {
      console.log(
        `  ${team}｜主場樣本 ${info.samples}｜出現 ${info.occurrences} 次`,
      );
    }
  }

  console.log(
    "--------------------------------------",
  );

  console.log(
    `✈️ 客隊不足：${sortedMissingAwayTeams.length} 隊`,
  );

  if (
    sortedMissingAwayTeams.length ===
    0
  ) {
    console.log(
      "  無",
    );
  } else {
    for (
      const [
        team,
        info,
      ] of sortedMissingAwayTeams
    ) {
      console.log(
        `  ${team}｜客場樣本 ${info.samples}｜出現 ${info.occurrences} 次`,
      );
    }
  }

  console.log(
    "======================================",
  );

  return summary;
}