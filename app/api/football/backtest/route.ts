import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic =
  "force-dynamic";

/* ==========================================
   XSI Football Backtest V2

   目的：

   1. 西甲 2025/26
   2. 無 Look-ahead Bias
   3. 70% Training
   4. 30% Validation
   5. 自動搜尋權重
   6. 與 Market / XSI V1 比較

   注意：

   Validation 完全不參與調參。
========================================== */

const LEAGUE =
  "西甲";

const SEASON =
  "2025/26";

const MIN_FORM_MATCHES =
  3;

const FORM_MATCHES =
  5;

const TRAIN_RATIO =
  0.7;

/* ==========================================
   V1 正式權重
========================================== */

const V1_PARAMS = {
  formWeight:
    0.18,

  attackWeight:
    0.12,

  defenseWeight:
    0.12,

  homeEdge:
    2.5,
};

/* ==========================================
   Grid Search

   6 × 5 × 5 × 7
   =
   1050 組
========================================== */

const FORM_WEIGHTS = [
  0,
  0.04,
  0.08,
  0.12,
  0.16,
  0.2,
];

const ATTACK_WEIGHTS = [
  0,
  0.03,
  0.06,
  0.09,
  0.12,
];

const DEFENSE_WEIGHTS = [
  0,
  0.03,
  0.06,
  0.09,
  0.12,
];

const HOME_EDGES = [
  0,
  0.5,
  1,
  1.5,
  2,
  2.5,
  3,
];

/* ==========================================
   Types
========================================== */

type ResultType =
  | "home"
  | "draw"
  | "away";

type HistoryMatch = {
  id: number;

  match_date: string;

  home_team: string;

  away_team: string;

  home_score: number;

  away_score: number;

  home_odds:
    number | null;

  draw_odds:
    number | null;

  away_odds:
    number | null;
};

type ThreeWayProbability = {
  home: number;
  draw: number;
  away: number;
};

type FormStats = {
  matchesPlayed: number;

  wins: number;

  draws: number;

  losses: number;

  goalsFor: number;

  goalsAgainst: number;

  averageGoalsFor: number;

  averageGoalsAgainst: number;

  formPoints: number;

  formScore: number;
};

type ModelParams = {
  formWeight: number;

  attackWeight: number;

  defenseWeight: number;

  homeEdge: number;
};

type PreparedMatch = {
  id: number;

  date: string;

  homeTeam: string;

  awayTeam: string;

  score: string;

  actual:
    ResultType;

  marketProbability:
    ThreeWayProbability;

  marketPrediction:
    ResultType;

  homeForm:
    FormStats;

  awayForm:
    FormStats;

  homeAttack: number;

  awayAttack: number;

  homeDefense: number;

  awayDefense: number;
};

type EvaluationRow = {
  id: number;

  date: string;

  homeTeam: string;

  awayTeam: string;

  score: string;

  actual:
    ResultType;

  prediction:
    ResultType;

  marketPrediction:
    ResultType;

  correct: boolean;

  marketCorrect: boolean;

  probability:
    ThreeWayProbability;
};

type EvaluationResult = {
  total: number;

  correct: number;

  accuracy: number;

  changedMarketDirection:
    number;

  changedCorrect:
    number;

  changedWrong:
    number;

  netChangedGain:
    number;

  rows:
    EvaluationRow[];
};

type SearchResult = {
  params:
    ModelParams;

  training:
    EvaluationResult;

  complexity:
    number;
};

/* ==========================================
   Helpers
========================================== */

function percentage(
  value:
    number,

  total:
    number,
) {
  if (
    total ===
    0
  ) {
    return 0;
  }

  return Number(
    (
      value /
      total *
      100
    ).toFixed(
      1,
    ),
  );
}

/* ==========================================
   Team Normalize
========================================== */

