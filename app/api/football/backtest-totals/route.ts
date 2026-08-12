import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic =
  "force-dynamic";

/* ==========================================
   XSI Football Totals Backtest V2 FAST

   1. 西甲 2025/26
   2. Over / Under 2.5
   3. 無 Look-ahead Bias
   4. 70% Training
   5. 30% Validation
   6. 729 Grid Search
   7. Historical Stats 預先快取
========================================== */

const LEAGUE =
  "西甲";

const SEASON =
  "2025/26";

const TOTAL_LINE =
  2.5;

const TRAIN_RATIO =
  0.7;

const MIN_FORM_MATCHES =
  3;

/* ==========================================
   Fixed V1
========================================== */

const V1_PARAMS = {
  recentMatches: 5,

  attackWeight:
    0.6,

  defenseWeight:
    0.4,

  recentTotalWeight:
    0.35,

  overTrendWeight:
    0.3,

  homeGoalEdge:
    0.1,
};

/* ==========================================
   Grid Search
========================================== */

const RECENT_MATCH_OPTIONS = [
  3,
  5,
  8,
];

const ATTACK_WEIGHTS = [
  0.4,
  0.6,
  0.8,
];

const DEFENSE_WEIGHTS = [
  0.2,
  0.4,
  0.6,
];

const RECENT_TOTAL_WEIGHTS = [
  0.2,
  0.4,
  0.6,
];

const OVER_TREND_WEIGHTS = [
  0,
  0.3,
  0.6,
];

const HOME_GOAL_EDGES = [
  0,
  0.1,
  0.2,
];

/* ==========================================
   Types
========================================== */

type TotalsSide =
  | "over"
  | "under";

type HistoryMatch = {
  id: number;

  match_date: string;

  home_team: string;

  away_team: string;

  home_score: number;

  away_score: number;
};

type TeamGame = {
  date: string;

  goalsFor: number;

  goalsAgainst: number;

  totalGoals: number;
};

type TeamHistoricalStats = {
  matchesPlayed: number;

  goalsFor: number;

  goalsAgainst: number;

  totalGoals: number;

  averageGoalsFor: number;

  averageGoalsAgainst: number;

  averageTotalGoals: number;

  overCount: number;

  underCount: number;

  overRate: number;

  underRate: number;
};

type TotalsModelParams = {
  recentMatches: number;

  attackWeight: number;

  defenseWeight: number;

  recentTotalWeight: number;

  overTrendWeight: number;

  homeGoalEdge: number;
};

type PreparedMatch = {
  id: number;

  date: string;

  homeTeam: string;

  awayTeam: string;

  homeScore: number;

  awayScore: number;

  score: string;

  actualTotal: number;

  actual:
    TotalsSide;

  statsByWindow: Record<
    number,
    {
      home:
        TeamHistoricalStats;

      away:
        TeamHistoricalStats;
    }
  >;
};

type CalculationResult = {
  prediction:
    TotalsSide;

  expectedTotal:
    number;

  expectedHomeGoals:
    number;

  expectedAwayGoals:
    number;

  confidence:
    number;
};

type EvaluationRow = {
  id: number;

  date: string;

  homeTeam: string;

  awayTeam: string;

  score: string;

  actualTotal: number;

  actual:
    TotalsSide;

  prediction:
    TotalsSide;

  correct:
    boolean;

  expectedTotal:
    number;

  expectedHomeGoals:
    number;

  expectedAwayGoals:
    number;

  confidence:
    number;
};

type EvaluationResult = {
  total: number;

  correct: number;

  wrong: number;

  accuracy: number;

  overPredictions:
    number;

  overCorrect:
    number;

  overAccuracy:
    number;

  underPredictions:
    number;

  underCorrect:
    number;

  underAccuracy:
    number;

  averageConfidence:
    number;

  averageExpectedTotal:
    number;

  rows:
    EvaluationRow[];
};

type SearchResult = {
  params:
    TotalsModelParams;

  training:
    EvaluationResult;

  complexity:
    number;
};

/* ==========================================
   Helpers
========================================== */

function round(
  value:
    number,

  digits =
    2,
) {
  const multiplier =
    10 **
    digits;

  return (
    Math.round(
      value *
      multiplier,
    ) /
    multiplier
  );
}

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

/* ==========================================
   Empty Stats
========================================== */

