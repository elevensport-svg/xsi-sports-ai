import {
  createAdminClient,
} from "../supabase/admin";

type PendingPrediction = {
  id: string;
  game_pk: string;
  sport: string;
  home_team: string;
  away_team: string;
  prediction: string;
  result: string | null;
};

type MlbLiveFeed = {
  gameData?: {
    status?: {
      abstractGameState?: string;
      detailedState?: string;
    };
  };

  liveData?: {
    linescore?: {
      teams?: {
        home?: {
          runs?: number;
        };

        away?: {
          runs?: number;
        };
      };
    };
  };
};

export type SettleMlbPredictionsResult = {
  pending: number;
  finished: number;
  settled: number;
  wins: number;
  losses: number;
  skipped: number;
  failed: number;

  errors: Array<{
    gamePk: string;
    message: string;
  }>;
};

function normalize(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}

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

function isFinishedGame(
  feed: MlbLiveFeed,
) {
  const abstractState =
    normalize(
      feed.gameData
        ?.status
        ?.abstractGameState,
    );

  const detailedState =
    normalize(
      feed.gameData
        ?.status
        ?.detailedState,
    );

  return (
    abstractState ===
      "final" ||
    detailedState ===
      "final" ||
    detailedState ===
      "game over" ||
    detailedState ===
      "completed early"
  );
}

function getFinalScore(
  feed: MlbLiveFeed,
) {
  const homeRuns =
    Number(
      feed.liveData
        ?.linescore
        ?.teams
        ?.home
        ?.runs,
    );

  const awayRuns =
    Number(
      feed.liveData
        ?.linescore
        ?.teams
        ?.away
        ?.runs,
    );

  if (
    !Number.isFinite(
      homeRuns,
    ) ||
    !Number.isFinite(
      awayRuns,
    )
  ) {
    return null;
  }

  return {
    homeRuns,
    awayRuns,
  };
}

function getRecommendedTeam(
  prediction: PendingPrediction,
) {
  const recommendation =
    normalize(
      prediction.prediction,
    );

  const homeTeam =
    normalize(
      prediction.home_team,
    );

  const awayTeam =
    normalize(
      prediction.away_team,
    );

  if (
    homeTeam &&
    recommendation.includes(
      homeTeam,
    )
  ) {
    return "home";
  }

  if (
    awayTeam &&
    recommendation.includes(
      awayTeam,
    )
  ) {
    return "away";
  }

  return null;
}

function getSpread(
  predictionText: string,
) {
  /*
   * 支援：
   *
   * Dodgers 讓分 -1.5
   * Dodgers -1.5
   * Yankees 受讓 +1.5
   */
  const match =
    predictionText.match(
      /([+-]\s*\d+(?:\.\d+)?)/,
    );

  if (
    !match
  ) {
    return null;
  }

  const value =
    Number(
      match[1].replace(
        /\s+/g,
        "",
      ),
    );

  return Number.isFinite(
    value,
  )
    ? value
    : null;
}

function calculateResult({
  prediction,
  homeRuns,
  awayRuns,
}: {
  prediction: PendingPrediction;
  homeRuns: number;
  awayRuns: number;
}):
  | "win"
  | "loss"
  | null {
  const text =
    normalize(
      prediction.prediction,
    );

  const recommendedTeam =
    getRecommendedTeam(
      prediction,
    );

  if (
    !recommendedTeam
  ) {
    return null;
  }

  /*
   * ==========================================
   * 獨贏 / Moneyline
   * ==========================================
   */
  const isMoneyline =
    text.includes(
      "獨贏",
    ) ||
    text.includes(
      "moneyline",
    ) ||
    text.includes(
      "money line",
    );

  if (
    isMoneyline
  ) {
    if (
      recommendedTeam ===
      "home"
    ) {
      return homeRuns >
        awayRuns
        ? "win"
        : "loss";
    }

    return awayRuns >
      homeRuns
      ? "win"
      : "loss";
  }

  /*
   * ==========================================
   * 讓分 / 受讓
   * ==========================================
   */
  const isSpread =
    text.includes(
      "讓分",
    ) ||
    text.includes(
      "受讓",
    ) ||
    text.includes(
      "+1.5",
    ) ||
    text.includes(
      "-1.5",
    );

  if (
    isSpread
  ) {
    const spread =
      getSpread(
        prediction.prediction,
      );

    if (
      spread === null
    ) {
      return null;
    }

    if (
      recommendedTeam ===
      "home"
    ) {
      const adjustedScore =
        homeRuns +
        spread;

      return adjustedScore >
        awayRuns
        ? "win"
        : "loss";
    }

    const adjustedScore =
      awayRuns +
      spread;

    return adjustedScore >
      homeRuns
      ? "win"
      : "loss";
  }

  /*
   * ==========================================
   * 舊資料沒有寫「獨贏」時
   * 只要 prediction 明確包含球隊名稱，
   * 預設視為 Moneyline
   * ==========================================
   */
  if (
    recommendedTeam ===
    "home"
  ) {
    return homeRuns >
      awayRuns
      ? "win"
      : "loss";
  }

  return awayRuns >
    homeRuns
    ? "win"
    : "loss";
}

