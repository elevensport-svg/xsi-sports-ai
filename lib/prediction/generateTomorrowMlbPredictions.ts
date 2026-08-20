import {
  getTomorrowMlbGames,
} from "../api/mlb";

import {
  createAdminClient,
} from "../supabase/admin";

import {
  calculateMlbGameAnalysis,
} from "../xsi/mlbGameAnalysis";

/* ==========================================
   Result Type
========================================== */

export type GenerateTomorrowMlbPredictionsResult = {
  scheduleCount: number;

  existing: number;

  analyzed: number;

  inserted: number;

  failed: number;

  details: Array<{
    gamePk: string;

    awayTeam: string;

    homeTeam: string;

    prediction?: string;

    confidence?: number;

    status:
      | "existing"
      | "inserted"
      | "failed";

    message: string;
  }>;
};

/* ==========================================
   Recommendation Formatter

   重要：
   prediction_history 一律寫入：

   球隊名稱 + 玩法

   例如：
   洋基 獨贏
   道奇 讓分 -1.5
   金鶯 受讓 +1.5

   避免之後結算不知道推薦哪隊。
========================================== */

function formatPrediction(
  selectedTeamName: string,
  recommendation: string,
) {
  const teamName =
    String(
      selectedTeamName ??
        "",
    ).trim();

  const text =
    String(
      recommendation ??
        "",
    ).trim();

  if (
    !teamName
  ) {
    return text;
  }

  /*
   * 已經有球隊名稱
   */
  if (
    text.includes(
      teamName,
    )
  ) {
    return text
      .replace(
        "讓分 +1.5",
        "受讓 +1.5",
      );
  }

  const lower =
    text.toLowerCase();

  /*
   * ========================================
   * 受讓
   * ========================================
   */

  if (
    text.includes(
      "受讓",
    ) ||
    lower.includes(
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
    text.includes(
      "讓分",
    ) ||
    lower.includes(
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
    text.includes(
      "獨贏",
    ) ||
    lower.includes(
      "moneyline",
    ) ||
    lower.includes(
      "money line",
    )
  ) {
    return `${teamName} 獨贏`;
  }

  /*
   * ========================================
   * 其他推薦格式
   * ========================================
   */

  if (
    text
  ) {
    return `${teamName} ${text}`;
  }

  /*
   * 理論上不應該發生，
   * 保底仍寫入球隊獨贏。
   */

  return `${teamName} 獨贏`;
}

/* ==========================================
   Generate Tomorrow MLB Predictions
========================================== */

export async function generateTomorrowMlbPredictions(): Promise<GenerateTomorrowMlbPredictionsResult> {
  const supabase =
    createAdminClient();

  console.log(
    "======================================",
  );

  console.log(
    "⚾ MLB TOMORROW PREDICTION START",
  );

  /* ========================================
     STEP 1
     取得明日 MLB 賽程
  ======================================== */

  const games =
    await getTomorrowMlbGames();

  console.log(
    `⚾ Tomorrow MLB Games：${games.length}`,
  );

  const result:
    GenerateTomorrowMlbPredictionsResult =
    {
      scheduleCount:
        games.length,

      existing:
        0,

      analyzed:
        0,

      inserted:
        0,

      failed:
        0,

      details:
        [],
    };

  /* ========================================
     STEP 2
     逐場分析
  ======================================== */

  for (
    const game
    of games
  ) {
    const gamePk =
      String(
        game.gamePk,
      );

    const awayTeam =
      game.teams.away.team.name;

    const homeTeam =
      game.teams.home.team.name;

    try {
      /* ====================================
         STEP 2-1
         檢查是否已經存在
      ==================================== */

      const {
        data:
          existingRows,

        error:
          existingError,
      } =
        await supabase
          .from(
            "prediction_history",
          )
          .select(
            "id, game_pk",
          )
          .eq(
            "sport",
            "MLB",
          )
          .eq(
            "game_pk",
            gamePk,
          )
          .limit(
            1,
          );

      if (
        existingError
      ) {
        throw new Error(
          `檢查既有 MLB 預測失敗：${existingError.message}`,
        );
      }

      if (
        existingRows &&
        existingRows.length >
          0
      ) {
        result.existing +=
          1;

        result.details.push({
          gamePk,

          awayTeam,

          homeTeam,

          status:
            "existing",

          message:
            "prediction_history 已存在",
        });

        continue;
      }

      /* ====================================
         STEP 2-2
         執行 XSI MLB 分析
      ==================================== */

      console.log(
        `🤖 Analyze：${awayTeam} @ ${homeTeam}`,
      );

      const analysis =
        await calculateMlbGameAnalysis(
          game,
        );

      result.analyzed +=
        1;

      const {
        selectedTeamName,

        betAdvisor,
      } =
        analysis;

      const prediction =
        formatPrediction(
          selectedTeamName,
          betAdvisor.recommendation,
        );

      const confidence =
        Number(
          betAdvisor.confidence ??
            0,
        );

      if (
        !prediction
      ) {
        throw new Error(
          "XSI 沒有產生 prediction",
        );
      }

      /* ====================================
         STEP 2-3
         寫入 prediction_history
      ==================================== */

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
              gamePk,

            sport:
              "MLB",

            home_team:
              homeTeam,

            away_team:
              awayTeam,

            prediction,

            confidence,

            result:
              "pending",
          });

      if (
        insertError
      ) {
        throw new Error(
          `寫入 prediction_history 失敗：${insertError.message}`,
        );
      }

      result.inserted +=
        1;

      result.details.push({
        gamePk,

        awayTeam,

        homeTeam,

        prediction,

        confidence,

        status:
          "inserted",

        message:
          "MLB 預測建立完成",
      });

      console.log(
        `✅ MLB Prediction：${awayTeam} @ ${homeTeam}｜${prediction}｜${confidence}%`,
      );
    } catch (
      error
    ) {
      result.failed +=
        1;

      const message =
        error instanceof Error
          ? error.message
          : String(
              error,
            );

      console.error(
        `❌ MLB Prediction Failed：${awayTeam} @ ${homeTeam}`,
        message,
      );

      result.details.push({
        gamePk,

        awayTeam,

        homeTeam,

        status:
          "failed",

        message,
      });
    }
  }

  /* ========================================
     STEP 3
     Complete
  ======================================== */

  console.log(
    "======================================",
  );

  console.log(
    "⚾ MLB TOMORROW PREDICTION COMPLETE",
  );

  console.log(
    `Schedule：${result.scheduleCount}`,
  );

  console.log(
    `Existing：${result.existing}`,
  );

  console.log(
    `Analyzed：${result.analyzed}`,
  );

  console.log(
    `Inserted：${result.inserted}`,
  );

  console.log(
    `Failed：${result.failed}`,
  );

  console.log(
    "======================================",
  );

  return result;
}