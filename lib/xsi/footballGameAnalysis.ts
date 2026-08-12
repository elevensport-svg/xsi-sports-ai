import type {
  FootballGame,
} from "../api/football";

import {
  getFootballGameFormData,
} from "../services/footballFormService";

type FootballRecommendationType =
  | "主勝"
  | "和局"
  | "客勝"
  | "主隊讓球"
  | "客隊讓球"
  | "主隊受讓"
  | "客隊受讓";

type Candidate = {
  type: FootballRecommendationType;

  text: string;

  score: number;

  reasons: string[];
};

type ThreeWayProbability = {
  home: number;
  draw: number;
  away: number;
};

export type FootballGameAnalysis = {
  game: FootballGame;

  recommendation: {
    type: FootballRecommendationType;

    text: string;

    confidence: number;

    risk:
      | "低風險"
      | "中等風險"
      | "高風險";

    reasons: string[];
  };

  probabilities: {
    home: number;
    draw: number;
    away: number;
  };

  market: {
    homeWinOdds:
      number | null;

    drawOdds:
      number | null;

    awayWinOdds:
      number | null;

    homeSpread:
      number | null;

    awaySpread:
      number | null;

    totalPoint:
      number | null;
  };

  form: {
    home: {
      score: number;

      wins: number;

      draws: number;

      losses: number;

      averageGoalsFor: number;

      averageGoalsAgainst: number;
    };

    away: {
      score: number;

      wins: number;

      draws: number;

      losses: number;

      averageGoalsFor: number;

      averageGoalsAgainst: number;
    };
  };
};

/* ==========================================
   Odds → 隱含機率
========================================== */

function impliedProbability(
  odds:
    | number
    | null,
) {
  if (
    !odds ||
    odds <= 1
  ) {
    return 0;
  }

  return 1 / odds;
}

/* ==========================================
   去水市場機率
========================================== */

function normalizeThreeWayProbabilities({
  homeOdds,
  drawOdds,
  awayOdds,
}: {
  homeOdds:
    | number
    | null;

  drawOdds:
    | number
    | null;

  awayOdds:
    | number
    | null;
}): ThreeWayProbability {
  const home =
    impliedProbability(
      homeOdds,
    );

  const draw =
    impliedProbability(
      drawOdds,
    );

  const away =
    impliedProbability(
      awayOdds,
    );

  const total =
    home +
    draw +
    away;

  if (
    total <= 0
  ) {
    return {
      home: 33.3,
      draw: 33.4,
      away: 33.3,
    };
  }

  return {
    home:
      Number(
        (
          home /
          total *
          100
        ).toFixed(
          1,
        ),
      ),

    draw:
      Number(
        (
          draw /
          total *
          100
        ).toFixed(
          1,
        ),
      ),

    away:
      Number(
        (
          away /
          total *
          100
        ).toFixed(
          1,
        ),
      ),
  };
}

/* ==========================================
   Normalize 三項機率
========================================== */

function normalizeProbabilityScores(
  home: number,
  draw: number,
  away: number,
): ThreeWayProbability {
  const safeHome =
    Math.max(
      1,
      home,
    );

  const safeDraw =
    Math.max(
      1,
      draw,
    );

  const safeAway =
    Math.max(
      1,
      away,
    );

  const total =
    safeHome +
    safeDraw +
    safeAway;

  return {
    home:
      Number(
        (
          safeHome /
          total *
          100
        ).toFixed(
          1,
        ),
      ),

    draw:
      Number(
        (
          safeDraw /
          total *
          100
        ).toFixed(
          1,
        ),
      ),

    away:
      Number(
        (
          safeAway /
          total *
          100
        ).toFixed(
          1,
        ),
      ),
  };
}

/* ==========================================
   Confidence
========================================== */

function clampConfidence(
  value: number,
) {
  return Math.max(
    52,
    Math.min(
      88,
      Math.round(
        value,
      ),
    ),
  );
}

function getRisk(
  confidence: number,
):
  | "低風險"
  | "中等風險"
  | "高風險" {
  if (
    confidence >= 80
  ) {
    return "低風險";
  }

  if (
    confidence >= 66
  ) {
    return "中等風險";
  }

  return "高風險";
}

