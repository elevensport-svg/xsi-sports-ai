export type WinProbabilityInput = {
  pitch: number;
  batting: number;
  bullpen: number;
  form: number;
  market: number;
  h2h: number;
};

export type WinProbabilityResult = {
  awayWinProbability: number;
  homeWinProbability: number;
};

const WEIGHTS = {
  pitch: 0.25,
  batting: 0.20,
  bullpen: 0.15,
  form: 0.15,
  market: 0.15,
  h2h: 0.10,
};

function weightedScore(input: WinProbabilityInput) {
  return (
    input.pitch * WEIGHTS.pitch +
    input.batting * WEIGHTS.batting +
    input.bullpen * WEIGHTS.bullpen +
    input.form * WEIGHTS.form +
    input.market * WEIGHTS.market +
    input.h2h * WEIGHTS.h2h
  );
}

function logistic(x: number) {
  return 1 / (1 + Math.exp(-x / 8));
}

export function calculateWinProbability(
  away: WinProbabilityInput,
  home: WinProbabilityInput,
): WinProbabilityResult {
  const awayScore = weightedScore(away);
  const homeScore = weightedScore(home);

  const diff = awayScore - homeScore;

  const awayWin = logistic(diff);
  const homeWin = 1 - awayWin;

  return {
    awayWinProbability: Number((awayWin * 100).toFixed(1)),
    homeWinProbability: Number((homeWin * 100).toFixed(1)),
  };
}