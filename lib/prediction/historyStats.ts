type PredictionHistoryLike = {
  game_pk?: string | number | null;
  sport?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  prediction?: string | null;
  result?: string | null;
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

function hasValidTeamName(
  value: unknown,
) {
  const text =
    String(
      value ?? "",
    ).trim();

  if (!text) {
    return false;
  }

  const normalized =
    text.toLowerCase();

  return ![
    "test",
    "unknown",
    "undefined",
    "null",
    "-",
  ].includes(
    normalized,
  );
}

function hasValidGamePk(
  value: unknown,
) {
  const text =
    String(
      value ?? "",
    ).trim();

  if (!text) {
    return false;
  }

  const normalized =
    text.toLowerCase();

  return !(
    normalized.includes(
      "test",
    ) ||
    normalized.includes(
      "mock",
    ) ||
    normalized.includes(
      "fake",
    )
  );
}

function hasValidPrediction(
  value: unknown,
) {
  const text =
    String(
      value ?? "",
    ).trim();

  if (!text) {
    return false;
  }

  const normalized =
    text.toLowerCase();

  return ![
    "test",
    "undefined",
    "null",
    "-",
  ].includes(
    normalized,
  );
}

/* ==========================================
   MLB
========================================== */

export function isValidMlbPrediction(
  item:
    PredictionHistoryLike,
) {
  return (
    normalize(
      item.sport,
    ) === "mlb" &&
    hasValidGamePk(
      item.game_pk,
    ) &&
    hasValidTeamName(
      item.home_team,
    ) &&
    hasValidTeamName(
      item.away_team,
    ) &&
    hasValidPrediction(
      item.prediction,
    )
  );
}

/* ==========================================
   FOOTBALL
========================================== */

export function isValidFootballPrediction(
  item:
    PredictionHistoryLike,
) {
  return (
    normalize(
      item.sport,
    ) === "football" &&
    hasValidGamePk(
      item.game_pk,
    ) &&
    hasValidTeamName(
      item.home_team,
    ) &&
    hasValidTeamName(
      item.away_team,
    ) &&
    hasValidPrediction(
      item.prediction,
    )
  );
}

/* ==========================================
   MLB + FOOTBALL
========================================== */

export function isValidPrediction(
  item:
    PredictionHistoryLike,
) {
  return (
    isValidMlbPrediction(
      item,
    ) ||
    isValidFootballPrediction(
      item,
    )
  );
}

function isWin(
  result: unknown,
) {
  return [
    "win",
    "won",
    "correct",
  ].includes(
    normalize(
      result,
    ),
  );
}

function isLoss(
  result: unknown,
) {
  return [
    "loss",
    "lose",
    "lost",
    "wrong",
  ].includes(
    normalize(
      result,
    ),
  );
}

function isPush(
  result: unknown,
) {
  return [
    "push",
    "void",
  ].includes(
    normalize(
      result,
    ),
  );
}

function isPending(
  result: unknown,
) {
  const normalized =
    normalize(
      result,
    );

  return (
    !normalized ||
    normalized ===
      "pending"
  );
}

export function getPredictionHistoryStats(
  rows:
    PredictionHistoryLike[],
) {
  const validRows =
    rows.filter(
      isValidPrediction,
    );

  let wins = 0;
  let losses = 0;
  let pending = 0;
  let pushes = 0;

  for (
    const row
    of validRows
  ) {
    if (
      isWin(
        row.result,
      )
    ) {
      wins += 1;
      continue;
    }

    if (
      isLoss(
        row.result,
      )
    ) {
      losses += 1;
      continue;
    }

    if (
      isPush(
        row.result,
      )
    ) {
      pushes += 1;
      continue;
    }

    if (
      isPending(
        row.result,
      )
    ) {
      pending += 1;
    }
  }

  return {
    validRecords:
      validRows.length,

    wins,

    losses,

    pending,

    pushes,

    settled:
      wins +
      losses +
      pushes,
  };
}