import type { PitcherSeasonStats } from "../api/pitcher";

export type PitcherScoreResult = {
  score: number;
  grade: string;
  reasons: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: string | number | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculatePitcherScore(
  stats: PitcherSeasonStats | null,
): PitcherScoreResult {
  if (!stats) {
    return {
      score: 50,
      grade: "資料不足",
      reasons: ["目前沒有足夠的本季投手數據"],
    };
  }

  const era = safeNumber(stats.era);
  const whip = safeNumber(stats.whip);
  const innings = safeNumber(stats.inningsPitched);

  let score = 50;
  const reasons: string[] = [];

  // ERA：最高 30 分
  if (era !== null) {
    const eraScore = clamp(100 - (era - 2) * 18);
    score += (eraScore - 50) * 0.3;

    if (era <= 3) {
      reasons.push("ERA 表現優秀");
    } else if (era >= 5) {
      reasons.push("ERA 偏高");
    }
  }

  // WHIP：最高 25 分
  if (whip !== null) {
    const whipScore = clamp(100 - (whip - 1) * 85);
    score += (whipScore - 50) * 0.25;

    if (whip <= 1.15) {
      reasons.push("WHIP 控制出色");
    } else if (whip >= 1.45) {
      reasons.push("WHIP 偏高");
    }
  }

  // K/BB：最高 20 分
  const strikeouts = stats.strikeOuts;
  const walks = Math.max(stats.walks, 1);
  const strikeoutWalkRatio = strikeouts / walks;
  const ratioScore = clamp(strikeoutWalkRatio * 20);

  score += (ratioScore - 50) * 0.2;

  if (strikeoutWalkRatio >= 4) {
    reasons.push("三振保送比優秀");
  } else if (strikeoutWalkRatio < 2) {
    reasons.push("三振保送比偏低");
  }

  // 投球局數：最高 15 分
  if (innings !== null) {
    const inningsScore = clamp((innings / 140) * 100);
    score += (inningsScore - 50) * 0.15;

    if (innings >= 120) {
      reasons.push("本季投球樣本充足");
    }
  }

  // 勝敗：最高 10 分
  const totalDecisions = stats.wins + stats.losses;
  if (totalDecisions > 0) {
    const winRate = stats.wins / totalDecisions;
    const winScore = clamp(winRate * 100);

    score += (winScore - 50) * 0.1;
  }

  const finalScore = Math.round(clamp(score));

  let grade = "普通";

  if (finalScore >= 90) grade = "頂級";
  else if (finalScore >= 80) grade = "優秀";
  else if (finalScore >= 70) grade = "良好";
  else if (finalScore >= 60) grade = "尚可";
  else if (finalScore < 50) grade = "偏弱";

  return {
    score: finalScore,
    grade,
    reasons: reasons.slice(0, 3),
  };
}