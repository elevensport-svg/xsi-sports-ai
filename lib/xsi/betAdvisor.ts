export type BetType =
  | "獨贏"
  | "讓分"
  | "受讓 +1.5";

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
  /* =========================
     綜合模型分數
  ========================= */

  const score =
    input.pitch * 0.25 +
    input.batting * 0.2 +
    input.bullpen * 0.25 +
    input.form * 0.15 +
    input.market * 0.15;

  const finalScore =
    Math.round(
      clamp(score),
    );

  /* =========================
     判斷依據
  ========================= */

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

  if (input.form >= 75) {
    reasons.push(
      "近期球隊狀態良好",
    );
  }

  if (input.market >= 80) {
    reasons.push(
      "市場盤口支持",
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "整體數據較為接近",
    );
  }

  /* =========================
     投注方向
  ========================= */

  let recommendation: BetType =
    "獨贏";

  const spread =
    input.spread;

  if (
    spread !== null &&
    spread !== undefined
  ) {
    /*
     * 強勢方 + 讓分盤
     */
    if (
      spread <= -1 &&
      finalScore >= 80
    ) {
      recommendation =
        "讓分";

      reasons.push(
        "模型優勢足以支持讓分方向",
      );
    }

    /*
     * 弱勢方 + 受讓盤
     */
    else if (
      spread >= 1 &&
      finalScore >= 60 &&
      finalScore < 72
    ) {
      recommendation =
        "受讓 +1.5";

      reasons.push(
        "模型優勢不足但受讓具保護空間",
      );
    }

    /*
     * 其他情況
     */
    else {
      recommendation =
        "獨贏";
    }
  }

  return {
    recommendation,
    confidence:
      finalScore,
    score:
      finalScore,
    reasons,
    risk:
      getRisk(
        finalScore,
      ),
  };
}