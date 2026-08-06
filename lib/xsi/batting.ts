import type { TeamBattingStats } from "../api/batting";

export type BattingScoreResult = {
  score: number;
  grade: string;
  reasons: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculateBattingScore(
  stats: TeamBattingStats | null,
): BattingScoreResult {
  if (!stats) {
    return {
      score: 50,
      grade: "資料不足",
      reasons: [],
    };
  }

  let score = 50;

  score += (stats.avg - 0.25) * 200;
  score += (stats.ops - 0.72) * 100;
  score += (stats.homeRuns - 120) * 0.08;
  score += (stats.runs - 500) * 0.03;

  const finalScore = Math.round(clamp(score));

  let grade = "普通";

  if (finalScore >= 85) grade = "頂級";
  else if (finalScore >= 75) grade = "優秀";
  else if (finalScore >= 65) grade = "良好";
  else if (finalScore < 50) grade = "偏弱";

  return {
    score: finalScore,
    grade,
    reasons: [
      `AVG ${stats.avg}`,
      `OPS ${stats.ops}`,
    ],
  };
}