import {
  getCurrentMlbSchedule,
} from "../api/mlb";

import {
  calculateMlbGameAnalysis,
} from "../xsi/mlbGameAnalysis";

import {
  createAdminClient,
} from "../supabase/admin";

type GenerateTomorrowMlbResult = {
  scheduleCount: number;
  existing: number;
  missing: number;
  analyzed: number;
  inserted: number;
  failed: number;

  errors: Array<{
    gamePk: number;
    message: string;
  }>;
};

type ExistingPrediction = {
  game_pk: string | number;
};

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error
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

/*
 * ==========================================
 * 建立最後要寫進 prediction_history 的文字
 *
 * 範例：
 *
 * Dodgers 獨贏
 * Yankees 讓分 -1.5
 * Cubs 受讓 +1.5
 * ==========================================
 */
function buildPredictionText(
  analysis: Awaited<
    ReturnType<
      typeof calculateMlbGameAnalysis
    >
  >,
) {
  const teamName =
    analysis.selectedTeamName;

  const recommendation =
    analysis.betAdvisor
      .recommendation;

  /*
   * ==========================================
   * 獨贏
   * ==========================================
   */
  if (
    recommendation ===
    "獨贏"
  ) {
    return `${teamName} 獨贏`;
  }

  /*
   * ==========================================
   * 受讓
   * ==========================================
   */
  if (
    recommendation.includes(
      "受讓",
    )
  ) {
    return `${teamName} 受讓 +1.5`;
  }

  /*
   * ==========================================
   * 讓分
   *
   * MLB 統一使用 -1.5
   * ==========================================
   */
  if (
    recommendation ===
    "讓分"
  ) {
    return `${teamName} 讓分 -1.5`;
  }

  /*
   * 理論上不會走到這裡
   */
  return `${teamName} 獨贏`;
}

export async function generateTomorrowMlbPredictions(): Promise<GenerateTomorrowMlbResult> {
  const summary: GenerateTomorrowMlbResult = {
    scheduleCount: 0,
    existing: 0,
    missing: 0,
    analyzed: 0,
    inserted: 0,
    failed: 0,
    errors: [],
  };

  /*
   * ==========================================
   * 1. 取得目前 MLB 顯示日賽程
   *
   * 你的 mlb.ts 已經設定：
   * 台灣時間下午 3 點後切換隔日。
   * ==========================================
   */
  const games =
    await getCurrentMlbSchedule();

  summary.scheduleCount =
    games.length;

  console.log(
    `⚾ MLB 目前賽程：${games.length} 場`,
  );

  if (
    games.length === 0
  ) {
    return summary;
  }

  const supabase =
    createAdminClient();

  /*
   * ==========================================
   * 2. 取得所有 Game PK
   * ==========================================
   */
  const gamePks =
    games.map(
      (game) =>
        String(
          game.gamePk,
        ),
    );

  /*
   * ==========================================
   * 3. 一次查詢資料庫
   *
   * 不逐場 query，減少 Supabase 請求。
   * ==========================================
   */
  const {
    data:
      existingData,
    error:
      existingError,
  } = await supabase
    .from(
      "prediction_history",
    )
    .select(
      "game_pk",
    )
    .eq(
      "sport",
      "MLB",
    )
    .in(
      "game_pk",
      gamePks,
    );

  if (
    existingError
  ) {
    throw new Error(
      `讀取既有 MLB 預測失敗：${existingError.message}`,
    );
  }

  const existingRows =
    (existingData ??
      []) as ExistingPrediction[];

  const existingGamePks =
    new Set(
      existingRows.map(
        (row) =>
          String(
            row.game_pk,
          ),
      ),
    );

  summary.existing =
    existingGamePks.size;

  /*
   * ==========================================
   * 4. 找出真正缺少的比賽
   * ==========================================
   */
  const missingGames =
    games.filter(
      (game) =>
        !existingGamePks.has(
          String(
            game.gamePk,
          ),
        ),
    );

  summary.missing =
    missingGames.length;

  console.log(
    `⚾ MLB 預測：${summary.existing}/${summary.scheduleCount} 已存在`,
  );

  /*
   * ==========================================
   * 5. 全部存在就直接結束
   *
   * 這就是你之前：
   *
   * scheduleCount 15
   * existing 15
   * missing 0
   *
   * 的情況。
   * ==========================================
   */
  if (
    missingGames.length ===
    0
  ) {
    console.log(
      "✅ MLB 本日預測全部已存在，不重新分析。",
    );

    return summary;
  }

  /*
   * ==========================================
   * 6. 只分析缺少的比賽
   * ==========================================
   */
  for (
    const game
    of missingGames
  ) {
    const gamePk =
      Number(
        game.gamePk,
      );

    try {
      console.log(
        `⚾ 開始分析 ${gamePk}：${game.teams.away.team.name} VS ${game.teams.home.team.name}`,
      );

      const analysis =
        await calculateMlbGameAnalysis(
          game,
        );

      summary.analyzed += 1;

      /*
       * ======================================
       * 7. 建立推薦
       * ======================================
       */
      const prediction =
        buildPredictionText(
          analysis,
        );

      const confidence =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(
              Number(
                analysis.betAdvisor
                  .confidence ??
                  0,
              ),
            ),
          ),
        );

      /*
       * ======================================
       * 8. 寫入 prediction_history
       * ======================================
       */
      const {
        error:
          insertError,
      } = await supabase
        .from(
          "prediction_history",
        )
        .insert({
          game_pk:
            String(
              gamePk,
            ),

          sport:
            "MLB",

          home_team:
            analysis.homeTeamName,

          away_team:
            analysis.awayTeamName,

          prediction,

          confidence,

          result:
            "pending",
        });

      if (
        insertError
      ) {
        /*
         * ====================================
         * 防止 unique game_pk race condition
         *
         * 如果另一個請求剛好先新增，
         * P23505 不視為真正失敗。
         * ====================================
         */
        if (
          insertError.code ===
          "23505"
        ) {
          console.log(
            `ℹ️ MLB ${gamePk} 已由其他請求建立，略過。`,
          );

          summary.existing += 1;

          continue;
        }

        throw insertError;
      }

      summary.inserted += 1;

      console.log(
        `✅ MLB ${gamePk} 新增成功：${prediction}｜信心 ${confidence}`,
      );
    } catch (error) {
      summary.failed += 1;

      const message =
        getErrorMessage(
          error,
        );

      summary.errors.push({
        gamePk,
        message,
      });

      console.error(
        `❌ MLB ${gamePk} 預測失敗：`,
        error,
      );
    }
  }

  /*
   * ==========================================
   * 9. 完成
   * ==========================================
   */
  console.log(
    "======================================",
  );

  console.log(
    "🏁 MLB 批次預測完成",
  );

  console.log(
    `賽程：${summary.scheduleCount}`,
  );

  console.log(
    `原本已有：${summary.existing}`,
  );

  console.log(
    `原本缺少：${summary.missing}`,
  );

  console.log(
    `完成分析：${summary.analyzed}`,
  );

  console.log(
    `成功新增：${summary.inserted}`,
  );

  console.log(
    `失敗：${summary.failed}`,
  );

  console.log(
    "======================================",
  );

  return summary;
}