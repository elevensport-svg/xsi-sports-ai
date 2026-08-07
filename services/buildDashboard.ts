import type {
  GameAnalysisResult,
} from "@/types/game";

import {
  getGameAnalysis,
} from "./getGameAnalysis";


export async function buildDashboard(
  input: any,
): Promise<GameAnalysisResult> {

  try {

    const result =
      await getGameAnalysis(input);


    if (!result.success) {
      return result;
    }


    return {
      success: true,

      data: result.data,

      error: null,
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
            : "Dashboard build failed",
      },
    };
  }
}