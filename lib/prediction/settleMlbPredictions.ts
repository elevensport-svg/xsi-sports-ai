import {
  createAdminClient,
} from "../supabase/admin";

import {
  getMlbFinalScoreByGamePk,
} from "../api/mlb";

type PendingMlbPrediction = {
  id: string;
  game_pk: string;
  home_team: string;
  away_team: string;
  prediction: string;
  result: string | null;
  created_at: string;
};

export type MlbSettlementResult = {
  pending: number;
  matched: number;
  settled: number;
  wins: number;
  losses: number;
  pushes: number;
  notFinal: number;
  unsupported: number;

  details: Array<{
    id: string;
    gamePk: string;
    homeTeam: string;
    awayTeam: string;
    prediction: string;
    score?: string;
    result?:
      | "win"
      | "loss"
      | "push";
    message: string;
  }>;
};

function normalize(
  value: string,
) {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function containsTeamName(
  prediction: string,
  teamName: string,
) {
  const predictionKey =
    normalize(
      prediction,
    );

  const teamKey =
    normalize(
      teamName,
    );

  if (
    !predictionKey ||
    !teamKey
  ) {
    return false;
  }

  return predictionKey.includes(
    teamKey,
  );
}

function parseSpread(
  prediction: string,
) {
  const chinese =
    prediction.match(
      /(讓分|受讓)\s*([+-]?\d+(?:\.\d+)?)/i,
    );

  if (
    chinese
  ) {
    const point =
      Number(
        chinese[2],
      );

    if (
      !Number.isFinite(
        point,
      )
    ) {
      return null;
    }

    return point;
  }

  const runLine =
    prediction.match(
      /run\s*line\s*([+-]?\d+(?:\.\d+)?)/i,
    );

  if (
    !runLine
  ) {
    return null;
  }

  const point =
    Number(
      runLine[1],
    );

  if (
    !Number.isFinite(
      point,
    )
  ) {
    return null;
  }

  return point;
}

function settlePrediction({
  prediction,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
}: {
  prediction: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}):
  | "win"
  | "loss"
  | "push"
  | null {
  const text =
    prediction.trim();

  const lower =
    text.toLowerCase();

  let selectedScore:
    number | null =
    null;

  let opponentScore:
    number | null =
    null;

  if (
    containsTeamName(
      text,
      homeTeam,
    )
  ) {
    selectedScore =
      homeScore;

    opponentScore =
      awayScore;
  } else if (
    containsTeamName(
      text,
      awayTeam,
    )
  ) {
    selectedScore =
      awayScore;

    opponentScore =
      homeScore;
  }

  if (
    selectedScore ===
      null ||
    opponentScore ===
      null
  ) {
    return null;
  }

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
    if (
      selectedScore >
      opponentScore
    ) {
      return "win";
    }

    if (
      selectedScore <
      opponentScore
    ) {
      return "loss";
    }

    return "push";
  }

  const spread =
    parseSpread(
      text,
    );

  if (
    spread !== null
  ) {
    const adjustedScore =
      selectedScore +
      spread;

    if (
      adjustedScore >
      opponentScore
    ) {
      return "win";
    }

    if (
      adjustedScore <
      opponentScore
    ) {
      return "loss";
    }

    return "push";
  }

  /*
   * 如果有球隊名稱但沒有玩法，
   * 保底視為獨贏方向。
   */
  if (
    selectedScore >
    opponentScore
  ) {
    return "win";
  }

  if (
    selectedScore <
    opponentScore
  ) {
    return "loss";
  }

  return "push";
}

