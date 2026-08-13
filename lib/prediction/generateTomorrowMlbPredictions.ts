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
  updated: number;
  failed: number;

  errors: Array<{
    gamePk: number;
    message: string;
  }>;
};

type ExistingPrediction = {
  game_pk: string | number;
  home_team: string | null;
  away_team: string | null;
  prediction: string | null;
  confidence: number | string | null;
  result: string | null;
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
 * 建立完整推薦文字
 *
 * 最終格式：
 *
 * 球隊名稱 獨贏
 * 球隊名稱 讓分 -1.5
 * 球隊名稱 受讓 +1.5
 *
 * 球隊方向完全使用：
 * analysis.selectedTeamName
 *
 * 不再自己猜主隊 / 客隊。
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
    analysis.selectedTeamName
      ?.trim();

  const recommendation =
    analysis.betAdvisor
      .recommendation
      ?.trim() ?? "";

  if (!teamName) {
    throw new Error(
      "MLB 分析缺少 selectedTeamName",
    );
  }

  const lowerRecommendation =
    recommendation.toLowerCase();

  /*
   * ========================================
   * 受讓
   * ========================================
   */
  if (
    recommendation.includes(
      "受讓",
    ) ||
    lowerRecommendation.includes(
      "run line +",
    )
  ) {
    return `${teamName} 受讓 +1.5`;
  }

  /*
   * ========================================
   * 讓分
   * ========================================
   */
  if (
    recommendation ===
      "讓分" ||
    recommendation.includes(
      "讓分 -",
    ) ||
    lowerRecommendation.includes(
      "run line -",
    )
  ) {
    return `${teamName} 讓分 -1.5`;
  }

  /*
   * ========================================
   * 獨贏
   * ========================================
   */
  if (
    recommendation ===
      "獨贏" ||
    lowerRecommendation.includes(
      "moneyline",
    ) ||
    lowerRecommendation.includes(
      "money line",
    )
  ) {
    return `${teamName} 獨贏`;
  }

  /*
   * fallback
   */
  return `${teamName} ${
    recommendation ||
    "獨贏"
  }`;
}