function emptyStats():
  TeamHistoricalStats {
  return {
    matchesPlayed:
      0,

    goalsFor:
      0,

    goalsAgainst:
      0,

    totalGoals:
      0,

    averageGoalsFor:
      0,

    averageGoalsAgainst:
      0,

    averageTotalGoals:
      0,

    overCount:
      0,

    underCount:
      0,

    overRate:
      0,

    underRate:
      0,
  };
}

/* ==========================================
   Stats From Team Games
========================================== */

function buildStats(
  games:
    TeamGame[],

  limit:
    number,
):
  TeamHistoricalStats {
  const selected =
    games.slice(
      Math.max(
        0,
        games.length -
        limit,
      ),
    );

  if (
    selected.length ===
    0
  ) {
    return emptyStats();
  }

  let goalsFor =
    0;

  let goalsAgainst =
    0;

  let totalGoals =
    0;

  let overCount =
    0;

  let underCount =
    0;

  for (
    const game
    of selected
  ) {
    goalsFor +=
      game.goalsFor;

    goalsAgainst +=
      game.goalsAgainst;

    totalGoals +=
      game.totalGoals;

    if (
      game.totalGoals >
      TOTAL_LINE
    ) {
      overCount +=
        1;
    } else {
      underCount +=
        1;
    }
  }

  const matchesPlayed =
    selected.length;

  return {
    matchesPlayed,

    goalsFor,

    goalsAgainst,

    totalGoals,

    averageGoalsFor:
      round(
        goalsFor /
        matchesPlayed,
      ),

    averageGoalsAgainst:
      round(
        goalsAgainst /
        matchesPlayed,
      ),

    averageTotalGoals:
      round(
        totalGoals /
        matchesPlayed,
      ),

    overCount,

    underCount,

    overRate:
      round(
        overCount /
        matchesPlayed,
        4,
      ),

    underRate:
      round(
        underCount /
        matchesPlayed,
        4,
      ),
  };
}

/* ==========================================
   Prepare Dataset FAST

   核心：

   一路依日期跑。

   當遇到 target 時，
   先從 teamHistory 裡面取賽前資料。

   然後才把 target 比賽加入 history。

   因此不可能看到未來資料。
========================================== */

function prepareDatasetFast(
  history:
    HistoryMatch[],
) {
  const prepared:
    PreparedMatch[] =
    [];

  const teamHistory =
    new Map<
      string,
      TeamGame[]
    >();

  const sorted =
    [...history]
      .sort(
        (
          a,
          b,
        ) =>
          new Date(
            a.match_date,
          ).getTime() -
          new Date(
            b.match_date,
          ).getTime(),
      );

  for (
    const match
    of sorted
  ) {
    const homeKey =
      normalizeTeamName(
        match.home_team,
      );

    const awayKey =
      normalizeTeamName(
        match.away_team,
      );

    const homePrevious =
      teamHistory.get(
        homeKey,
      ) ??
      [];

    const awayPrevious =
      teamHistory.get(
        awayKey,
      ) ??
      [];

    const statsByWindow:
      PreparedMatch[
        "statsByWindow"
      ] =
      {};

    for (
      const recentMatches
      of RECENT_MATCH_OPTIONS
    ) {
      statsByWindow[
        recentMatches
      ] = {
        home:
          buildStats(
            homePrevious,
            recentMatches,
          ),

        away:
          buildStats(
            awayPrevious,
            recentMatches,
          ),
      };
    }

    const actualTotal =
      match.home_score +
      match.away_score;

    prepared.push({
      id:
        match.id,

      date:
        match.match_date,

      homeTeam:
        match.home_team,

      awayTeam:
        match.away_team,

      homeScore:
        match.home_score,

      awayScore:
        match.away_score,

      score:
        `${match.home_score}-${match.away_score}`,

      actualTotal,

      actual:
        actualTotal >
        TOTAL_LINE
          ? "over"
          : "under",

      statsByWindow,
    });

    /* ======================================
       比賽結束後才加入歷史

       Anti Look-ahead
    ====================================== */

    const homeGames =
      teamHistory.get(
        homeKey,
      ) ??
      [];

    homeGames.push({
      date:
        match.match_date,

      goalsFor:
        match.home_score,

      goalsAgainst:
        match.away_score,

      totalGoals:
        actualTotal,
    });

    teamHistory.set(
      homeKey,
      homeGames,
    );

    const awayGames =
      teamHistory.get(
        awayKey,
      ) ??
      [];

    awayGames.push({
      date:
        match.match_date,

      goalsFor:
        match.away_score,

      goalsAgainst:
        match.home_score,

      totalGoals:
        actualTotal,
    });

    teamHistory.set(
      awayKey,
      awayGames,
    );
  }

  return prepared;
}