async function getMlbGameFeed(
  gamePk: string,
): Promise<MlbLiveFeed | null> {
  const url =
    `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

  try {
    const response =
      await fetch(
        url,
        {
          cache:
            "no-store",
        },
      );

    if (
      !response.ok
    ) {
      console.error(
        `MLB 結算 API ${gamePk} 錯誤：`,
        response.status,
      );

      return null;
    }

    return (
      (await response.json()) as MlbLiveFeed
    );
  } catch (error) {
    console.error(
      `取得 MLB ${gamePk} 比賽結果失敗：`,
      error,
    );

    return null;
  }
}

export async function settleFootballPredictions(): Promise<SettleMlbPredictionsResult> {
  const summary: SettleMlbPredictionsResult = {
    pending: 0,
    finished: 0,
    settled: 0,
    wins: 0,
    losses: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const supabase =
    createAdminClient();

  /*
   * ==========================================
   * 1. 只抓 MLB pending
   * ==========================================
   */
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
        result
      `,
    )
    .eq(
      "sport",
      "MLB",
    )
    .eq(
      "result",
      "pending",
    );

  if (
    error
  ) {
    console.error(
      "讀取 MLB 待結算預測失敗：",
      error,
    );

    summary.failed += 1;

    summary.errors.push({
      gamePk:
        "DATABASE",

      message:
        getErrorMessage(
          error,
        ),
    });

    return summary;
  }

  const pendingPredictions =
    (data ??
      []) as PendingPrediction[];

  summary.pending =
    pendingPredictions.length;

  if (
    pendingPredictions.length ===
    0
  ) {
    return summary;
  }

  /*
   * ==========================================
   * 2. 逐場確認 MLB 比賽
   * ==========================================
   */
  for (
    const prediction
    of pendingPredictions
  ) {
    const gamePk =
      String(
        prediction.game_pk ??
          "",
      ).trim();

    /*
     * 排除假 game_pk
     */
    if (
      !/^\d+$/.test(
        gamePk,
      )
    ) {
      summary.skipped += 1;
      continue;
    }

    try {
      const feed =
        await getMlbGameFeed(
          gamePk,
        );

      if (
        !feed
      ) {
        summary.failed += 1;

        summary.errors.push({
          gamePk,
          message:
            "無法取得 MLB 比賽資料",
        });

        continue;
      }

      /*
       * 還沒結束，不動
       */
      if (
        !isFinishedGame(
          feed,
        )
      ) {
        summary.skipped += 1;
        continue;
      }

      summary.finished += 1;

      const finalScore =
        getFinalScore(
          feed,
        );

      if (
        !finalScore
      ) {
        summary.failed += 1;

        summary.errors.push({
          gamePk,
          message:
            "比賽已結束但無法取得最終比分",
        });

        continue;
      }

      const result =
        calculateResult({
          prediction,

          homeRuns:
            finalScore.homeRuns,

          awayRuns:
            finalScore.awayRuns,
        });

      if (
        !result
      ) {
        summary.skipped += 1;

        summary.errors.push({
          gamePk,
          message:
            `無法判斷 prediction：${prediction.prediction}`,
        });

        continue;
      }

      /*
       * ======================================
       * 3. 更新 prediction_history
       * ======================================
       */
      const {
        error:
          updateError,
      } = await supabase
        .from(
          "prediction_history",
        )
        .update({
          result,
        })
        .eq(
          "id",
          prediction.id,
        )
        .eq(
          "result",
          "pending",
        );

      if (
        updateError
      ) {
        throw updateError;
      }

      summary.settled += 1;

      if (
        result ===
        "win"
      ) {
        summary.wins += 1;
      } else {
        summary.losses += 1;
      }

      console.log(
        `✅ MLB ${gamePk} 自動結算：${prediction.prediction} → ${result}｜比分 ${finalScore.awayRuns}:${finalScore.homeRuns}`,
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
        `❌ MLB ${gamePk} 結算失敗：`,
        error,
      );
    }
  }

  return summary;
}