export async function generateTomorrowMlbPredictions(): Promise<GenerateTomorrowMlbResult> {
  const summary: GenerateTomorrowMlbResult =
    {
      scheduleCount: 0,
      existing: 0,
      missing: 0,
      analyzed: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

  /*
   * ==========================================
   * 1. 取得目前 MLB 顯示日賽程
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
    games.length ===
    0
  ) {
    return summary;
  }

  const supabase =
    createAdminClient();

  /*
   * ==========================================
   * 2. Game PK
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
   * 3. 讀取目前 prediction_history
   *
   * 這次不再只檢查「有沒有球隊名稱」。
   *
   * 原因：
   * 舊版即使已經是：
   *
   * 某某隊 受讓 +1.5
   *
   * 也可能是舊模型方向產生的錯誤推薦。
   *
   * 所以目前顯示日的 MLB 賽事
   * 每次批次產生都重新分析，
   * 以新版 Win Probability →
   * selectedTeamName → Bet Advisor
   * 覆蓋 prediction / confidence。
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
      `
        game_pk,
        home_team,
        away_team,
        prediction,
        confidence,
        result
      `,
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

  const existingMap =
    new Map<
      string,
      ExistingPrediction
    >();

  for (
    const row
    of existingRows
  ) {
    existingMap.set(
      String(
        row.game_pk,
      ),
      row,
    );
  }

  summary.existing =
    existingMap.size;

  summary.missing =
    games.filter(
      (game) =>
        !existingMap.has(
          String(
            game.gamePk,
          ),
        ),
    ).length;

  console.log(
    "======================================",
  );

  console.log(
    `✅ MLB 已存在：${summary.existing}`,
  );

  console.log(
    `➕ MLB 尚未建立：${summary.missing}`,
  );

  console.log(
    `🧠 MLB 本輪重新分析：${games.length}`,
  );

  console.log(
    "======================================",
  );

  /*
   * ==========================================
   * 4. 每一場都重新分析
   *
   * 目的：
   * 保證 prediction_history 使用最新版：
   *
   * Win Probability
   * ↓
   * selectedTeamName
   * ↓
   * Bet Advisor
   * ↓
   * 完整 prediction
   * ==========================================
   */
  for (
    const game
    of games
  ) {
    const gamePk =
      Number(
        game.gamePk,
      );

    const key =
      String(
        gamePk,
      );

    const existing =
      existingMap.get(
        key,
      );

    try {
      console.log(
        "--------------------------------------",
      );

      console.log(
        `⚾ 開始分析 ${gamePk}`,
      );

      console.log(
        `${game.teams.away.team.name} VS ${game.teams.home.team.name}`,
      );

      const analysis =
        await calculateMlbGameAnalysis(
          game,
        );

      summary.analyzed +=
        1;

      /*
       * ======================================
       * 5. 建立完整 prediction
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
                analysis
                  .betAdvisor
                  .confidence ??
                  0,
              ),
            ),
          ),
        );

      console.log(
        `🎯 模型方向：${analysis.selectedTeamName}`,
      );

      console.log(
        `🎯 推薦：${prediction}`,
      );

      console.log(
        `📊 信心：${confidence}%`,
      );

      /*
       * ======================================
       * 6A. 已存在 → UPDATE
       *
       * result 不修改。
       * 已經 settled 的資料不會被改回 pending。
       * ======================================
       */
      if (existing) {
        const {
          error:
            updateError,
        } = await supabase
          .from(
            "prediction_history",
          )
          .update({
            home_team:
              analysis.homeTeamName,

            away_team:
              analysis.awayTeamName,

            prediction,

            confidence,
          })
          .eq(
            "game_pk",
            key,
          )
          .eq(
            "sport",
            "MLB",
          );

        if (
          updateError
        ) {
          throw updateError;
        }

        summary.updated +=
          1;

        console.log(
          `🔄 MLB ${gamePk} 更新成功`,
        );

        console.log(
          `   舊：${existing.prediction ?? "空白"}`,
        );

        console.log(
          `   新：${prediction}`,
        );

        continue;
      }

      /*
       * ======================================
       * 6B. 不存在 → INSERT
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
            key,

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
         * 另一個請求同時 INSERT
         */
        if (
          insertError.code ===
          "23505"
        ) {
          /*
           * Race condition：
           * 如果另一個請求剛建立，
           * 再補一次 UPDATE，
           * 確保它也是最新版推薦。
           */
          const {
            error:
              raceUpdateError,
          } = await supabase
            .from(
              "prediction_history",
            )
            .update({
              home_team:
                analysis.homeTeamName,

              away_team:
                analysis.awayTeamName,

              prediction,

              confidence,
            })
            .eq(
              "game_pk",
              key,
            )
            .eq(
              "sport",
              "MLB",
            );

          if (
            raceUpdateError
          ) {
            throw raceUpdateError;
          }

          summary.updated +=
            1;

          console.log(
            `ℹ️ MLB ${gamePk} 已由其他請求建立，已同步更新最新版推薦。`,
          );

          continue;
        }

        throw insertError;
      }

      summary.inserted +=
        1;

      console.log(
        `✅ MLB ${gamePk} 新增成功：${prediction}`,
      );
    } catch (error) {
      summary.failed +=
        1;

      const message =
        getErrorMessage(
          error,
        );

      summary.errors.push({
        gamePk,
        message,
      });

      console.error(
        `❌ MLB ${gamePk} 預測處理失敗：`,
        error,
      );
    }
  }

  /*
   * ==========================================
   * 7. 完成
   * ==========================================
   */
  console.log(
    "======================================",
  );

  console.log(
    "🏁 MLB 批次預測完成",
  );

  console.log(
    `⚾ 賽程：${summary.scheduleCount}`,
  );

  console.log(
    `✅ 原本已有：${summary.existing}`,
  );

  console.log(
    `➕ 原本缺少：${summary.missing}`,
  );

  console.log(
    `🧠 完成分析：${summary.analyzed}`,
  );

  console.log(
    `➕ 新增：${summary.inserted}`,
  );

  console.log(
    `🔄 更新：${summary.updated}`,
  );

  console.log(
    `❌ 失敗：${summary.failed}`,
  );

  console.log(
    "======================================",
  );

  return summary;
}