import type {
  GamePrediction,
  TeamGameAnalysis,
  TeamSide,
  XsiEngineResult,
} from "@/types/game";

type PredictionInput = {
  away: TeamGameAnalysis;
  home: TeamGameAnalysis;
  engine: XsiEngineResult;
};

type RunProjectionInput = {
  battingScore: number;
  opponentPitcherScore: number;
  opponentBullpenScore: number;
  recentFormScore: number;
  isHome: boolean;
};

const LEAGUE_AVERAGE_RUNS = 4.4;
const MIN_PROJECTED_RUNS = 1.5;
const MAX_PROJECTED_RUNS = 8.5;

export function calculateGamePrediction({
  away,
  home,
  engine,
}: PredictionInput): GamePrediction {
  const projectedAwayRuns = calculateProjectedRuns({
    battingScore: away.batting.score,
    opponentPitcherScore: home.pitcher.score,
    opponentBullpenScore: home.bullpen.score,
    recentFormScore: away.recentForm.score,
    isHome: false,
  });

  const projectedHomeRuns = calculateProjectedRuns({
    battingScore: home.batting.score,
    opponentPitcherScore: away.pitcher.score,
    opponentBullpenScore: away.bullpen.score,
    recentFormScore: home.recentForm.score,
    isHome: true,
  });

  const projectedTotalRuns = roundToOne(
    projectedAwayRuns + projectedHomeRuns,
  );

  const simulatedProbability = calculateSimulationProbability({
    projectedAwayRuns,
    projectedHomeRuns,
  });

  const winProbabilityAway = roundToOne(
    engine.away.winProbability * 0.65 +
      simulatedProbability.away * 0.35,
  );

  const winProbabilityHome = roundToOne(
    100 - winProbabilityAway,
  );

  const predictedWinner: TeamSide | "even" =
    Math.abs(winProbabilityAway - winProbabilityHome) < 1
      ? "even"
      : winProbabilityAway > winProbabilityHome
        ? "away"
        : "home";

  return {
    projectedAwayRuns,
    projectedHomeRuns,
    projectedTotalRuns,
    winProbabilityAway,
    winProbabilityHome,
    predictedWinner,
  };
}

function calculateProjectedRuns({
  battingScore,
  opponentPitcherScore,
  opponentBullpenScore,
  recentFormScore,
  isHome,
}: RunProjectionInput): number {
  const offenseAdjustment =
    normalizeScore(battingScore) * 1.15;

  const recentFormAdjustment =
    normalizeScore(recentFormScore) * 0.45;

  const pitcherAdjustment =
    normalizeScore(100 - opponentPitcherScore) * 0.95;

  const bullpenAdjustment =
    normalizeScore(100 - opponentBullpenScore) * 0.65;

  const homeAdjustment = isHome ? 0.15 : 0;

  const projectedRuns =
    LEAGUE_AVERAGE_RUNS +
    offenseAdjustment +
    recentFormAdjustment +
    pitcherAdjustment +
    bullpenAdjustment +
    homeAdjustment;

  return roundToOne(
    clamp(
      projectedRuns,
      MIN_PROJECTED_RUNS,
      MAX_PROJECTED_RUNS,
    ),
  );
}

function calculateSimulationProbability({
  projectedAwayRuns,
  projectedHomeRuns,
}: {
  projectedAwayRuns: number;
  projectedHomeRuns: number;
}): {
  away: number;
  home: number;
} {
  const runDifference =
    projectedAwayRuns - projectedHomeRuns;

  const awayProbability =
    100 / (1 + Math.exp(-runDifference * 0.72));

  const away = roundToOne(
    clamp(awayProbability, 5, 95),
  );

  return {
    away,
    home: roundToOne(100 - away),
  };
}

function normalizeScore(score: number): number {
  return (clamp(score, 0, 100) - 50) / 50;
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, value));
}

function roundToOne(value: number): number {
  return Number(value.toFixed(1));
}