import type {
  GameAnalysis,
  GameAnalysisResult,
} from "@/types/game";

import {
  calculateGamePrediction,
} from "@/lib/xsi/predict";

import {
  generateAIReport,
} from "@/lib/xsi/report";

import {
  runSimulation,
} from "@/lib/xsi/simulation";

import {
  calculateValue,
  applyValueRecommendation,
} from "@/lib/xsi/value";


export async function getGameAnalysis(
  input: GameAnalysis,
): Promise<GameAnalysisResult> {
  try {
    const prediction =
      calculateGamePrediction(input);


    const simulation =
      runSimulation(input);


    const valueScore =
      calculateValue({
        awayWinProbability:
          prediction.winProbabilityAway,

        homeWinProbability:
          prediction.winProbabilityHome,

        awayMoneyline:
          input.away.market.odds?.moneyline ?? null,

        homeMoneyline:
          input.home.market.odds?.moneyline ?? null,
      });


    const recommendation =
      applyValueRecommendation(
        input.recommendation,
        valueScore,
      );


    const report =
      generateAIReport({
        away: input.away,
        home: input.home,
        prediction,
        recommendation,
        factors: input.factors,
      });


    return {
      success: true,
      error: null,

      data: {
        ...input,

        prediction,

        recommendation,

        generatedAt:
          new Date().toISOString(),
      },
    };

  } catch (error) {

    return {
      success: false,

      data: null,

      error: {
        code: "ANALYSIS_ERROR",

        message:
          error instanceof Error
            ? error.message
            : "Unknown analysis error",
      },
    };
  }
}