export async function settleMlbPredictions(): Promise<MlbSettlementResult> {
  const supabase =
    createAdminClient();

  const {
    data:
      pendingData,

    error:
      pendingError,
  } =
    await supabase
      .from(
        "prediction_history",
      )
      .select(
        `
          id,
          game_pk,
          home_team,
          away_team,
          prediction,
          result,
          created_at
        `,
      )
      .eq(
        "sport",
        "MLB",
      )
      .or(
        "result.is.null,result.eq.pending",
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      );

  if (
    pendingError
  ) {
    throw new Error(
      `讀取 MLB pending 預測失敗：${pendingError.message}`,
    );
  }

  const pendingRows =
    (
      pendingData ??
      []
    ) as PendingMlbPrediction[];

  const summary:
    MlbSettlementResult =
    {
      pending:
        pendingRows.length,

      matched:
        0,

      settled:
        0,

      wins:
        0,

      losses:
        0,

      pushes:
        0,

      notFinal:
        0,

      unsupported:
        0,

      details:
        [],
    };

  const scoreCache =
    new Map<
      string,
      Awaited<
        ReturnType<
          typeof getMlbFinalScoreByGamePk
        >
      >
    >();

  for (
    const prediction
    of pendingRows
  ) {
    const gamePk =
      String(
        prediction.game_pk,
      );

    let finalScore =
      scoreCache.get(
        gamePk,
      );

    if (
      finalScore ===
      undefined
    ) {
      finalScore =
        await getMlbFinalScoreByGamePk(
          gamePk,
        );

      scoreCache.set(
        gamePk,
        finalScore,
      );
    }

    if (
      !finalScore
    ) {
      summary.notFinal +=
        1;

      summary.details.push({
        id:
          prediction.id,

        gamePk,

        homeTeam:
          prediction.home_team,

        awayTeam:
          prediction.away_team,

        prediction:
          prediction.prediction,

        message:
          "比賽尚未正式完賽，暫不結算",
      });

      continue;
    }

    summary.matched +=
      1;

    const settlement =
      settlePrediction({
        prediction:
          prediction.prediction,

        homeTeam:
          finalScore.homeTeam.name,

        awayTeam:
          finalScore.awayTeam.name,

        homeScore:
          finalScore.homeScore,

        awayScore:
          finalScore.awayScore,
      });

    if (
      !settlement
    ) {
      summary.unsupported +=
        1;

      summary.details.push({
        id:
          prediction.id,

        gamePk,

        homeTeam:
          prediction.home_team,

        awayTeam:
          prediction.away_team,

        prediction:
          prediction.prediction,

        score:
          `${finalScore.awayScore}-${finalScore.homeScore}`,

        message:
          "無法辨識推薦球隊或玩法，未結算",
      });

      continue;
    }

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "prediction_history",
        )
        .update({
  result:
    settlement,

  away_score:
    finalScore.awayScore,

  home_score:
    finalScore.homeScore,
})
        .eq(
          "id",
          prediction.id,
        );

    if (
      updateError
    ) {
      throw new Error(
        `更新 MLB 結算失敗 ${prediction.id}：${updateError.message}`,
      );
    }

    summary.settled +=
      1;

    if (
      settlement ===
      "win"
    ) {
      summary.wins +=
        1;
    } else if (
      settlement ===
      "loss"
    ) {
      summary.losses +=
        1;
    } else {
      summary.pushes +=
        1;
    }

    summary.details.push({
      id:
        prediction.id,

      gamePk,

      homeTeam:
        prediction.home_team,

      awayTeam:
        prediction.away_team,

      prediction:
        prediction.prediction,

      score:
        `${finalScore.awayScore}-${finalScore.homeScore}`,

      result:
        settlement,

      message:
        `結算完成：${settlement}`,
    });

    console.log(
      `⚾ MLB SETTLED：${finalScore.awayTeam.name} ${finalScore.awayScore}-${finalScore.homeScore} ${finalScore.homeTeam.name}｜${prediction.prediction}｜${settlement}`,
    );
  }

  console.log(
    "======================================",
  );

  console.log(
    "⚾ MLB SETTLEMENT COMPLETE",
  );

  console.log(
    `Pending：${summary.pending}`,
  );

  console.log(
    `Matched：${summary.matched}`,
  );

  console.log(
    `Settled：${summary.settled}`,
  );

  console.log(
    `Win：${summary.wins}`,
  );

  console.log(
    `Loss：${summary.losses}`,
  );

  console.log(
    `Push：${summary.pushes}`,
  );

  console.log(
    `Not Final：${summary.notFinal}`,
  );

  console.log(
    `Unsupported：${summary.unsupported}`,
  );

  console.log(
    "======================================",
  );

  return summary;
}