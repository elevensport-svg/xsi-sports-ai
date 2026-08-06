import type { TeamFormStats } from "../api/teamForm";

export type FormScoreResult = {
  score: number;
  grade: string;
  reasons: string[];
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateFormScore(
  stats: TeamFormStats | null,
): FormScoreResult {
  if (!stats || stats.gamesCount === 0) {
    return {
      score: 50,
      grade: "資料不足",
      reasons: ["目前沒有足夠的近期賽事資料"],
    };
  }

  let score = 50;
  const reasons: string[] = [];

  // 最近十場勝率：60%
  score += (stats.winRate - 50) * 0.6;

  // 得失分差：30%
  const averageRunDifference =
    stats.runDifference / stats.gamesCount;

  score += clamp(averageRunDifference * 6, -20, 20);

  // 連勝或連敗：10%
  if (stats.streak.startsWith("W")) {
    const streakCount = Number(stats.streak.slice(1)) || 0;

    score += Math.min(streakCount * 2, 10);

    if (streakCount >= 3) {
      reasons.push(`目前 ${streakCount} 連勝`);
    }
  }

  if (stats.streak.startsWith("L")) {
    const streakCount = Number(stats.streak.slice(1)) || 0;

    score -= Math.min(streakCount * 2, 10);

    if (streakCount >= 3) {
      reasons.push(`目前 ${streakCount} 連敗`);
    }
  }

  if (stats.winRate >= 70) {
    reasons.push("近十場勝率出色");
  } else if (stats.winRate <= 30) {
    reasons.push("近十場勝率偏低");
  }

  if (averageRunDifference >= 1.5) {
    reasons.push("近期平均得失分差明顯領先");
  } else if (averageRunDifference <= -1.5) {
    reasons.push("近期平均失分高於得分");
  }

  const finalScore = Math.round(clamp(score));

  let grade = "普通";

  if (finalScore >= 85) grade = "火熱";
  else if (finalScore >= 75) grade = "良好";
  else if (finalScore >= 60) grade = "尚可";
  else if (finalScore < 45) grade = "低迷";

  return {
    score: finalScore,
    grade,
    reasons: reasons.slice(0, 3),
  };
}