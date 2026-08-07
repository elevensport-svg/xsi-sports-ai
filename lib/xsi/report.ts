import type {
  AnalysisFactor,
  GameRecommendation,
  GamePrediction,
  TeamGameAnalysis,
} from "@/types/game";


type ReportInput = {
  away: TeamGameAnalysis;
  home: TeamGameAnalysis;
  prediction: GamePrediction;
  recommendation: GameRecommendation;
  factors: AnalysisFactor[];
};


export type AIReport = {
  headline: string;
  summary: string;
  matchup: string;
  pitching: string;
  batting: string;
  bullpen: string;
  recentForm: string;
  prediction: string;
  recommendation: string;
  confidence: string;
  risk: string;
  factors: string[];
};



export function generateAIReport(
  {
    away,
    home,
    prediction,
    recommendation,
    factors,
  }: ReportInput,
): AIReport {

  return {

    headline:
      buildHeadline(
        recommendation,
      ),

    summary:
      buildSummary(
        recommendation,
        prediction,
      ),

    matchup:
      buildMatchup(
        away,
        home,
      ),

    pitching:
      comparePitching(
        away,
        home,
      ),

    batting:
      compareBatting(
        away,
        home,
      ),

    bullpen:
      compareBullpen(
        away,
        home,
      ),

    recentForm:
      compareRecent(
        away,
        home,
      ),

    prediction:
      buildPrediction(
        recommendation,
        prediction,
      ),

    recommendation:
      buildRecommendation(
        recommendation,
      ),

    confidence:
      buildConfidence(
        recommendation,
      ),

    risk:
      buildRisk(
        recommendation,
      ),

    factors:
      factors.map(
        (factor) =>
          `${factor.title}：${factor.description}`,
      ),
  };
}



function buildHeadline(
  recommendation: GameRecommendation,
) {

  if (!recommendation.teamName) {
    return "AI 認為本場沒有明顯投注優勢";
  }

  return `AI 看好 ${recommendation.teamName}`;
}



function buildSummary(
  recommendation: GameRecommendation,
  prediction: GamePrediction,
) {

  if (!recommendation.teamName) {
    return "雙方整體評分接近，目前建議觀望。";
  }

  return `${recommendation.teamName} 擁有較高的綜合評分，AI 預估勝率 ${Math.max(
    prediction.winProbabilityAway,
    prediction.winProbabilityHome,
  ).toFixed(1)}%，屬於 ${recommendation.type.toUpperCase()} 等級。`;
}



function buildMatchup(
  away: TeamGameAnalysis,
  home: TeamGameAnalysis,
) {

  return `${away.team.name} 對上 ${home.team.name}，雙方投打實力皆納入 XSI Engine 評估，包含先發、牛棚、打線與近期狀態。`;

}



function comparePitching(
  away: TeamGameAnalysis,
  home: TeamGameAnalysis,
) {

  if (
    away.pitcher.score ===
    home.pitcher.score
  ) {
    return "雙方先發投手評分接近。";
  }


  const winner =
    away.pitcher.score >
    home.pitcher.score
      ? away.team.name
      : home.team.name;


  const diff =
    Math.abs(
      away.pitcher.score -
      home.pitcher.score,
    ).toFixed(1);


  return `${winner} 在先發投手模組領先 ${diff} 分。`;

}



function compareBatting(
  away: TeamGameAnalysis,
  home: TeamGameAnalysis,
) {

  if (
    away.batting.score ===
    home.batting.score
  ) {
    return "雙方打線火力相近。";
  }


  const winner =
    away.batting.score >
    home.batting.score
      ? away.team.name
      : home.team.name;


  return `${winner} 打線近期攻擊指數較佳。`;

}



function compareBullpen(
  away: TeamGameAnalysis,
  home: TeamGameAnalysis,
) {

  if (
    away.bullpen.score ===
    home.bullpen.score
  ) {
    return "牛棚戰力接近。";
  }


  const winner =
    away.bullpen.score >
    home.bullpen.score
      ? away.team.name
      : home.team.name;


  return `${winner} 牛棚穩定性較高。`;

}



function compareRecent(
  away: TeamGameAnalysis,
  home: TeamGameAnalysis,
) {

  if (
    away.recentForm.score ===
    home.recentForm.score
  ) {
    return "近期狀態沒有明顯差距。";
  }


  const winner =
    away.recentForm.score >
    home.recentForm.score
      ? away.team.name
      : home.team.name;


  return `${winner} 最近十場比賽狀態較佳。`;

}



function buildPrediction(
  recommendation: GameRecommendation,
  prediction: GamePrediction,
) {

  if (!recommendation.teamName) {
    return "AI 無法建立明顯優勢。";
  }


  return `預估比分 ${prediction.projectedAwayRuns?.toFixed(
    1,
  )} : ${prediction.projectedHomeRuns?.toFixed(
    1,
  )}，總分 ${prediction.projectedTotalRuns?.toFixed(
    1,
  )}。`;

}



function buildRecommendation(
  recommendation: GameRecommendation,
) {

  switch (
    recommendation.type
  ) {

    case "strong":
      return "建議可作為主要投注方向。";

    case "lean":
      return "具有投注價值，可視賠率決定是否進場。";

    case "pass":
      return "優勢有限，建議保守。";

    default:
      return "建議避免投注。";
  }

}



function buildConfidence(
  recommendation: GameRecommendation,
) {

  return `AI 信心 ${recommendation.confidenceScore}% (${recommendation.confidence})`;

}



function buildRisk(
  recommendation: GameRecommendation,
) {

  switch (
    recommendation.risk
  ) {

    case "low":
      return "風險偏低。";

    case "medium":
      return "風險中等。";

    default:
      return "風險較高，請控制投注金額。";
  }

}