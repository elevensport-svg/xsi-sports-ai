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

  pushes: number;

  settled: number;

  ignored: number;

  mlb: {
    validRecords: number;
    pending: number;
    wins: number;
    losses: number;
    pushes: number;
  };

  football: {
    validRecords: number;
    pending: number;
    wins: number;
    losses: number;
    pushes: number;
  };
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

function hasInvalidText(
  value: string,
) {
  const text =
    normalize(
      value,
    );

  if (
    !text
  ) {
    return true;
  }

  return (
    text.includes(
      "?",
    ) ||
    text.includes(
      "test",
    ) ||
    text.includes(
      "測試",
    ) ||
    text.includes(
      "api???",
    ) ||
    text.includes(
      "api-test",
    )
  );
}

/* ==========================================
   MLB Validation
========================================== */

function isRealMlbGamePk(
  gamePk: string,
) {
  return /^\d+$/.test(
    String(
      gamePk ?? "",
    ).trim(),
  );
}

export function isValidMlbPrediction(
  history:
    PredictionHistoryForStats,
) {
  if (
    normalize(
      history.sport,
    ) !==
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

/* ==========================================
   Football Validation
========================================== */

export function isValidFootballPrediction(
  history:
    PredictionHistoryForStats,
) {
  if (
    normalize(
      history.sport,
    ) !==
    "football"
  ) {
    return false;
  }

  if (
    !String(
      history.game_pk ??
      "",
    ).trim()
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

/* ==========================================
   Global Validation
========================================== */

export function isValidPrediction(
  history:
    PredictionHistoryForStats,
) {
  return (
    isValidMlbPrediction(
      history,
    ) ||
    isValidFootballPrediction(
      history,
    )
  );
}

/* ==========================================
   Result Parser
========================================== */

function getResultType(
  result:
    string | null,
):
  | "pending"
  | "win"
  | "loss"
  | "push"
  | "invalid" {
  const value =
    normalize(
      result,
    );

  if (
    value ===
      "pending" ||
    value ===
      ""
  ) {
    return "pending";
  }

  if (
    [
      "win",
      "won",
      "correct",
    ].includes(
      value,
    )
  ) {
    return "win";
  }

  if (
    [
      "loss",
      "lose",
      "lost",
      "wrong",
    ].includes(
      value,
    )
  ) {
    return "loss";
  }

  if (
    [
      "push",
      "void",
      "draw",
    ].includes(
      value,
    )
  ) {
    return "push";
  }

  return "invalid";
}

/* ==========================================
   Main Stats
========================================== */

export function getPredictionHistoryStats(
  histories:
    PredictionHistoryForStats[],
): PredictionHistoryStats {
  let pending =
    0;

  let wins =
    0;

  let losses =
    0;

  let pushes =
    0;

  let ignored =
    0;

  const mlb = {
    validRecords:
      0,

    pending:
      0,

    wins:
      0,

    losses:
      0,

    pushes:
      0,
  };

  const football = {
    validRecords:
      0,

    pending:
      0,

    wins:
      0,

    losses:
      0,

    pushes:
      0,
  };

  for (
    const history
    of histories
  ) {
    const sport =
      normalize(
        history.sport,
      );

    const isMlb =
      isValidMlbPrediction(
        history,
      );

    const isFootball =
      isValidFootballPrediction(
        history,
      );

    if (
      !isMlb &&
      !isFootball
    ) {
      ignored +=
        1;

      continue;
    }

    const result =
      getResultType(
        history.result,
      );

    if (
      result ===
      "invalid"
    ) {
      ignored +=
        1;

      continue;
    }

    if (
      result ===
      "pending"
    ) {
      pending +=
        1;
    } else if (
      result ===
      "win"
    ) {
      wins +=
        1;
    } else if (
      result ===
      "loss"
    ) {
      losses +=
        1;
    } else if (
      result ===
      "push"
    ) {
      pushes +=
        1;
    }

    const bucket =
      sport ===
      "mlb"
        ? mlb
        : football;

    bucket.validRecords +=
      1;

    if (
      result ===
      "pending"
    ) {
      bucket.pending +=
        1;
    } else if (
      result ===
      "win"
    ) {
      bucket.wins +=
        1;
    } else if (
      result ===
      "loss"
    ) {
      bucket.losses +=
        1;
    } else if (
      result ===
      "push"
    ) {
      bucket.pushes +=
        1;
    }
  }

  return {
    validRecords:
      pending +
      wins +
      losses +
      pushes,

    pending,

    wins,

    losses,

    pushes,

    settled:
      wins +
      losses +
      pushes,

    ignored,

    mlb,

    football,
  };
}