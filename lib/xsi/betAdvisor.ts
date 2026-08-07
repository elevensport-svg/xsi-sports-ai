export type BetType =
  | "Moneyline"
  | "Run Line"
  | "Run Line +1.5";

export type BetAdvisorResult = {
  recommendation: BetType;
  confidence: number;
  score: number;

  reasons: string[];
  risk: string;
};


type BetAdvisorInput = {
  pitch: number;
  batting: number;
  bullpen: number;
  form: number;
  market: number;

  spread?: number | null;
};


function clamp(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(100, value),
  );
}


function getRisk(
  confidence: number,
): string {
  if (confidence >= 85) {
    return "低風險";
  }

  if (confidence >= 70) {
    return "中等風險";
  }

  return "高風險";
}


export function calculateBetAdvisor(
  input: BetAdvisorInput,
): BetAdvisorResult {

  const score =
    input.pitch * 0.25 +
    input.batting * 0.2 +
    input.bullpen * 0.25 +
    input.form * 0.15 +
    input.market * 0.15;


  const finalScore = Math.round(
    clamp(score),
  );


  const reasons: string[] = [];


  if (input.pitch >= 80) {
    reasons.push(
      "先發投手優勢明顯",
    );
  }


  if (input.bullpen >= 80) {
    reasons.push(
      "牛棚戰力較佳",
    );
  }


  if (input.batting >= 80) {
    reasons.push(
      "近期打線火力較強",
    );
  }


  if (input.market >= 80) {
    reasons.push(
      "市場盤口支持",
    );
  }


  if (reasons.length === 0) {
    reasons.push(
      "目前沒有單一明顯優勢",
    );
  }


  let recommendation: BetType =
    "Moneyline";


  if (
    input.spread !== null &&
    input.spread !== undefined
  ) {

    if (finalScore >= 85) {
      recommendation =
        "Run Line";
    }

    if (finalScore < 70) {
      recommendation =
        "Run Line +1.5";
    }

  }


  return {
    recommendation,
    confidence: finalScore,
    score: finalScore,
    reasons,
    risk: getRisk(finalScore),
  };
}