/* ==========================================
   Model Calculation

   完全不掃歷史資料。
   直接讀預先快取 Stats。
========================================== */

function calculateModel(
  match:
    PreparedMatch,

  params:
    TotalsModelParams,
):
  CalculationResult |
  null {
  const cached =
    match.statsByWindow[
      params.recentMatches
    ];

  if (
    !cached
  ) {
    return null;
  }

  const home =
    cached.home;

  const away =
    cached.away;

  if (
    home.matchesPlayed <
      MIN_FORM_MATCHES ||
    away.matchesPlayed <
      MIN_FORM_MATCHES
  ) {
    return null;
  }

  const totalWeight =
    params.attackWeight +
    params.defenseWeight;

  const safeWeight =
    totalWeight >
    0
      ? totalWeight
      : 1;

  const expectedHomeGoals =
    (
      home.averageGoalsFor *
        params.attackWeight +
      away.averageGoalsAgainst *
        params.defenseWeight
    ) /
      safeWeight +
    params.homeGoalEdge;

  const expectedAwayGoals =
    (
      away.averageGoalsFor *
        params.attackWeight +
      home.averageGoalsAgainst *
        params.defenseWeight
    ) /
    safeWeight;

  const attackDefenseTotal =
    expectedHomeGoals +
    expectedAwayGoals;

  const recentTotal =
    (
      home.averageTotalGoals +
      away.averageTotalGoals
    ) /
    2;

  const recentWeight =
    Math.max(
      0,
      Math.min(
        1,
        params
          .recentTotalWeight,
      ),
    );

  let expectedTotal =
    attackDefenseTotal *
      (
        1 -
        recentWeight
      ) +
    recentTotal *
      recentWeight;

  const averageOverRate =
    (
      home.overRate +
      away.overRate
    ) /
    2;

  expectedTotal +=
    (
      averageOverRate -
      0.5
    ) *
    params
      .overTrendWeight;

  expectedTotal =
    round(
      expectedTotal,
      3,
    );

  const prediction:
    TotalsSide =
    expectedTotal >
    TOTAL_LINE
      ? "over"
      : "under";

  const edge =
    Math.abs(
      expectedTotal -
      TOTAL_LINE,
    );

  let confidence =
    50 +
    edge *
      25;

  confidence =
    Math.max(
      50,
      Math.min(
        90,
        confidence,
      ),
    );

  return {
    prediction,

    expectedTotal,

    expectedHomeGoals:
      round(
        expectedHomeGoals,
        3,
      ),

    expectedAwayGoals:
      round(
        expectedAwayGoals,
        3,
      ),

    confidence:
      round(
        confidence,
        1,
      ),
  };
}

/* ==========================================
   Evaluate
========================================== */

function evaluateModel(
  matches:
    PreparedMatch[],

  params:
    TotalsModelParams,
):
  EvaluationResult {
  const rows:
    EvaluationRow[] =
    [];

  let correct =
    0;

  let overPredictions =
    0;

  let overCorrect =
    0;

  let underPredictions =
    0;

  let underCorrect =
    0;

  let confidenceSum =
    0;

  let expectedSum =
    0;

  for (
    const match
    of matches
  ) {
    const result =
      calculateModel(
        match,
        params,
      );

    if (
      !result
    ) {
      continue;
    }

    const isCorrect =
      result.prediction ===
      match.actual;

    if (
      isCorrect
    ) {
      correct +=
        1;
    }

    if (
      result.prediction ===
      "over"
    ) {
      overPredictions +=
        1;

      if (
        isCorrect
      ) {
        overCorrect +=
          1;
      }
    } else {
      underPredictions +=
        1;

      if (
        isCorrect
      ) {
        underCorrect +=
          1;
      }
    }

    confidenceSum +=
      result.confidence;

    expectedSum +=
      result.expectedTotal;

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

      actualTotal:
        match.actualTotal,

      actual:
        match.actual,

      prediction:
        result.prediction,

      correct:
        isCorrect,

      expectedTotal:
        result.expectedTotal,

      expectedHomeGoals:
        result
          .expectedHomeGoals,

      expectedAwayGoals:
        result
          .expectedAwayGoals,

      confidence:
        result.confidence,
    });
  }

  const total =
    rows.length;

  return {
    total,

    correct,

    wrong:
      total -
      correct,

    accuracy:
      percentage(
        correct,
        total,
      ),

    overPredictions,

    overCorrect,

    overAccuracy:
      percentage(
        overCorrect,
        overPredictions,
      ),

    underPredictions,

    underCorrect,

    underAccuracy:
      percentage(
        underCorrect,
        underPredictions,
      ),

    averageConfidence:
      total >
      0
        ? round(
            confidenceSum /
            total,
            1,
          )
        : 0,

    averageExpectedTotal:
      total >
      0
        ? round(
            expectedSum /
            total,
            2,
          )
        : 0,

    rows,
  };
}

