import type { MlbMarketData } from "../api/market";

export type MarketSideScore = {
  score: number;
  grade: string;
  reasons: string[];
};

export type MarketScoreResult = {
  away: MarketSideScore;
  home: MarketSideScore;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function americanOddsToProbability(
  odds: number | null,
): number | null {
  if (odds === null || odds === 0) {
    return null;
  }

  if (odds < 0) {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }

  return 100 / (odds + 100);
}

function getGrade(score: number): string {
  if (score >= 80) return "市場強勢";
  if (score >= 68) return "偏強";
  if (score >= 55) return "略有支持";
  if (score >= 45) return "中立";
  if (score >= 32) return "偏弱";

  return "市場弱勢";
}

function neutralScore(): MarketSideScore {
  return {
    score: 50,
    grade: "資料不足",
    reasons: ["目前沒有可用的盤口資料"],
  };
}

export function calculateMarketScore(
  market: MlbMarketData | null,
): MarketScoreResult {
  if (!market) {
    return {
      away: neutralScore(),
      home: neutralScore(),
    };
  }

  let awayScore = 50;
  let homeScore = 50;

  const awayReasons: string[] = [];
  const homeReasons: string[] = [];

  const awayProbability = americanOddsToProbability(
    market.consensus.awayMoneyline,
  );

  const homeProbability = americanOddsToProbability(
    market.consensus.homeMoneyline,
  );

  if (
    awayProbability !== null &&
    homeProbability !== null
  ) {
    const totalProbability =
      awayProbability + homeProbability;

    const normalizedAway =
      awayProbability / totalProbability;

    const normalizedHome =
      homeProbability / totalProbability;

    awayScore += (normalizedAway - 0.5) * 40;
    homeScore += (normalizedHome - 0.5) * 40;

    if (normalizedAway >= 0.6) {
      awayReasons.push("市場 Moneyline 明顯支持客隊");
    } else if (normalizedAway >= 0.54) {
      awayReasons.push("市場 Moneyline 略偏客隊");
    }

    if (normalizedHome >= 0.6) {
      homeReasons.push("市場 Moneyline 明顯支持主隊");
    } else if (normalizedHome >= 0.54) {
      homeReasons.push("市場 Moneyline 略偏主隊");
    }
  }

  if (
    market.consensus.awaySpread !== null &&
    market.consensus.homeSpread !== null
  ) {
    if (market.consensus.awaySpread < 0) {
      awayScore += 8;
      awayReasons.push(
        `客隊平均讓分 ${market.consensus.awaySpread}`,
      );
    }

    if (market.consensus.homeSpread < 0) {
      homeScore += 8;
      homeReasons.push(
        `主隊平均讓分 ${market.consensus.homeSpread}`,
      );
    }

    if (market.consensus.awaySpread > 0) {
      awayScore -= 4;
    }

    if (market.consensus.homeSpread > 0) {
      homeScore -= 4;
    }
  }

  const bookmakerCount = market.bookmakers.length;

  if (bookmakerCount >= 8) {
    awayReasons.push(`盤口來源共 ${bookmakerCount} 家`);
    homeReasons.push(`盤口來源共 ${bookmakerCount} 家`);
  }

  awayScore = Number(clamp(awayScore).toFixed(1));
  homeScore = Number(clamp(homeScore).toFixed(1));

  return {
    away: {
      score: awayScore,
      grade: getGrade(awayScore),
      reasons:
        awayReasons.length > 0
          ? awayReasons.slice(0, 3)
          : ["市場暫無明顯方向"],
    },

    home: {
      score: homeScore,
      grade: getGrade(homeScore),
      reasons:
        homeReasons.length > 0
          ? homeReasons.slice(0, 3)
          : ["市場暫無明顯方向"],
    },
  };
}