/* ==========================================
   進攻評分
========================================== */

function calculateAttackScore(
  averageGoalsFor: number,
) {
  /*
   * 0 球   → 20
   * 1 球   → 50
   * 2 球   → 80
   * 2.5+   → 95
   */

  return Math.max(
    20,
    Math.min(
      95,
      20 +
        averageGoalsFor *
          30,
    ),
  );
}

/* ==========================================
   防守評分

   場均失球越低越好
========================================== */

function calculateDefenseScore(
  averageGoalsAgainst: number,
) {
  return Math.max(
    20,
    Math.min(
      95,
      90 -
        averageGoalsAgainst *
          30,
    ),
  );
}

/* ==========================================
   Form 差距 → 模型修正

   最大修正約 ±12
========================================== */

function calculateFormAdjustment(
  homeForm: number,
  awayForm: number,
) {
  const difference =
    homeForm -
    awayForm;

  return Math.max(
    -12,
    Math.min(
      12,
      difference *
        0.18,
    ),
  );
}

/* ==========================================
   Attack 差距
========================================== */

function calculateAttackAdjustment(
  homeAttack: number,
  awayAttack: number,
) {
  const difference =
    homeAttack -
    awayAttack;

  return Math.max(
    -8,
    Math.min(
      8,
      difference *
        0.12,
    ),
  );
}

/* ==========================================
   Defense 差距
========================================== */

function calculateDefenseAdjustment(
  homeDefense: number,
  awayDefense: number,
) {
  const difference =
    homeDefense -
    awayDefense;

  return Math.max(
    -8,
    Math.min(
      8,
      difference *
        0.12,
    ),
  );
}

/* ==========================================
   建立 XSI Probability V2

   依西甲 2025/26 回測結果：

   formWeight    = 0
   attackWeight  = 0
   defenseWeight = 0.12
   homeEdge      = 3

   Validation：
   V2 56.2%
   Market 54.3%
   V1 48.6%

   重點：
   - 市場仍是 baseline
   - Form Score 不直接拉動主/客勝
   - Attack 不直接拉動主/客勝
   - Defense 差距保留
   - 主場優勢調整為 +3
   - Form Gap 仍用於和局修正
========================================== */

function calculateXsiProbabilities({
  market,
  homeFormScore,
  awayFormScore,
  homeDefense,
  awayDefense,
  hasFormData,
}: {
  market:
    ThreeWayProbability;

  homeFormScore:
    number;

  awayFormScore:
    number;

  homeDefense:
    number;

  awayDefense:
    number;

  hasFormData:
    boolean;
}) {
  /*
   * 沒有足夠近期資料時，
   * 不使用預設 Form 去製造假訊號。
   */
  if (
    !hasFormData
  ) {
    return market;
  }

  /*
   * V2 回測最佳參數：
   *
   * Form Weight    = 0
   * Attack Weight  = 0
   * Defense Weight = 0.12
   * Home Edge      = 3
   */
  const defenseDifference =
    homeDefense -
    awayDefense;

  const defenseAdjustment =
    Math.max(
      -8,
      Math.min(
        8,
        defenseDifference *
          0.12,
      ),
    );

  const homeAdvantage =
    3;

  const totalAdjustment =
    defenseAdjustment +
    homeAdvantage;

  /*
   * 市場作為 baseline。
   *
   * V2 只有在近期防守差距
   * 足以提供訊號時才偏離市場。
   */
  let home =
    market.home +
    totalAdjustment;

  let away =
    market.away -
    totalAdjustment;

  /*
   * 和局修正沿用回測 V2：
   *
   * Form 不直接影響主 / 客勝，
   * 但雙方近期狀態越接近，
   * 和局機率仍可小幅提高。
   */
  const formGap =
    Math.abs(
      homeFormScore -
      awayFormScore,
    );

  let draw =
    market.draw;

  if (
    formGap <= 8
  ) {
    draw += 4;
  } else if (
    formGap <= 15
  ) {
    draw += 2;
  } else if (
    formGap >= 35
  ) {
    draw -= 3;
  }

  home =
    Math.max(
      8,
      home,
    );

  draw =
    Math.max(
      10,
      draw,
    );

  away =
    Math.max(
      8,
      away,
    );

  return normalizeProbabilityScores(
    home,
    draw,
    away,
  );
}
/* ==========================================
   Value Gap

   XSI Probability
   -
   Market Probability
========================================== */

