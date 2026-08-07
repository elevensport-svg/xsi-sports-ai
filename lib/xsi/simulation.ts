import type {
  TeamGameAnalysis,
  TeamSide,
} from "@/types/game";

export type SimulationResult = {
  simulations: number;
  awayWins: number;
  homeWins: number;
  awayWinRate: number;
  homeWinRate: number;
  averageAwayRuns: number;
  averageHomeRuns: number;
  averageTotalRuns: number;
  mostLikelyWinner: TeamSide;
};

type Input = {
  away: TeamGameAnalysis;
  home: TeamGameAnalysis;
  iterations?: number;
};

const DEFAULT_ITERATIONS = 10000;

export function runSimulation({
  away,
  home,
  iterations = DEFAULT_ITERATIONS,
}: Input): SimulationResult {
  let awayWins = 0;
  let homeWins = 0;

  let awayRunsTotal = 0;
  let homeRunsTotal = 0;

  const awayMean = expectedRuns(
    away.batting.score,
    home.pitcher.score,
    home.bullpen.score,
    away.recentForm.score,
  );

  const homeMean = expectedRuns(
    home.batting.score,
    away.pitcher.score,
    away.bullpen.score,
    home.recentForm.score,
  );

  for (let i = 0; i < iterations; i++) {
    const awayRuns = sampleRuns(awayMean);
    const homeRuns = sampleRuns(homeMean);

    awayRunsTotal += awayRuns;
    homeRunsTotal += homeRuns;

    if (awayRuns > homeRuns) {
      awayWins++;
    } else if (homeRuns > awayRuns) {
      homeWins++;
    } else {
      if (Math.random() > 0.5) {
        awayWins++;
      } else {
        homeWins++;
      }
    }
  }

  const awayWinRate = percentage(
    awayWins,
    iterations,
  );

  const homeWinRate = percentage(
    homeWins,
    iterations,
  );

  const averageAwayRuns = round(
    awayRunsTotal / iterations,
  );

  const averageHomeRuns = round(
    homeRunsTotal / iterations,
  );

  return {
    simulations: iterations,

    awayWins,

    homeWins,

    awayWinRate,

    homeWinRate,

    averageAwayRuns,

    averageHomeRuns,

    averageTotalRuns: round(
      averageAwayRuns + averageHomeRuns,
    ),

    mostLikelyWinner:
      awayWinRate >= homeWinRate
        ? "away"
        : "home",
  };
}

function expectedRuns(
  batting: number,
  pitcher: number,
  bullpen: number,
  form: number,
) {
  return (
    4.4 +
    (batting - 50) * 0.035 +
    (50 - pitcher) * 0.025 +
    (50 - bullpen) * 0.02 +
    (form - 50) * 0.015
  );
}

function sampleRuns(mean: number) {
  const random =
    gaussian() * 1.35 + mean;

  return Math.max(
    0,
    Math.round(random),
  );
}

function gaussian() {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  return Math.sqrt(-2 * Math.log(u)) *
    Math.cos(2 * Math.PI * v);
}

function percentage(
  value: number,
  total: number,
) {
  return round((value / total) * 100);
}

function round(value: number) {
  return Number(value.toFixed(1));
}