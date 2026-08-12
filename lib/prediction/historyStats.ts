export type PredictionHistoryForStats = {
  game_pk: string;
  sport: string;
  home_team: string;
  away_team: string;
  prediction: string;
  result: string | null;
};

export type PredictionHistoryStats = {
  validRecords: number;
  pending: number;
  wins: number;
  losses: number;
  settled: number;
  ignored: number;
};

function normalize(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isRealMlbGamePk(
  gamePk: string,
) {
  return /^\d+$/.test(
    String(gamePk ?? "").trim(),
  );
}

function hasInvalidText(
  value: string,
) {
  const text =
    normalize(value);

  if (!text) {
    return true;
  }

  return (
    text.includes("?") ||
    text.includes("test") ||
    text.includes("測試") ||
    text.includes("api???") ||
    text.includes("api-test")
  );
}

export function isValidMlbPrediction(
  history: PredictionHistoryForStats,
) {
  if (
    normalize(history.sport) !==
    "mlb"
  ) {
    return false;
  }

  if (
    !isRealMlbGamePk(
      history.game_pk,
    )
  ) {
    return false;
  }

  if (
    hasInvalidText(
      history.home_team,
    ) ||
    hasInvalidText(
      history.away_team,
    )
  ) {
    return false;
  }

  if (
    hasInvalidText(
      history.prediction,
    )
  ) {
    return false;
  }

  return true;
}

export function getPredictionHistoryStats(
  histories: PredictionHistoryForStats[],
): PredictionHistoryStats {
  let pending = 0;
  let wins = 0;
  let losses = 0;
  let ignored = 0;

  for (
    const history
    of histories
  ) {
    if (
      !isValidMlbPrediction(
        history,
      )
    ) {
      ignored += 1;
      continue;
    }

    const result =
      normalize(
        history.result,
      );

    if (
      result === "pending" ||
      result === ""
    ) {
      pending += 1;
      continue;
    }

    if (
      [
        "win",
        "won",
        "correct",
      ].includes(result)
    ) {
      wins += 1;
      continue;
    }

    if (
      [
        "loss",
        "lose",
        "lost",
        "wrong",
      ].includes(result)
    ) {
      losses += 1;
      continue;
    }

    ignored += 1;
  }

  return {
    validRecords:
      pending +
      wins +
      losses,

    pending,

    wins,

    losses,

    settled:
      wins +
      losses,

    ignored,
  };
}