function calculateValueGap(
  xsiProbability: number,
  marketProbability: number,
) {
  return (
    xsiProbability -
    marketProbability
  );
}

/* ==========================================
   受讓 Bonus
========================================== */

function getUnderdogSpreadBonus(
  spread:
    number | null,
) {
  if (
    spread ===
      null ||
    spread <= 0
  ) {
    return 0;
  }

  if (
    spread >= 1.5
  ) {
    return 12;
  }

  if (
    spread >= 1
  ) {
    return 9;
  }

  if (
    spread >= 0.5
  ) {
    return 6;
  }

  return 3;
}

/* ==========================================
   讓球 Penalty
========================================== */

function getFavoriteSpreadPenalty(
  spread:
    number | null,
) {
  if (
    spread ===
      null ||
    spread >= 0
  ) {
    return 0;
  }

  const abs =
    Math.abs(
      spread,
    );

  if (
    abs >= 2
  ) {
    return 14;
  }

  if (
    abs >= 1.5
  ) {
    return 11;
  }

  if (
    abs >= 1
  ) {
    return 7;
  }

  if (
    abs >= 0.5
  ) {
    return 4;
  }

  return 2;
}

/* ==========================================
   Candidate
========================================== */

function addCandidate(
  candidates:
    Candidate[],

  candidate:
    Candidate,
) {
  candidates.push(
    candidate,
  );
}

/* ==========================================
   MAIN
========================================== */

