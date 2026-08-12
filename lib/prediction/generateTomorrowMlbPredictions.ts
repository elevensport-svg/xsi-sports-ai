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
 * 判斷 prediction 是否已經是完整格式
 *
 * 正確：
 * 坦帕灣光芒 獨贏
 * 紐約洋基 讓分 -1.5
 * 芝加哥小熊 受讓 +1.5
 *
 * 舊格式：
 * 獨贏
 * 讓分
 * 受讓 +1.5
 * Run Line +1.5
 * Moneyline
 *
 * 核心規則：
 * prediction 必須包含主隊或客隊名稱
 * ==========================================
 */
function hasTeamName(
  row: ExistingPrediction,
) {
  const prediction =
    row.prediction
      ?.trim() ?? "";

  const homeTeam =
    row.home_team
      ?.trim() ?? "";

  const awayTeam =
    row.away_team
      ?.trim() ?? "";

  if (!prediction) {
    return false;
  }

  const hasHomeTeam =
    Boolean(
      homeTeam &&
      prediction.includes(
        homeTeam,
      ),
    );

  const hasAwayTeam =
    Boolean(
      awayTeam &&
      prediction.includes(
        awayTeam,
      ),
    );

  return (
    hasHomeTeam ||
    hasAwayTeam
  );
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

  /*
   * ========================================
   * 受讓
   *
   * 必須放在「讓分」前面判斷
   * ========================================
   */
  if (
    recommendation.includes(
      "受讓",
    ) ||
    recommendation
      .toLowerCase()
      .includes(
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
    recommendation
      .toLowerCase()
      .includes(
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
    recommendation
      .toLowerCase()
      .includes(
        "moneyline",
      )
  ) {
    return `${teamName} 獨贏`;
  }

  /*
   * ========================================
   * fallback
   *
   * 目前 BetAdvisor 如果回傳其他格式，
   * 先保留球隊名稱，避免再次只存玩法。
   * ========================================
   */
  return `${teamName} ${recommendation || "獨贏"}`;
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
   * 一次把：
   * game_pk
   * home_team
   * away_team
   * prediction
   *
   * 全部讀出來
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
      "game_pk,home_team,away_team,prediction",
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

  /*
   * ==========================================
   * 4. 找出需要處理的比賽
   *
   * 情況 A：
   * prediction_history 完全沒有
   *
   * 情況 B：
   * 有資料，但 prediction 沒有球隊名稱
   * ==========================================
   */
  const gamesToAnalyze =
    games.filter(
      (game) => {
        const gamePk =
          String(
            game.gamePk,
          );

        const existing =
          existingMap.get(
            gamePk,
          );

        /*
         * 完全沒有資料
         */
        if (!existing) {
          console.log(
            `➕ MLB ${gamePk} 尚未建立預測`,
          );

          return true;
        }

        /*
         * 有資料但格式不完整
         */
        if (
          !hasTeamName(
            existing,
          )
        ) {
          console.log(
            `🔧 MLB ${gamePk} 舊格式：${existing.prediction ?? "空白"}`,
          );

          return true;
        }

        /*
         * 已經是完整格式
         */
        return false;
      },
    );

  summary.existing =
    games.length -
    gamesToAnalyze.length;

  summary.missing =
    gamesToAnalyze.length;

  console.log(
    "======================================",
  );

  console.log(
    `✅ MLB 完整格式：${summary.existing}`,
  );

  console.log(
    `🔧 MLB 需要新增 / 更新：${summary.missing}`,
  );

  console.log(
    "======================================",
  );

  /*
   * ==========================================
   * 5. 全部正常
   * ==========================================
   */
  if (
    gamesToAnalyze.length ===
    0
  ) {
    console.log(
      "✅ MLB 本日所有 prediction 都已包含球隊名稱。",
    );

    return summary;
  }

  /*
   * ==========================================
   * 6. 開始分析
   * ==========================================
   */
  for (
    const game
    of gamesToAnalyze
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
       * 7. 建立完整 prediction
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
        `🎯 推薦：${prediction}`,
      );

      console.log(
        `📊 信心：${confidence}%`,
      );

      /*
       * ======================================
       * 8A. 已存在 → UPDATE
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
          `   ${existing.prediction ?? "空白"}`,
        );

        console.log(
          `   ↓`,
        );

        console.log(
          `   ${prediction}`,
        );

        continue;
      }

      /*
       * ======================================
       * 8B. 不存在 → INSERT
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
          console.log(
            `ℹ️ MLB ${gamePk} 已由其他請求建立。`,
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
    `⚾ 賽程：${summary.scheduleCount}`,
  );

  console.log(
    `✅ 原本完整：${summary.existing}`,
  );

  console.log(
    `🔧 需要處理：${summary.missing}`,
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