function normalizeTeamName(
  name:
    string,
) {
  return name
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function teamMatches(
  first:
    string,

  second:
    string,
) {
  return (
    normalizeTeamName(
      first,
    ) ===
    normalizeTeamName(
      second,
    )
  );
}

/* ==========================================
   Odds
========================================== */

function impliedProbability(
  odds:
    number | null,
) {
  if (
    !odds ||
    odds <=
      1
  ) {
    return 0;
  }

  return 1 /
    odds;
}

function normalizeThreeWayProbabilities({
  homeOdds,
  drawOdds,
  awayOdds,
}: {
  homeOdds:
    number | null;

  drawOdds:
    number | null;

  awayOdds:
    number | null;
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
    total <=
    0
  ) {
    return {
      home:
        33.3,

      draw:
        33.4,

      away:
        33.3,
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
   Probability Normalize
========================================== */

function normalizeProbabilityScores(
  home:
    number,

  draw:
    number,

  away:
    number,
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
   Actual Result
========================================== */

function getActualResult(
  match:
    HistoryMatch,
): ResultType {
  if (
    match.home_score >
    match.away_score
  ) {
    return "home";
  }

  if (
    match.home_score <
    match.away_score
  ) {
    return "away";
  }

  return "draw";
}

/* ==========================================
   Highest Probability
========================================== */

function getPrediction(
  probability:
    ThreeWayProbability,
): ResultType {
  if (
    probability.home >=
      probability.draw &&
    probability.home >=
      probability.away
  ) {
    return "home";
  }

  if (
    probability.away >=
      probability.home &&
    probability.away >=
      probability.draw
  ) {
    return "away";
  }

  return "draw";
}

/* ==========================================
   Form Score

   與目前 XSI Form 保持一致。
========================================== */

function calculateFormScore({
  matchesPlayed,
  formPoints,
  goalsFor,
  goalsAgainst,
}: {
  matchesPlayed:
    number;

  formPoints:
    number;

  goalsFor:
    number;

  goalsAgainst:
    number;
}) {
  if (
    matchesPlayed ===
    0
  ) {
    return 50;
  }

  const maxPoints =
    matchesPlayed *
    3;

  const pointsRate =
    formPoints /
    maxPoints;

  const resultScore =
    pointsRate *
    60;

  const goalDifference =
    goalsFor -
    goalsAgainst;

  const goalDifferenceScore =
    Math.max(
      -20,
      Math.min(
        20,
        goalDifference *
          4,
      ),
    );

  const raw =
    20 +
    resultScore +
    goalDifferenceScore;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        raw,
      ),
    ),
  );
}

/* ==========================================
   Historical Form

   targetDate 之後的比賽
   完全禁止使用。
========================================== */

function calculateHistoricalForm(
  teamName:
    string,

  targetDate:
    string,

  matches:
    HistoryMatch[],
): FormStats {
  const targetTime =
    new Date(
      targetDate,
    ).getTime();

  const recent =
    matches
      .filter(
        (
          match,
        ) => {
          const matchTime =
            new Date(
              match.match_date,
            ).getTime();

          if (
            matchTime >=
            targetTime
          ) {
            return false;
          }

          return (
            teamMatches(
              teamName,
              match.home_team,
            ) ||
            teamMatches(
              teamName,
              match.away_team,
            )
          );
        },
      )
      .sort(
        (
          a,
          b,
        ) =>
          new Date(
            b.match_date,
          ).getTime() -
          new Date(
            a.match_date,
          ).getTime(),
      )
      .slice(
        0,
        FORM_MATCHES,
      );

  let wins =
    0;

  let draws =
    0;

  let losses =
    0;

  let goalsFor =
    0;

  let goalsAgainst =
    0;

  let formPoints =
    0;

  for (
    const match
    of recent
  ) {
    const isHome =
      teamMatches(
        teamName,
        match.home_team,
      );

    const teamGoals =
      isHome
        ? match.home_score
        : match.away_score;

    const opponentGoals =
      isHome
        ? match.away_score
        : match.home_score;

    goalsFor +=
      teamGoals;

    goalsAgainst +=
      opponentGoals;

    if (
      teamGoals >
      opponentGoals
    ) {
      wins +=
        1;

      formPoints +=
        3;
    } else if (
      teamGoals ===
      opponentGoals
    ) {
      draws +=
        1;

      formPoints +=
        1;
    } else {
      losses +=
        1;
    }
  }

  const matchesPlayed =
    recent.length;

  const averageGoalsFor =
    matchesPlayed >
    0
      ? Number(
          (
            goalsFor /
            matchesPlayed
          ).toFixed(
            2,
          ),
        )
      : 0;

  const averageGoalsAgainst =
    matchesPlayed >
    0
      ? Number(
          (
            goalsAgainst /
            matchesPlayed
          ).toFixed(
            2,
          ),
        )
      : 0;

  return {
    matchesPlayed,

    wins,

    draws,

    losses,

    goalsFor,

    goalsAgainst,

    averageGoalsFor,

    averageGoalsAgainst,

    formPoints,

    formScore:
      calculateFormScore({
        matchesPlayed,

        formPoints,

        goalsFor,

        goalsAgainst,
      }),
  };
}

/* ==========================================
   Attack
========================================== */

function calculateAttackScore(
  averageGoalsFor:
    number,
) {
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
   Defense
========================================== */

function calculateDefenseScore(
  averageGoalsAgainst:
    number,
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
   XSI Probability
========================================== */

function calculateModelProbability({
  market,
  homeFormScore,
  awayFormScore,
  homeAttack,
  awayAttack,
  homeDefense,
  awayDefense,
  params,
}: {
  market:
    ThreeWayProbability;

  homeFormScore:
    number;

  awayFormScore:
    number;

  homeAttack:
    number;

  awayAttack:
    number;

  homeDefense:
    number;

  awayDefense:
    number;

  params:
    ModelParams;
}): ThreeWayProbability {
  const formDifference =
    homeFormScore -
    awayFormScore;

  const attackDifference =
    homeAttack -
    awayAttack;

  const defenseDifference =
    homeDefense -
    awayDefense;

  const formAdjustment =
    Math.max(
      -12,
      Math.min(
        12,
        formDifference *
          params.formWeight,
      ),
    );

  const attackAdjustment =
    Math.max(
      -8,
      Math.min(
        8,
        attackDifference *
          params.attackWeight,
      ),
    );

  const defenseAdjustment =
    Math.max(
      -8,
      Math.min(
        8,
        defenseDifference *
          params.defenseWeight,
      ),
    );

  const totalAdjustment =
    formAdjustment +
    attackAdjustment +
    defenseAdjustment +
    params.homeEdge;

  let home =
    market.home +
    totalAdjustment;

  let away =
    market.away -
    totalAdjustment;

  /*
   * Draw Adjustment
   * 沿用 V1。
   */
  const formGap =
    Math.abs(
      homeFormScore -
      awayFormScore,
    );

  let draw =
    market.draw;

  if (
    formGap <=
    8
  ) {
    draw +=
      4;
  } else if (
    formGap <=
    15
  ) {
    draw +=
      2;
  } else if (
    formGap >=
    35
  ) {
    draw -=
      3;
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
   Prepare Dataset

   Form 只計算一次。

   Grid Search 不重複跑歷史查詢，
   速度會快很多。
========================================== */

function prepareDataset(
  matches:
    HistoryMatch[],
) {
  const prepared:
    PreparedMatch[] =
    [];

  let skippedForm =
    0;

  let skippedOdds =
    0;

  for (
    const target
    of matches
  ) {
    if (
      !target.home_odds ||
      !target.draw_odds ||
      !target.away_odds
    ) {
      skippedOdds +=
        1;

      continue;
    }

    const homeForm =
      calculateHistoricalForm(
        target.home_team,
        target.match_date,
        matches,
      );

    const awayForm =
      calculateHistoricalForm(
        target.away_team,
        target.match_date,
        matches,
      );

    if (
      homeForm.matchesPlayed <
        MIN_FORM_MATCHES ||
      awayForm.matchesPlayed <
        MIN_FORM_MATCHES
    ) {
      skippedForm +=
        1;

      continue;
    }

    const marketProbability =
      normalizeThreeWayProbabilities({
        homeOdds:
          target.home_odds,

        drawOdds:
          target.draw_odds,

        awayOdds:
          target.away_odds,
      });

    prepared.push({
      id:
        target.id,

      date:
        target.match_date,

      homeTeam:
        target.home_team,

      awayTeam:
        target.away_team,

      score:
        `${target.home_score}-${target.away_score}`,

      actual:
        getActualResult(
          target,
        ),

      marketProbability,

      marketPrediction:
        getPrediction(
          marketProbability,
        ),

      homeForm,

      awayForm,

      homeAttack:
        calculateAttackScore(
          homeForm
            .averageGoalsFor,
        ),

      awayAttack:
        calculateAttackScore(
          awayForm
            .averageGoalsFor,
        ),

      homeDefense:
        calculateDefenseScore(
          homeForm
            .averageGoalsAgainst,
        ),

      awayDefense:
        calculateDefenseScore(
          awayForm
            .averageGoalsAgainst,
        ),
    });
  }

  return {
    prepared,

    skippedForm,

    skippedOdds,
  };
}

/* ==========================================
   Evaluate Market
========================================== */

function evaluateMarket(
  matches:
    PreparedMatch[],
) {
  const correct =
    matches.filter(
      (match) =>
        match.marketPrediction ===
        match.actual,
    ).length;

  return {
    total:
      matches.length,

    correct,

    accuracy:
      percentage(
        correct,
        matches.length,
      ),
  };
}

/* ==========================================
   Evaluate Model
========================================== */

function evaluateModel(
  matches:
    PreparedMatch[],

  params:
    ModelParams,
): EvaluationResult {
  const rows:
    EvaluationRow[] =
    [];

  let correct =
    0;

  let changedMarketDirection =
    0;

  let changedCorrect =
    0;

  let changedWrong =
    0;

  let marketCorrectOnChanged =
    0;

  for (
    const match
    of matches
  ) {
    const probability =
      calculateModelProbability({
        market:
          match.marketProbability,

        homeFormScore:
          match.homeForm
            .formScore,

        awayFormScore:
          match.awayForm
            .formScore,

        homeAttack:
          match.homeAttack,

        awayAttack:
          match.awayAttack,

        homeDefense:
          match.homeDefense,

        awayDefense:
          match.awayDefense,

        params,
      });

    const prediction =
      getPrediction(
        probability,
      );

    const isCorrect =
      prediction ===
      match.actual;

    const marketCorrect =
      match.marketPrediction ===
      match.actual;

    if (
      isCorrect
    ) {
      correct +=
        1;
    }

    if (
      prediction !==
      match.marketPrediction
    ) {
      changedMarketDirection +=
        1;

      if (
        isCorrect
      ) {
        changedCorrect +=
          1;
      } else {
        changedWrong +=
          1;
      }

      if (
        marketCorrect
      ) {
        marketCorrectOnChanged +=
          1;
      }
    }

    rows.push({
      id:
        match.id,

      date:
        match.date,

      homeTeam:
        match.homeTeam,

      awayTeam:
        match.awayTeam,

      score:
        match.score,

      actual:
        match.actual,

      prediction,

      marketPrediction:
        match.marketPrediction,

      correct:
        isCorrect,

      marketCorrect,

      probability,
    });
  }

  /*
   * XSI 改變市場方向時：

   * XSI 改對 - 原市場改對
   *
   * > 0 才是真的淨改善。
   */
  const netChangedGain =
    changedCorrect -
    marketCorrectOnChanged;

  return {
    total:
      matches.length,

    correct,

    accuracy:
      percentage(
        correct,
        matches.length,
      ),

    changedMarketDirection,

    changedCorrect,

    changedWrong,

    netChangedGain,

    rows,
  };
}

/* ==========================================
   Complexity

   Training 同分時，
   優先選比較保守的模型。
========================================== */

function calculateComplexity(
  params:
    ModelParams,
) {
  return Number(
    (
      params.formWeight *
        100 +
      params.attackWeight *
        100 +
      params.defenseWeight *
        100 +
      params.homeEdge *
        2
    ).toFixed(
      2,
    ),
  );
}

/* ==========================================
   Search Comparator

   排序：

   1. Training Accuracy
   2. Net Changed Gain
   3. 較低 Complexity
========================================== */

function isBetterSearchResult(
  candidate:
    SearchResult,

  current:
    SearchResult | null,
) {
  if (
    !current
  ) {
    return true;
  }

  if (
    candidate.training.accuracy >
    current.training.accuracy
  ) {
    return true;
  }

  if (
    candidate.training.accuracy <
    current.training.accuracy
  ) {
    return false;
  }

  if (
    candidate.training.netChangedGain >
    current.training.netChangedGain
  ) {
    return true;
  }

  if (
    candidate.training.netChangedGain <
    current.training.netChangedGain
  ) {
    return false;
  }

  return (
    candidate.complexity <
    current.complexity
  );
}

/* ==========================================
   Side Stats
========================================== */

function buildSideStats(
  rows:
    EvaluationRow[],

  side:
    ResultType,
) {
  const selected =
    rows.filter(
      (row) =>
        row.prediction ===
        side,
    );

  const correct =
    selected.filter(
      (row) =>
        row.correct,
    ).length;

  return {
    predictions:
      selected.length,

    correct,

    accuracy:
      percentage(
        correct,
        selected.length,
      ),
  };
}

/* ==========================================
   GET
========================================== */

export async function GET() {
  try {
    console.log(
      "======================================",
    );

    console.log(
      "🧪 XSI Football Backtest V2",
    );

    console.log(
      `${LEAGUE} ${SEASON}`,
    );

    /* ======================================
       Supabase
    ====================================== */

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env
        .SUPABASE_SECRET_KEY ??
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseKey
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "找不到 Supabase 環境變數",
        },
        {
          status:
            500,
        },
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        },
      );

    /* ======================================
       History
    ====================================== */

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "football_match_history",
        )
        .select(
          [
            "id",
            "match_date",
            "home_team",
            "away_team",
            "home_score",
            "away_score",
            "home_odds",
            "draw_odds",
            "away_odds",
          ].join(
            ",",
          ),
        )
        .eq(
          "league",
          LEAGUE,
        )
        .eq(
          "season",
          SEASON,
        )
        .eq(
          "status",
          "finished",
        )
        .order(
          "match_date",
          {
            ascending:
              true,
          },
        );

    if (
      error
    ) {
      console.error(
        "❌ Backtest History Error：",
        error,
      );

      return NextResponse.json(
        {
          success:
            false,

          message:
            error.message,
        },
        {
          status:
            500,
        },
      );
    }

    const matches =
      (
        data ??
        []
      ) as unknown as HistoryMatch[];

    console.log(
      `📊 歷史比賽：${matches.length}`,
    );

    /* ======================================
       Prepare
    ====================================== */

    const {
      prepared,
      skippedForm,
      skippedOdds,
    } =
      prepareDataset(
        matches,
      );

    console.log(
      `✅ 有效資料：${prepared.length}`,
    );

    console.log(
      `⏭️ Form不足：${skippedForm}`,
    );

    console.log(
      `⏭️ Odds不足：${skippedOdds}`,
    );

    if (
      prepared.length <
      50
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "有效回測資料不足",

          validMatches:
            prepared.length,
        },
        {
          status:
            400,
        },
      );
    }

    /* ======================================
       70 / 30 Time Split

       已經按照日期排序，
       所以不是隨機 split。
    ====================================== */

    const splitIndex =
      Math.floor(
        prepared.length *
        TRAIN_RATIO,
      );

    const trainingMatches =
      prepared.slice(
        0,
        splitIndex,
      );

    const validationMatches =
      prepared.slice(
        splitIndex,
      );

    console.log(
      `📘 Training：${trainingMatches.length}`,
    );

    console.log(
      `📗 Validation：${validationMatches.length}`,
    );

    console.log(
      `📅 Training：${trainingMatches[0]?.date} → ${trainingMatches[
        trainingMatches.length -
          1
      ]?.date}`,
    );

    console.log(
      `📅 Validation：${validationMatches[0]?.date} → ${validationMatches[
        validationMatches.length -
          1
      ]?.date}`,
    );

    /* ======================================
       Baseline Market
    ====================================== */

    const marketTraining =
      evaluateMarket(
        trainingMatches,
      );

    const marketValidation =
      evaluateMarket(
        validationMatches,
      );

    /* ======================================
       V1
    ====================================== */

    const v1Training =
      evaluateModel(
        trainingMatches,
        V1_PARAMS,
      );

    const v1Validation =
      evaluateModel(
        validationMatches,
        V1_PARAMS,
      );

    /* ======================================
       Grid Search
    ====================================== */

    let best:
      SearchResult | null =
      null;

    let testedModels =
      0;

    const topModels:
      SearchResult[] =
      [];

    console.log(
      "🔍 開始搜尋模型...",
    );

    for (
      const formWeight
      of FORM_WEIGHTS
    ) {
      for (
        const attackWeight
        of ATTACK_WEIGHTS
      ) {
        for (
          const defenseWeight
          of DEFENSE_WEIGHTS
        ) {
          for (
            const homeEdge
            of HOME_EDGES
          ) {
            const params:
              ModelParams = {
              formWeight,

              attackWeight,

              defenseWeight,

              homeEdge,
            };

            const training =
              evaluateModel(
                trainingMatches,
                params,
              );

            const result:
              SearchResult = {
              params,

              training,

              complexity:
                calculateComplexity(
                  params,
                ),
            };

            testedModels +=
              1;

            if (
              isBetterSearchResult(
                result,
                best,
              )
            ) {
              best =
                result;
            }

            topModels.push(
              result,
            );
          }
        }
      }
    }

    if (
      !best
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "模型搜尋失敗",
        },
        {
          status:
            500,
        },
      );
    }

    /*
     * 只保留 Training 表現前 10。
     */
    topModels.sort(
      (
        a,
        b,
      ) => {
        if (
          b.training
            .accuracy !==
          a.training
            .accuracy
        ) {
          return (
            b.training
              .accuracy -
            a.training
              .accuracy
          );
        }

        if (
          b.training
            .netChangedGain !==
          a.training
            .netChangedGain
        ) {
          return (
            b.training
              .netChangedGain -
            a.training
              .netChangedGain
          );
        }

        return (
          a.complexity -
          b.complexity
        );
      },
    );

    const bestParams =
      best.params;

    /* ======================================
       Validation

       這是第一次讓最佳模型
       看到 Validation。
    ====================================== */

    const bestValidation =
      evaluateModel(
        validationMatches,
        bestParams,
      );

    const bestFull =
      evaluateModel(
        prepared,
        bestParams,
      );

    /* ======================================
       Logs
    ====================================== */

    console.log(
      "======================================",
    );

    console.log(
      "📊 BASELINE",
    );

    console.log(
      `💰 Market Training：${marketTraining.correct}/${marketTraining.total}｜${marketTraining.accuracy}%`,
    );

    console.log(
      `💰 Market Validation：${marketValidation.correct}/${marketValidation.total}｜${marketValidation.accuracy}%`,
    );

    console.log(
      `🤖 V1 Training：${v1Training.correct}/${v1Training.total}｜${v1Training.accuracy}%`,
    );

    console.log(
      `🤖 V1 Validation：${v1Validation.correct}/${v1Validation.total}｜${v1Validation.accuracy}%`,
    );

    console.log(
      "--------------------------------------",
    );

    console.log(
      `🔍 Tested Models：${testedModels}`,
    );

    console.log(
      "🏆 BEST PARAMS：",
      bestParams,
    );

    console.log(
      `🏆 Training：${best.training.correct}/${best.training.total}｜${best.training.accuracy}%`,
    );

    console.log(
      `🧪 Validation：${bestValidation.correct}/${bestValidation.total}｜${bestValidation.accuracy}%`,
    );

    console.log(
      `📈 V2 vs Market Validation：${(
        bestValidation.accuracy -
        marketValidation.accuracy
      ).toFixed(
        1,
      )}%`,
    );

    console.log(
      `📈 V2 vs V1 Validation：${(
        bestValidation.accuracy -
        v1Validation.accuracy
      ).toFixed(
        1,
      )}%`,
    );

    console.log(
      `🔄 Validation 改變市場方向：${bestValidation.changedMarketDirection} 場`,
    );

    console.log(
      `✅ 改變後命中：${bestValidation.changedCorrect}`,
    );

    console.log(
      `❌ 改變後未中：${bestValidation.changedWrong}`,
    );

    console.log(
      `📊 改變市場淨收益：${bestValidation.netChangedGain} 場`,
    );

    console.log(
      "======================================",
    );

    /* ======================================
       Response
    ====================================== */

    return NextResponse.json({
      success:
        true,

      model:
        "XSI Football Backtest V2",

      league:
        LEAGUE,

      season:
        SEASON,

      dataset: {
        totalHistory:
          matches.length,

        validMatches:
          prepared.length,

        skippedForm,

        skippedOdds,

        trainingMatches:
          trainingMatches.length,

        validationMatches:
          validationMatches.length,

        trainRatio:
          TRAIN_RATIO,

        trainingDateRange: {
          from:
            trainingMatches[
              0
            ]?.date ??
            null,

          to:
            trainingMatches[
              trainingMatches.length -
                1
            ]?.date ??
            null,
        },

        validationDateRange: {
          from:
            validationMatches[
              0
            ]?.date ??
            null,

          to:
            validationMatches[
              validationMatches.length -
                1
            ]?.date ??
            null,
        },
      },

      baseline: {
        market: {
          training:
            marketTraining,

          validation:
            marketValidation,
        },

        xsiV1: {
          params:
            V1_PARAMS,

          training: {
            correct:
              v1Training.correct,

            total:
              v1Training.total,

            accuracy:
              v1Training.accuracy,

            changedMarketDirection:
              v1Training.changedMarketDirection,

            netChangedGain:
              v1Training.netChangedGain,
          },

          validation: {
            correct:
              v1Validation.correct,

            total:
              v1Validation.total,

            accuracy:
              v1Validation.accuracy,

            changedMarketDirection:
              v1Validation.changedMarketDirection,

            netChangedGain:
              v1Validation.netChangedGain,
          },
        },
      },

      search: {
        testedModels,

        grid: {
          formWeights:
            FORM_WEIGHTS,

          attackWeights:
            ATTACK_WEIGHTS,

          defenseWeights:
            DEFENSE_WEIGHTS,

          homeEdges:
            HOME_EDGES,
        },
      },

      bestModel: {
        params:
          bestParams,

        complexity:
          best.complexity,

        training: {
          correct:
            best.training.correct,

          total:
            best.training.total,

          accuracy:
            best.training.accuracy,

          changedMarketDirection:
            best.training
              .changedMarketDirection,

          changedCorrect:
            best.training
              .changedCorrect,

          changedWrong:
            best.training
              .changedWrong,

          netChangedGain:
            best.training
              .netChangedGain,
        },

        validation: {
          correct:
            bestValidation.correct,

          total:
            bestValidation.total,

          accuracy:
            bestValidation.accuracy,

          changedMarketDirection:
            bestValidation
              .changedMarketDirection,

          changedCorrect:
            bestValidation
              .changedCorrect,

          changedWrong:
            bestValidation
              .changedWrong,

          netChangedGain:
            bestValidation
              .netChangedGain,
        },

        fullDataset: {
          correct:
            bestFull.correct,

          total:
            bestFull.total,

          accuracy:
            bestFull.accuracy,
        },

        improvement: {
          validationVsMarket:
            Number(
              (
                bestValidation
                  .accuracy -
                marketValidation
                  .accuracy
              ).toFixed(
                1,
              ),
            ),

          validationVsV1:
            Number(
              (
                bestValidation
                  .accuracy -
                v1Validation
                  .accuracy
              ).toFixed(
                1,
              ),
            ),
        },

        validationPredictionSides: {
          home:
            buildSideStats(
              bestValidation.rows,
              "home",
            ),

          draw:
            buildSideStats(
              bestValidation.rows,
              "draw",
            ),

          away:
            buildSideStats(
              bestValidation.rows,
              "away",
            ),
        },
      },

      /*
       * Training 前 10 名。
       *
       * 注意：
       * 這裡不拿 Validation
       * 回頭選冠軍。
       */
      topTrainingModels:
        topModels
          .slice(
            0,
            10,
          )
          .map(
            (
              model,
            ) => ({
              params:
                model.params,

              accuracy:
                model.training
                  .accuracy,

              correct:
                model.training
                  .correct,

              total:
                model.training
                  .total,

              netChangedGain:
                model.training
                  .netChangedGain,

              complexity:
                model.complexity,
            }),
          ),

      validationSample:
        bestValidation.rows
          .slice(
            -20,
          )
          .reverse(),
    });
  } catch (error) {
    console.error(
      "❌ XSI Backtest V2 Error：",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status:
          500,
      },
    );
  }
}