export async function calculateFootballGameAnalysis(
  game: FootballGame,
): Promise<FootballGameAnalysis> {
  const {
    homeWinOdds,
    drawOdds,
    awayWinOdds,

    homeSpread,
    awaySpread,
  } =
    game.consensus;

  /* ========================================
     STEP 1
     市場去水機率
  ======================================== */

  const marketProbability =
    normalizeThreeWayProbabilities({
      homeOdds:
        homeWinOdds,

      drawOdds,

      awayOdds:
        awayWinOdds,
    });

  /* ========================================
     STEP 2
     Supabase Historical Form
  ======================================== */

  const formData =
    await getFootballGameFormData(
      game.homeTeam,
      game.awayTeam,
    );

  const homeForm =
    formData.home;

  const awayForm =
    formData.away;

  const hasHomeForm =
    homeForm.matchesPlayed >=
    3;

  const hasAwayForm =
    awayForm.matchesPlayed >=
    3;

  const hasFormData =
    hasHomeForm &&
    hasAwayForm;

  /* ========================================
     STEP 3
     Attack / Defense Score
  ======================================== */

  const homeAttack =
    calculateAttackScore(
      homeForm.averageGoalsFor,
    );

  const awayAttack =
    calculateAttackScore(
      awayForm.averageGoalsFor,
    );

  const homeDefense =
    calculateDefenseScore(
      homeForm.averageGoalsAgainst,
    );

  const awayDefense =
    calculateDefenseScore(
      awayForm.averageGoalsAgainst,
    );

  /* ========================================
     STEP 4
     XSI Probability
  ======================================== */

  const probabilities =
    calculateXsiProbabilities({
      market:
        marketProbability,

      homeFormScore:
        homeForm.formScore,

      awayFormScore:
        awayForm.formScore,

      homeDefense,

      awayDefense,

      hasFormData,
    });

  /* ========================================
     STEP 5
     Value Gap
  ======================================== */

  const homeValue =
    calculateValueGap(
      probabilities.home,
      marketProbability.home,
    );

  const drawValue =
    calculateValueGap(
      probabilities.draw,
      marketProbability.draw,
    );

  const awayValue =
    calculateValueGap(
      probabilities.away,
      marketProbability.away,
    );
  const candidates:
    Candidate[] =
    [];

  /* ========================================
     主勝
  ======================================== */

  let homeWinScore =
    probabilities.home +
    homeValue *
      1.5;

  /*
   * 市場非常熱門，
   * 但 XSI 沒有同步支持時，
   * 直接降分。
   */
  if (
    marketProbability.home >=
      65 &&
    homeValue <
      0
  ) {
    homeWinScore -=
      10;
  }

  /*
   * 如果主隊其實是受讓方，
   * 主勝風險較高。
   */
  if (
    homeSpread !==
      null &&
    homeSpread >
      0
  ) {
    homeWinScore -=
      6;
  }

  addCandidate(
    candidates,
    {
      type:
        "主勝",

      text:
        `${game.homeTeam} 主勝`,

      score:
        homeWinScore,

      reasons: [
        `XSI 主勝機率 ${probabilities.home}%`,
        `市場主勝機率 ${marketProbability.home}%`,
        `主勝 Value Gap ${homeValue >= 0 ? "+" : ""}${homeValue.toFixed(
          1,
        )}%`,
        `主隊近 ${homeForm.matchesPlayed} 場：${homeForm.wins}勝 ${homeForm.draws}和 ${homeForm.losses}敗`,
        `主隊 Form Score：${homeForm.formScore}`,
      ],
    },
  );

  /* ========================================
     客勝
  ======================================== */

  let awayWinScore =
    probabilities.away +
    awayValue *
      1.5;

  if (
    marketProbability.away >=
      65 &&
    awayValue <
      0
  ) {
    awayWinScore -=
      10;
  }

  if (
    awaySpread !==
      null &&
    awaySpread >
      0
  ) {
    awayWinScore -=
      6;
  }

  addCandidate(
    candidates,
    {
      type:
        "客勝",

      text:
        `${game.awayTeam} 客勝`,

      score:
        awayWinScore,

      reasons: [
        `XSI 客勝機率 ${probabilities.away}%`,
        `市場客勝機率 ${marketProbability.away}%`,
        `客勝 Value Gap ${awayValue >= 0 ? "+" : ""}${awayValue.toFixed(
          1,
        )}%`,
        `客隊近 ${awayForm.matchesPlayed} 場：${awayForm.wins}勝 ${awayForm.draws}和 ${awayForm.losses}敗`,
        `客隊 Form Score：${awayForm.formScore}`,
      ],
    },
  );

  /* ========================================
     和局
  ======================================== */

  let drawScore =
    probabilities.draw +
    drawValue *
      1.3;

  const xsiSideGap =
    Math.abs(
      probabilities.home -
      probabilities.away,
    );

  if (
    xsiSideGap <= 5
  ) {
    drawScore +=
      10;
  } else if (
    xsiSideGap <= 10
  ) {
    drawScore +=
      6;
  } else if (
    xsiSideGap <= 15
  ) {
    drawScore +=
      3;
  }

  addCandidate(
    candidates,
    {
      type:
        "和局",

      text:
        `${game.awayTeam} vs ${game.homeTeam} 和局`,

      score:
        drawScore,

      reasons: [
        `XSI 和局機率 ${probabilities.draw}%`,
        `市場和局機率 ${marketProbability.draw}%`,
        `和局 Value Gap ${drawValue >= 0 ? "+" : ""}${drawValue.toFixed(
          1,
        )}%`,
        `XSI 主客勝率差 ${xsiSideGap.toFixed(
          1,
        )}%`,
      ],
    },
  );

  /* ========================================
     主隊受讓
  ======================================== */

  if (
    homeSpread !==
      null &&
    homeSpread >
      0
  ) {
    let score =
      probabilities.home +
      getUnderdogSpreadBonus(
        homeSpread,
      );

    /*
     * XSI 比市場更看好主隊，
     * 受讓價值再提升。
     */
    if (
      homeValue >= 3
    ) {
      score +=
        7;
    }

    if (
      homeForm.formScore >
      awayForm.formScore
    ) {
      score +=
        5;
    }

    addCandidate(
      candidates,
      {
        type:
          "主隊受讓",

        text:
          `${game.homeTeam} 受讓 +${homeSpread}`,

        score,

        reasons: [
          `主隊取得 +${homeSpread} 受讓保護`,
          `XSI 主勝機率 ${probabilities.home}%`,
          `市場主勝機率 ${marketProbability.home}%`,
          `主隊 Form ${homeForm.formScore} vs 客隊 ${awayForm.formScore}`,
        ],
      },
    );
  }

  /* ========================================
     客隊受讓
  ======================================== */

  if (
    awaySpread !==
      null &&
    awaySpread >
      0
  ) {
    let score =
      probabilities.away +
      getUnderdogSpreadBonus(
        awaySpread,
      );

    if (
      awayValue >= 3
    ) {
      score +=
        7;
    }

    if (
      awayForm.formScore >
      homeForm.formScore
    ) {
      score +=
        5;
    }

    addCandidate(
      candidates,
      {
        type:
          "客隊受讓",

        text:
          `${game.awayTeam} 受讓 +${awaySpread}`,

        score,

        reasons: [
          `客隊取得 +${awaySpread} 受讓保護`,
          `XSI 客勝機率 ${probabilities.away}%`,
          `市場客勝機率 ${marketProbability.away}%`,
          `客隊 Form ${awayForm.formScore} vs 主隊 ${homeForm.formScore}`,
        ],
      },
    );
  }

  /* ========================================
     主隊讓球
  ======================================== */

  if (
    homeSpread !==
      null &&
    homeSpread <
      0
  ) {
    let score =
      probabilities.home -
      getFavoriteSpreadPenalty(
        homeSpread,
      );

    /*
     * 只有模型真的比市場更看好，
     * 才補回讓球分數。
     */
    if (
      homeValue >= 4
    ) {
      score +=
        8;
    }

    if (
      homeForm.formScore >=
      awayForm.formScore +
        20
    ) {
      score +=
        6;
    }

    addCandidate(
      candidates,
      {
        type:
          "主隊讓球",

        text:
          `${game.homeTeam} 讓球 ${homeSpread}`,

        score,

        reasons: [
          `主隊讓球盤 ${homeSpread}`,
          `XSI 主勝機率 ${probabilities.home}%`,
          `主勝 Value Gap ${homeValue >= 0 ? "+" : ""}${homeValue.toFixed(
            1,
          )}%`,
          `主隊 Form ${homeForm.formScore} vs 客隊 ${awayForm.formScore}`,
        ],
      },
    );
  }

  /* ========================================
     客隊讓球
  ======================================== */

  if (
    awaySpread !==
      null &&
    awaySpread <
      0
  ) {
    let score =
      probabilities.away -
      getFavoriteSpreadPenalty(
        awaySpread,
      );

    if (
      awayValue >= 4
    ) {
      score +=
        8;
    }

    if (
      awayForm.formScore >=
      homeForm.formScore +
        20
    ) {
      score +=
        6;
    }

    addCandidate(
      candidates,
      {
        type:
          "客隊讓球",

        text:
          `${game.awayTeam} 讓球 ${awaySpread}`,

        score,

        reasons: [
          `客隊讓球盤 ${awaySpread}`,
          `XSI 客勝機率 ${probabilities.away}%`,
          `客勝 Value Gap ${awayValue >= 0 ? "+" : ""}${awayValue.toFixed(
            1,
          )}%`,
          `客隊 Form ${awayForm.formScore} vs 主隊 ${homeForm.formScore}`,
        ],
      },
    );
  }

  /* ========================================
     STEP 6
     排序
  ======================================== */

  const sorted =
    candidates.sort(
      (
        a,
        b,
      ) =>
        b.score -
        a.score,
    );

  const best =
    sorted[0];

  const second =
    sorted[1];

  const candidateGap =
    best &&
    second
      ? best.score -
        second.score
      : 0;

  /* ========================================
     STEP 7
     Confidence V2

     Confidence 不再直接等同命中率。

     主要參考：
     - 第一候選分數
     - 第一 / 第二候選差距
     - Form 資料完整度
     - 1X2 市場完整度

     避免只因候選差距大，
     就直接衝到 88。
  ======================================== */

  let confidence =
    52;

  /*
   * 推薦本身的分數。
   *
   * 50 分附近不額外加太多，
   * 高於 50 才逐步增加。
   */
  confidence +=
    Math.max(
      -3,
      Math.min(
        8,
        (
          best.score -
          50
        ) *
          0.25,
      ),
    );

  /*
   * 第一候選和第二候選差距。
   *
   * 最多只加 6，
   * 不再讓 candidateGap 主導 Confidence。
   */
  confidence +=
    Math.max(
      0,
      Math.min(
        6,
        candidateGap *
          0.5,
      ),
    );

  /*
   * 有完整近期資料才加分。
   */
  if (
    hasFormData
  ) {
    confidence += 4;
  } else {
    confidence -= 8;

    best.reasons.push(
      "近期球隊資料不足，本場 XSI 主要依市場資料判斷",
    );
  }

  /*
   * 市場資料完整度
   */
  const validOneXTwoCount =
    [
      homeWinOdds,
      drawOdds,
      awayWinOdds,
    ].filter(
      (
        value,
      ) =>
        typeof value ===
          "number" &&
        value > 1,
    ).length;

  if (
    validOneXTwoCount ===
    3
  ) {
    confidence += 2;
  } else {
    confidence -= 8;

    best.reasons.push(
      "1X2 市場資料不完整，信心度下修",
    );
  }

  /*
   * 如果最佳推薦是 1X2，
   * 再看 XSI 是否真的比市場有額外 Value。
   */
  let bestOneXTwoValue =
    0;

  if (
    best.type ===
    "主勝"
  ) {
    bestOneXTwoValue =
      homeValue;
  } else if (
    best.type ===
    "和局"
  ) {
    bestOneXTwoValue =
      drawValue;
  } else if (
    best.type ===
    "客勝"
  ) {
    bestOneXTwoValue =
      awayValue;
  }

  if (
    bestOneXTwoValue >=
    4
  ) {
    confidence += 4;
  } else if (
    bestOneXTwoValue >=
    2
  ) {
    confidence += 2;
  } else if (
    bestOneXTwoValue <
      -2
  ) {
    confidence -= 3;
  }

  const finalConfidence =
    clampConfidence(
      confidence,
    );


  /* ========================================
     DEBUG

     Terminal 可以直接看到
     Market vs XSI
  ======================================== */

  console.log(
    "======================================",
  );

  console.log(
    `⚽ XSI Football：${game.awayTeam} @ ${game.homeTeam}`,
  );

  console.log(
    `主隊 Form：${homeForm.wins}勝 ${homeForm.draws}和 ${homeForm.losses}敗｜Score ${homeForm.formScore}`,
  );

  console.log(
    `客隊 Form：${awayForm.wins}勝 ${awayForm.draws}和 ${awayForm.losses}敗｜Score ${awayForm.formScore}`,
  );

  console.log(
    "Market：",
    marketProbability,
  );

  console.log(
    "XSI：",
    probabilities,
  );

  console.log(
    "V2 Params：",
    {
      formWeight:
        0,

      attackWeight:
        0,

      defenseWeight:
        0.12,

      homeEdge:
        3,
    },
  );

  console.log(
    `推薦：${best.text}`,
  );

  console.log(
    `Confidence：${finalConfidence}`,
  );

  console.log(
    "======================================",
  );

  /* ========================================
     RETURN
  ======================================== */

  return {
    game,

    recommendation: {
      type:
        best.type,

      text:
        best.text,

      confidence:
        finalConfidence,

      risk:
        getRisk(
          finalConfidence,
        ),

      reasons: [
        ...best.reasons,

        `XSI Value Score：${best.score.toFixed(
          1,
        )}`,

        `第二候選差距：${candidateGap.toFixed(
          1,
        )}`,
      ],
    },

    probabilities,

    market: {
      homeWinOdds,

      drawOdds,

      awayWinOdds,

      homeSpread,

      awaySpread,

      // 大小球已交由 lib/football/totals-model.ts 負責
      totalPoint: null,
    },

    form: {
      home: {
        score:
          homeForm.formScore,

        wins:
          homeForm.wins,

        draws:
          homeForm.draws,

        losses:
          homeForm.losses,

        averageGoalsFor:
          homeForm.averageGoalsFor,

        averageGoalsAgainst:
          homeForm.averageGoalsAgainst,
      },

      away: {
        score:
          awayForm.formScore,

        wins:
          awayForm.wins,

        draws:
          awayForm.draws,

        losses:
          awayForm.losses,

        averageGoalsFor:
          awayForm.averageGoalsFor,

        averageGoalsAgainst:
          awayForm.averageGoalsAgainst,
      },
    },
  };
}