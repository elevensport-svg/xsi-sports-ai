import type { BullpenStats } from "../api/bullpen";

export type BullpenScoreResult = {
  score: number;
  grade: string;
  reasons: string[];
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function getGrade(score: number): string {
  if (score >= 85) return "頂級";
  if (score >= 75) return "優秀";
  if (score >= 65) return "良好";
  if (score >= 50) return "普通";
  if (score >= 40) return "偏弱";

  return "低迷";
}

export function calculateBullpenScore(
  stats: BullpenStats | null,
): BullpenScoreResult {
  if (!stats || stats.inningsPitched <= 0) {
    return {
      score: 50,
      grade: "資料不足",
      reasons: ["目前沒有足夠的牛棚數據"],
    };
  }

  let score = 50;
  const reasons: string[] = [];

  if (stats.era <= 3.2) {
    score += 20;
    reasons.push("牛棚 ERA 表現出色");
  } else if (stats.era <= 3.8) {
    score += 12;
    reasons.push("牛棚 ERA 優於平均");
  } else if (stats.era <= 4.3) {
    score += 4;
  } else if (stats.era >= 5) {
    score -= 18;
    reasons.push("牛棚 ERA 偏高");
  } else {
    score -= 8;
  }

  if (stats.whip <= 1.18) {
    score += 15;
    reasons.push("牛棚 WHIP 控制出色");
  } else if (stats.whip <= 1.3) {
    score += 8;
  } else if (stats.whip >= 1.45) {
    score -= 12;
    reasons.push("牛棚 WHIP 偏高");
  } else {
    score -= 4;
  }

  const saveOpportunities =
    stats.saves + stats.blownSaves;

  if (saveOpportunities > 0) {
    const saveRate =
      stats.saves / saveOpportunities;

    score += (saveRate - 0.65) * 35;

    if (saveRate >= 0.8) {
      reasons.push("救援成功率穩定");
    } else if (saveRate < 0.6) {
      reasons.push("救援失敗比例偏高");
    }
  }

  const walks = Math.max(stats.walks, 1);
  const strikeoutWalkRatio =
    stats.strikeOuts / walks;

  if (strikeoutWalkRatio >= 3.5) {
    score += 10;
    reasons.push("牛棚三振保送比優秀");
  } else if (strikeoutWalkRatio >= 2.5) {
    score += 5;
  } else if (strikeoutWalkRatio < 1.8) {
    score -= 8;
    reasons.push("牛棚三振保送比偏低");
  }

  const finalScore = Number(
    clamp(score).toFixed(1),
  );

  return {
    score: finalScore,
    grade: getGrade(finalScore),
    reasons:
      reasons.length > 0
        ? reasons.slice(0, 3)
        : ["牛棚整體表現接近聯盟平均"],
  };
}