/* ==========================================
   Actual Stats
========================================== */

function actualStats(
  matches:
    PreparedMatch[],
) {
  const over =
    matches.filter(
      (
        match,
      ) =>
        match.actual ===
        "over",
    ).length;

  const under =
    matches.length -
    over;

  const averageTotal =
    matches.length >
    0
      ? round(
          matches.reduce(
            (
              sum,
              match,
            ) =>
              sum +
              match.actualTotal,
            0,
          ) /
            matches.length,
          2,
        )
      : 0;

  return {
    total:
      matches.length,

    over,

    under,

    overRate:
      percentage(
        over,
        matches.length,
      ),

    underRate:
      percentage(
        under,
        matches.length,
      ),

    averageTotal,
  };
}

/* ==========================================
   Majority Baseline
========================================== */

function getMajoritySide(
  matches:
    PreparedMatch[],
):
  TotalsSide {
  const stats =
    actualStats(
      matches,
    );

  return stats.over >=
    stats.under
    ? "over"
    : "under";
}

function evaluateBaseline(
  matches:
    PreparedMatch[],

  side:
    TotalsSide,
) {
  const correct =
    matches.filter(
      (
        match,
      ) =>
        match.actual ===
        side,
    ).length;

  return {
    prediction:
      side,

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
   Complexity
========================================== */

function complexity(
  params:
    TotalsModelParams,
) {
  return round(
    params.recentMatches *
      0.5 +
    params.attackWeight *
      10 +
    params.defenseWeight *
      10 +
    params
      .recentTotalWeight *
      10 +
    params
      .overTrendWeight *
      10 +
    params.homeGoalEdge *
      10,
  );
}

/* ==========================================
   Better Search Result
========================================== */

function isBetter(
  candidate:
    SearchResult,

  current:
    SearchResult |
    null,
) {
  if (
    !current
  ) {
    return true;
  }

  if (
    candidate.training
      .accuracy !==
    current.training
      .accuracy
  ) {
    return (
      candidate.training
        .accuracy >
      current.training
        .accuracy
    );
  }

  if (
    candidate.training
      .total !==
    current.training
      .total
  ) {
    return (
      candidate.training
        .total >
      current.training
        .total
    );
  }

  return (
    candidate.complexity <
    current.complexity
  );
}

/* ==========================================
   Confidence Analysis
========================================== */

function confidenceStats(
  rows:
    EvaluationRow[],

  min:
    number,

  max:
    number,
) {
  const selected =
    rows.filter(
      (
        row,
      ) =>
        row.confidence >=
          min &&
        row.confidence <
          max,
    );

  const correct =
    selected.filter(
      (
        row,
      ) =>
        row.correct,
    ).length;

  return {
    total:
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
   Edge Analysis
========================================== */

function edgeStats(
  rows:
    EvaluationRow[],

  minEdge:
    number,
) {
  const selected =
    rows.filter(
      (
        row,
      ) =>
        Math.abs(
          row.expectedTotal -
          TOTAL_LINE,
        ) >=
        minEdge,
    );

  const correct =
    selected.filter(
      (
        row,
      ) =>
        row.correct,
    ).length;

  return {
    minEdge,

    total:
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
    const startedAt =
      Date.now();

    console.log(
      "======================================",
    );

    console.log(
      "🚀 XSI Football Totals Backtest V2 FAST",
    );

    console.log(
      `${LEAGUE} ${SEASON}`,
    );

    console.log(
      `⚽ Line：${TOTAL_LINE}`,
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
       Load History
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

    const history =
      (
        data ??
        []
      ) as unknown as HistoryMatch[];

    console.log(
      `📊 History：${history.length}`,
    );

    /* ======================================
       Precompute Cache
    ====================================== */

    console.log(
      "⚡ Building historical cache...",
    );

    const prepared =
      prepareDatasetFast(
        history,
      );

    console.log(
      `✅ Cache Complete：${prepared.length}`,
    );

    /* ======================================
       Split
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

    /* ======================================
       Actual Totals
    ====================================== */

    const fullActual =
      actualStats(
        prepared,
      );

    const trainingActual =
      actualStats(
        trainingMatches,
      );

    const validationActual =
      actualStats(
        validationMatches,
      );

    /* ======================================
       Baseline
    ====================================== */

    const majoritySide =
      getMajoritySide(
        trainingMatches,
      );

    const baselineTraining =
      evaluateBaseline(
        trainingMatches,
        majoritySide,
      );

    const baselineValidation =
      evaluateBaseline(
        validationMatches,
        majoritySide,
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

    console.log(
      `🤖 V1 Training：${v1Training.correct}/${v1Training.total}｜${v1Training.accuracy}%`,
    );

    console.log(
      `🤖 V1 Validation：${v1Validation.correct}/${v1Validation.total}｜${v1Validation.accuracy}%`,
    );

    /* ======================================
       FAST GRID SEARCH
    ====================================== */

    console.log(
      "⚡ FAST Grid Search Start...",
    );

    let best:
      SearchResult |
      null =
      null;

    let testedModels =
      0;

    const topModels:
      SearchResult[] =
      [];

    for (
      const recentMatches
      of RECENT_MATCH_OPTIONS
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
            const recentTotalWeight
            of RECENT_TOTAL_WEIGHTS
          ) {
            for (
              const overTrendWeight
              of OVER_TREND_WEIGHTS
            ) {
              for (
                const homeGoalEdge
                of HOME_GOAL_EDGES
              ) {
                const params:
                  TotalsModelParams = {
                  recentMatches,

                  attackWeight,

                  defenseWeight,

                  recentTotalWeight,

                  overTrendWeight,

                  homeGoalEdge,
                };

                const training =
                  evaluateModel(
                    trainingMatches,
                    params,
                  );

                if (
                  training.total <
                  20
                ) {
                  continue;
                }

                const result:
                  SearchResult = {
                  params,

                  training,

                  complexity:
                    complexity(
                      params,
                    ),
                };

                testedModels +=
                  1;

                if (
                  isBetter(
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
      }
    }

    if (
      !best
    ) {
      throw new Error(
        "找不到有效 Totals Model",
      );
    }

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

        return (
          a.complexity -
          b.complexity
        );
      },
    );

    /* ======================================
       Validation
    ====================================== */

    const bestParams =
      best.params;

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
       Analysis
    ====================================== */

    const confidenceAnalysis = {
      "50-59":
        confidenceStats(
          bestValidation.rows,
          50,
          60,
        ),

      "60-69":
        confidenceStats(
          bestValidation.rows,
          60,
          70,
        ),

      "70-79":
        confidenceStats(
          bestValidation.rows,
          70,
          80,
        ),

      "80+":
        confidenceStats(
          bestValidation.rows,
          80,
          101,
        ),
    };

    const edgeAnalysis = {
      "0.10+":
        edgeStats(
          bestValidation.rows,
          0.1,
        ),

      "0.20+":
        edgeStats(
          bestValidation.rows,
          0.2,
        ),

      "0.30+":
        edgeStats(
          bestValidation.rows,
          0.3,
        ),

      "0.40+":
        edgeStats(
          bestValidation.rows,
          0.4,
        ),

      "0.50+":
        edgeStats(
          bestValidation.rows,
          0.5,
        ),

      "0.75+":
        edgeStats(
          bestValidation.rows,
          0.75,
        ),
    };

    const elapsedMs =
      Date.now() -
      startedAt;

    /* ======================================
       Logs
    ====================================== */

    console.log(
      "======================================",
    );

    console.log(
      `🔍 Tested Models：${testedModels}`,
    );

    console.log(
      "🏆 BEST TOTALS PARAMS：",
      bestParams,
    );

    console.log(
      `🏆 Training：${best.training.correct}/${best.training.total}｜${best.training.accuracy}%`,
    );

    console.log(
      `🧪 Validation：${bestValidation.correct}/${bestValidation.total}｜${bestValidation.accuracy}%`,
    );

    console.log(
      `🔺 Validation OVER：${bestValidation.overCorrect}/${bestValidation.overPredictions}｜${bestValidation.overAccuracy}%`,
    );

    console.log(
      `🔻 Validation UNDER：${bestValidation.underCorrect}/${bestValidation.underPredictions}｜${bestValidation.underAccuracy}%`,
    );

    console.log(
      `📈 vs Baseline：${round(
        bestValidation.accuracy -
        baselineValidation.accuracy,
        1,
      )}%`,
    );

    console.log(
      `📈 vs V1：${round(
        bestValidation.accuracy -
        v1Validation.accuracy,
        1,
      )}%`,
    );

    console.log(
      `⚡ Runtime：${elapsedMs} ms`,
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
        "XSI Football Totals Backtest V2 FAST",

      league:
        LEAGUE,

      season:
        SEASON,

      line:
        TOTAL_LINE,

      antiLookAheadBias:
        true,

      runtimeMs:
        elapsedMs,

      dataset: {
        totalHistory:
          history.length,

        prepared:
          prepared.length,

        training:
          trainingMatches.length,

        validation:
          validationMatches.length,
      },

      actualTotals: {
        full:
          fullActual,

        training:
          trainingActual,

        validation:
          validationActual,
      },

      baseline: {
        majoritySide,

        training:
          baselineTraining,

        validation:
          baselineValidation,
      },

      xsiV1: {
        params:
          V1_PARAMS,

        training: {
          total:
            v1Training.total,

          correct:
            v1Training.correct,

          accuracy:
            v1Training.accuracy,
        },

        validation: {
          total:
            v1Validation.total,

          correct:
            v1Validation.correct,

          accuracy:
            v1Validation.accuracy,
        },
      },

      search: {
        testedModels,

        gridSize:
          729,
      },

      bestModel: {
        params:
          bestParams,

        training: {
          total:
            best.training.total,

          correct:
            best.training.correct,

          accuracy:
            best.training.accuracy,

          overPredictions:
            best.training
              .overPredictions,

          overAccuracy:
            best.training
              .overAccuracy,

          underPredictions:
            best.training
              .underPredictions,

          underAccuracy:
            best.training
              .underAccuracy,
        },

        validation: {
          total:
            bestValidation.total,

          correct:
            bestValidation.correct,

          accuracy:
            bestValidation.accuracy,

          overPredictions:
            bestValidation
              .overPredictions,

          overCorrect:
            bestValidation
              .overCorrect,

          overAccuracy:
            bestValidation
              .overAccuracy,

          underPredictions:
            bestValidation
              .underPredictions,

          underCorrect:
            bestValidation
              .underCorrect,

          underAccuracy:
            bestValidation
              .underAccuracy,

          averageConfidence:
            bestValidation
              .averageConfidence,

          averageExpectedTotal:
            bestValidation
              .averageExpectedTotal,
        },

        fullDataset: {
          total:
            bestFull.total,

          correct:
            bestFull.correct,

          accuracy:
            bestFull.accuracy,
        },

        improvement: {
          validationVsBaseline:
            round(
              bestValidation
                .accuracy -
              baselineValidation
                .accuracy,
              1,
            ),

          validationVsV1:
            round(
              bestValidation
                .accuracy -
              v1Validation
                .accuracy,
              1,
            ),

          trainValidationGap:
            round(
              best.training
                .accuracy -
              bestValidation
                .accuracy,
              1,
            ),
        },

        confidenceAnalysis,

        edgeAnalysis,
      },

      topTrainingModels:
        topModels
          .slice(
            0,
            10,
          )
          .map(
            (
              item,
            ) => ({
              params:
                item.params,

              accuracy:
                item.training
                  .accuracy,

              correct:
                item.training
                  .correct,

              total:
                item.training
                  .total,

              complexity:
                item.complexity,
            }),
          ),

      validationSample:
        bestValidation.rows
          .slice(
            -20,
          )
          .reverse(),
    });
  } catch (
    error
  ) {
    console.error(
      "❌ XSI Football Totals FAST Error：",
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