import type {
  GameRecommendation,
  TeamSide,
} from "@/types/game";


type Input = {
  awayWinProbability: number;
  homeWinProbability: number;
  awayMoneyline?: number | null;
  homeMoneyline?: number | null;
};


export type ValueBet = {
  side: TeamSide;
  probability: number;
  impliedProbability: number;
  edge: number;
  expectedValue: number;
  kellyFraction: number;
};


export type ValueAnalysis = {
  away: ValueBet | null;
  home: ValueBet | null;
  bestBet: ValueBet | null;
};


export function calculateValue(
  input: Input,
): ValueAnalysis {

  const {
    awayWinProbability,
    homeWinProbability,
    awayMoneyline,
    homeMoneyline,
  } = input;


  const away = calculateSide(
    "away",
    awayWinProbability,
    awayMoneyline,
  );


  const home = calculateSide(
    "home",
    homeWinProbability,
    homeMoneyline,
  );


  const candidates = [
    away,
    home,
  ]
    .filter(Boolean)
    .sort(
      (a, b) =>
        b!.edge - a!.edge,
    );


  return {
    away,
    home,
    bestBet:
      candidates[0] ?? null,
  };
}



export function applyValueRecommendation(
  recommendation: GameRecommendation,
  value: ValueAnalysis,
): GameRecommendation {

  if (!value.bestBet) {
    return recommendation;
  }


  return {
    ...recommendation,

    reasons: [
      ...recommendation.reasons,
      `Value Edge ${value.bestBet.edge.toFixed(2)}%`,
      `Expected Value ${value.bestBet.expectedValue.toFixed(2)}%`,
      `Kelly ${(value.bestBet.kellyFraction * 100).toFixed(1)}%`,
    ],
  };
}



function calculateSide(
  side: TeamSide,
  probability: number,
  moneyline?: number | null,
): ValueBet | null {


  if (moneyline == null) {
    return null;
  }


  const implied =
    impliedProbability(moneyline);


  const edge =
    probability - implied;


  const decimalOdds =
    americanToDecimal(moneyline);


  const expectedValue =
    probability / 100 *
      decimalOdds -
    1;


  const kelly =
    (
      (decimalOdds - 1) *
        (probability / 100) -
      (1 - probability / 100)
    ) /
    (decimalOdds - 1);



  return {

    side,

    probability,

    impliedProbability:
      round(implied),

    edge:
      round(edge),

    expectedValue:
      round(expectedValue * 100),

    kellyFraction:
      Math.max(
        0,
        round(kelly),
      ),
  };
}



function impliedProbability(
  american: number,
) {

  if (american > 0) {

    return (
      100 /
      (american + 100)
    ) * 100;

  }


  return (
    Math.abs(american) /
    (Math.abs(american) + 100)
  ) * 100;

}



function americanToDecimal(
  american: number,
) {

  if (american > 0) {

    return (
      american / 100 + 1
    );

  }


  return (
    100 /
    Math.abs(american) + 1
  );

}



function round(
  value: number,
) {

  return Number(
    value.toFixed(2),
  );

}