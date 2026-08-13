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

  valueDog:
    boolean;
};

type BetAdvisorInput = {
  pitch: number;
  batting: number;
  bullpen: number;
  form: number;
  market: number;

  spread?:
    | number
    | null;

  /*
   * 新增：
   * XSI Value Dog 判斷資料
   */
  selectedSide?:
    | "away"
    | "home";

  moneyline?:
    | number
    | null;

  xsi?:
    | number
    | null;

  opponentXsi?:
    | number
    | null;
};

function clamp(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      value,
    ),
  );
}

function getRisk(
  confidence: number,
): string {
  if (
    confidence >= 85
  ) {
    return "低風險";
  }

  if (
    confidence >= 70
  ) {
    return "中等風險";
  }

  return "高風險";
}

/* ==========================================
   XSI Value Dog

   歷史驗證核心條件：

   1. 客隊
   2. Run Line 為正盤
   3. Moneyline >= +100
   4. XSI 高於對手

   不使用 EV 決定選隊。
========================================== */

function isXsiValueDog(
  input:
    BetAdvisorInput,
) {
  const spread =
    input.spread;

  const moneyline =
    input.moneyline;

  const xsi =
    input.xsi;

  const opponentXsi =
    input.opponentXsi;

  if (
    input.selectedSide !==
    "away"
  ) {
    return false;
  }

  if (
    spread === null ||
    spread === undefined ||
    spread <= 0
  ) {
    return false;
  }

  if (
    moneyline === null ||
    moneyline === undefined ||
    moneyline < 100
  ) {
    return false;
  }

  if (
    xsi === null ||
    xsi === undefined ||
    opponentXsi === null ||
    opponentXsi === undefined
  ) {
    return false;
  }

  return (
    xsi >
    opponentXsi
  );
}

export function calculateBetAdvisor(
  input:
    BetAdvisorInput,
): BetAdvisorResult {
  /* =========================
     綜合模型分數
  ========================= */

  const score =
    input.pitch *
      0.25 +
    input.batting *
      0.2 +
    input.bullpen *
      0.25 +
    input.form *
      0.15 +
    input.market *
      0.15;

  const finalScore =
    Math.round(
      clamp(
        score,
      ),
    );

  /* =========================
     判斷依據
  ========================= */

  const reasons:
    string[] = [];

  if (
    input.pitch >= 80
  ) {
    reasons.push(
      "先發投手優勢明顯",
    );
  }

  if (
    input.bullpen >=
    80
  ) {
    reasons.push(
      "牛棚戰力較佳",
    );
  }

  if (
    input.batting >=
    80
  ) {
    reasons.push(
      "近期打線火力較強",
    );
  }

  if (
    input.form >= 75
  ) {
    reasons.push(
      "近期球隊狀態良好",
    );
  }

  if (
    input.market >= 80
  ) {
    reasons.push(
      "市場盤口支持",
    );
  }

  /* =========================
     XSI Value Dog
  ========================= */

  const valueDog =
    isXsiValueDog(
      input,
    );

  /* =========================
     投注方向
  ========================= */

  let recommendation:
    BetType =
      "獨贏";

  const spread =
    input.spread;

  /*
   * ======================================
   * 第一優先：
   * XSI Value Dog
   *
   * 市場認為客隊是 Underdog，
   * 但 XSI 模型反而看好客隊。
   *
   * 使用 +1.5 保護。
   * ======================================
   */

  if (
    valueDog
  ) {
    recommendation =
      "受讓 +1.5";

    reasons.push(
      "市場將客隊列為受讓方，但 XSI 評分高於對手，符合 XSI Value Dog 條件",
    );

    reasons.push(
      "客隊 Moneyline 為正賠且取得 +1.5 保護，優先採用受讓方向",
    );
  }

  /*
   * ======================================
   * 非 Value Dog
   * 才使用原本投注判斷
   * ======================================
   */

  else if (
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
     * 一般受讓
     */

    else if (
      spread >= 1 &&
      finalScore >= 60 &&
      finalScore < 72
    ) {
      recommendation =
        "受讓 +1.5";

      reasons.push(
        "模型具一定支持且受讓盤提供 +1.5 保護",
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

  if (
    reasons.length ===
    0
  ) {
    reasons.push(
      "整體數據較為接近",
    );
  }

  /*
   * Value Dog 不直接寫成歷史 76.8%。
   *
   * 回測命中率不是未來保證，
   * 因此只小幅提高模型信心。
   */

  const confidence =
    valueDog
      ? Math.round(
          clamp(
            finalScore +
              5,
          ),
        )
      : finalScore;

  return {
    recommendation,

    confidence,

    score:
      finalScore,

    reasons,

    risk:
      getRisk(
        confidence,
      ),

    valueDog,
  };
}