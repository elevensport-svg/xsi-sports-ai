import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic =
  "force-dynamic";

/* ==========================================
   XSI Football Totals Backtest V3

   核心：
   1. 西甲 2025/26
   2. Over / Under 2.5
   3. Poisson
   4. 主客場攻守強度
   5. League Baseline
   6. PASS 機制
   7. 70% Training / 30% Validation
   8. 無 Look-ahead Bias
========================================== */

const LEAGUE =
  "西甲";

const SEASON =
  "2025/26";

const TOTAL_LINE =
  2.5;

const TRAIN_RATIO =
  0.7;

const MIN_TEAM_MATCHES =
  4;

/* ==========================================
   Thresholds

   例如 0.60：
   Over >= 60% 才出手 Over
   Under >= 60% 才出手 Under
   否則 PASS
========================================== */

const THRESHOLDS = [
  0.54,
  0.56,
  0.58,
  0.6,
  0.62,
  0.65,
];

/* ==========================================
   Types
========================================== */

type TotalsSide =
  | "over"
  | "under";

type PredictionSide =
  | TotalsSide
  | "pass";

type HistoryMatch = {
  id: number;

  match_date: string;

  home_team: string;

  away_team: string;

  home_score: number;

  away_score: number;
};

type TeamVenueStats = {
  matches: number;

  goalsFor: number;

  goalsAgainst: number;

  avgGoalsFor: number;

  avgGoalsAgainst: number;
};

type LeagueStats = {
  matches: number;

  avgHomeGoals: number;

  avgAwayGoals: number;

  avgTotalGoals: number;
};

type PreparedMatch = {
  id: number;

  date: string;

  homeTeam: string;

  awayTeam: string;

  score: string;

  actualTotal: number;

  actual:
    TotalsSide;

  homeStats:
    TeamVenueStats;

  awayStats:
    TeamVenueStats;

  leagueStats:
    LeagueStats;
};

type ProbabilityResult = {
  expectedHomeGoals:
    number;

  expectedAwayGoals:
    number;

  expectedTotal:
    number;

  overProbability:
    number;

  underProbability:
    number;
};

type EvaluationRow = {
  id: number;

  date: string;

  homeTeam: string;

  awayTeam: string;

  score: string;

  actual:
    TotalsSide;

  actualTotal: number;

  expectedHomeGoals:
    number;

  expectedAwayGoals:
    number;

  expectedTotal:
    number;

  overProbability:
    number;

  underProbability:
    number;

  prediction:
    PredictionSide;

  correct:
    boolean | null;
};

type ThresholdResult = {
  threshold: number;

  totalMatches: number;

  bets: number;

  passes: number;

  wins: number;

  losses: number;

  winRate: number;

  betRate: number;

  overBets: number;

  overWins: number;

  overWinRate: number;

  underBets: number;

  underWins: number;

  underWinRate: number;

  rows:
    EvaluationRow[];
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
   Team Stats
========================================== */

function emptyTeamStats():
  TeamVenueStats {
  return {
    matches:
      0,

    goalsFor:
      0,

    goalsAgainst:
      0,

    avgGoalsFor:
      0,

    avgGoalsAgainst:
      0,
  };
}

function calculateTeamVenueStats({
  teamName,
  targetDate,
  history,
  venue,
}: {
  teamName:
    string;

  targetDate:
    string;

  history:
    HistoryMatch[];

  venue:
    "home" | "away";
}): TeamVenueStats {
  const teamKey =
    normalizeTeamName(
      teamName,
    );

  const targetTime =
    new Date(
      targetDate,
    ).getTime();

  let matches =
    0;

  let goalsFor =
    0;

  let goalsAgainst =
    0;

  for (
    const match
    of history
  ) {
    const matchTime =
      new Date(
        match.match_date,
      ).getTime();

    if (
      matchTime >=
      targetTime
    ) {
      break;
    }

    if (
      venue ===
      "home"
    ) {
      if (
        normalizeTeamName(
          match.home_team,
        ) !==
        teamKey
      ) {
        continue;
      }

      matches +=
        1;

      goalsFor +=
        match.home_score;

      goalsAgainst +=
        match.away_score;
    } else {
      if (
        normalizeTeamName(
          match.away_team,
        ) !==
        teamKey
      ) {
        continue;
      }

      matches +=
        1;

      goalsFor +=
        match.away_score;

      goalsAgainst +=
        match.home_score;
    }
  }

  if (
    matches ===
    0
  ) {
    return emptyTeamStats();
  }

  return {
    matches,

    goalsFor,

    goalsAgainst,

    avgGoalsFor:
      round(
        goalsFor /
        matches,
        3,
      ),

    avgGoalsAgainst:
      round(
        goalsAgainst /
        matches,
        3,
      ),
  };
}

/* ==========================================
   League Stats

   只用 targetDate 以前比賽
========================================== */

function calculateLeagueStats({
  targetDate,
  history,
}: {
  targetDate:
    string;

  history:
    HistoryMatch[];
}): LeagueStats {
  const targetTime =
    new Date(
      targetDate,
    ).getTime();

  let matches =
    0;

  let homeGoals =
    0;

  let awayGoals =
    0;

  for (
    const match
    of history
  ) {
    const matchTime =
      new Date(
        match.match_date,
      ).getTime();

    if (
      matchTime >=
      targetTime
    ) {
      break;
    }

    matches +=
      1;

    homeGoals +=
      match.home_score;

    awayGoals +=
      match.away_score;
  }

  if (
    matches ===
    0
  ) {
    return {
      matches:
        0,

      avgHomeGoals:
        0,

      avgAwayGoals:
        0,

      avgTotalGoals:
        0,
    };
  }

  const avgHomeGoals =
    homeGoals /
    matches;

  const avgAwayGoals =
    awayGoals /
    matches;

  return {
    matches,

    avgHomeGoals:
      round(
        avgHomeGoals,
        3,
      ),

    avgAwayGoals:
      round(
        avgAwayGoals,
        3,
      ),

    avgTotalGoals:
      round(
        avgHomeGoals +
        avgAwayGoals,
        3,
      ),
  };
}

/* ==========================================
   Poisson
========================================== */

function factorial(
  value:
    number,
) {
  if (
    value <=
    1
  ) {
    return 1;
  }

  let result =
    1;

  for (
    let i =
      2;
    i <=
      value;
    i++
  ) {
    result *=
      i;
  }

  return result;
}

function poissonProbability(
  lambda:
    number,

  goals:
    number,
) {
  return (
    Math.exp(
      -lambda,
    ) *
    Math.pow(
      lambda,
      goals,
    ) /
    factorial(
      goals,
    )
  );
}

/* ==========================================
   Expected Goals
========================================== */

function calculatePoissonProbabilities(
  match:
    PreparedMatch,
): ProbabilityResult {
  const {
    homeStats,
    awayStats,
    leagueStats,
  } =
    match;

  const leagueHome =
    Math.max(
      leagueStats.avgHomeGoals,
      0.2,
    );

  const leagueAway =
    Math.max(
      leagueStats.avgAwayGoals,
      0.2,
    );

  /* ======================================
     Attack Strength
  ====================================== */

  const homeAttackStrength =
    homeStats.avgGoalsFor /
    leagueHome;

  const awayAttackStrength =
    awayStats.avgGoalsFor /
    leagueAway;

  /* ======================================
     Defense Weakness

     > 1 = 比聯盟平均容易失球
  ====================================== */

  const homeDefenseWeakness =
    homeStats.avgGoalsAgainst /
    leagueAway;

  const awayDefenseWeakness =
    awayStats.avgGoalsAgainst /
    leagueHome;

  /* ======================================
     Lambda
  ====================================== */

  let expectedHomeGoals =
    leagueHome *
    homeAttackStrength *
    awayDefenseWeakness;

  let expectedAwayGoals =
    leagueAway *
    awayAttackStrength *
    homeDefenseWeakness;

  /* ======================================
     Safety Clamp

     避免極端小樣本
  ====================================== */

  expectedHomeGoals =
    Math.max(
      0.25,
      Math.min(
        3.5,
        expectedHomeGoals,
      ),
    );

  expectedAwayGoals =
    Math.max(
      0.2,
      Math.min(
        3.2,
        expectedAwayGoals,
      ),
    );

  const expectedTotal =
    expectedHomeGoals +
    expectedAwayGoals;

  /* ======================================
     P(Total <= 2)

     Under 2.5 =
     0球 + 1球 + 2球

     因為兩個獨立 Poisson 加總
     仍為 Poisson，
     lambda = home + away
  ====================================== */

  let underProbability =
    0;

  for (
    let totalGoals =
      0;
    totalGoals <=
      2;
    totalGoals++
  ) {
    underProbability +=
      poissonProbability(
        expectedTotal,
        totalGoals,
      );
  }

  const overProbability =
    1 -
    underProbability;

  return {
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

    expectedTotal:
      round(
        expectedTotal,
        3,
      ),

    overProbability:
      round(
        overProbability,
        4,
      ),

    underProbability:
      round(
        underProbability,
        4,
      ),
  };
}

/* ==========================================
   Prepare Dataset
========================================== */

function prepareDataset(
  history:
    HistoryMatch[],
) {
  const prepared:
    PreparedMatch[] =
    [];

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
    const homeStats =
      calculateTeamVenueStats({
        teamName:
          match.home_team,

        targetDate:
          match.match_date,

        history:
          sorted,

        venue:
          "home",
      });

    const awayStats =
      calculateTeamVenueStats({
        teamName:
          match.away_team,

        targetDate:
          match.match_date,

        history:
          sorted,

        venue:
          "away",
      });

    const leagueStats =
      calculateLeagueStats({
        targetDate:
          match.match_date,

        history:
          sorted,
      });

    if (
      homeStats.matches <
        MIN_TEAM_MATCHES ||
      awayStats.matches <
        MIN_TEAM_MATCHES ||
      leagueStats.matches <
        20
    ) {
      continue;
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

      score:
        `${match.home_score}-${match.away_score}`,

      actualTotal,

      actual:
        actualTotal >
        TOTAL_LINE
          ? "over"
          : "under",

      homeStats,

      awayStats,

      leagueStats,
    });
  }

  return prepared;
}

/* ==========================================
   Threshold Evaluation
========================================== */

function evaluateThreshold({
  matches,
  threshold,
}: {
  matches:
    PreparedMatch[];

  threshold:
    number;
}): ThresholdResult {
  const rows:
    EvaluationRow[] =
    [];

  let bets =
    0;

  let wins =
    0;

  let losses =
    0;

  let overBets =
    0;

  let overWins =
    0;

  let underBets =
    0;

  let underWins =
    0;

  for (
    const match
    of matches
  ) {
    const probability =
      calculatePoissonProbabilities(
        match,
      );

    let prediction:
      PredictionSide =
      "pass";

    if (
      probability
        .overProbability >=
      threshold
    ) {
      prediction =
        "over";
    } else if (
      probability
        .underProbability >=
      threshold
    ) {
      prediction =
        "under";
    }

    let correct:
      boolean | null =
      null;

    if (
      prediction !==
      "pass"
    ) {
      bets +=
        1;

      correct =
        prediction ===
        match.actual;

      if (
        correct
      ) {
        wins +=
          1;
      } else {
        losses +=
          1;
      }

      if (
        prediction ===
        "over"
      ) {
        overBets +=
          1;

        if (
          correct
        ) {
          overWins +=
            1;
        }
      }

      if (
        prediction ===
        "under"
      ) {
        underBets +=
          1;

        if (
          correct
        ) {
          underWins +=
            1;
        }
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

      actualTotal:
        match.actualTotal,

      expectedHomeGoals:
        probability
          .expectedHomeGoals,

      expectedAwayGoals:
        probability
          .expectedAwayGoals,

      expectedTotal:
        probability
          .expectedTotal,

      overProbability:
        probability
          .overProbability,

      underProbability:
        probability
          .underProbability,

      prediction,

      correct,
    });
  }

  return {
    threshold,

    totalMatches:
      matches.length,

    bets,

    passes:
      matches.length -
      bets,

    wins,

    losses,

    winRate:
      percentage(
        wins,
        bets,
      ),

    betRate:
      percentage(
        bets,
        matches.length,
      ),

    overBets,

    overWins,

    overWinRate:
      percentage(
        overWins,
        overBets,
      ),

    underBets,

    underWins,

    underWinRate:
      percentage(
        underWins,
        underBets,
      ),

    rows,
  };
}

/* ==========================================
   Best Training Threshold

   先看：
   1. 至少 20 注
   2. Training 勝率最高
   3. 同分時出手較多
========================================== */

function chooseBestThreshold(
  results:
    ThresholdResult[],
) {
  const eligible =
    results.filter(
      (
        result,
      ) =>
        result.bets >=
        20,
    );

  if (
    eligible.length ===
    0
  ) {
    return null;
  }

  return [
    ...eligible,
  ].sort(
    (
      a,
      b,
    ) => {
      if (
        b.winRate !==
        a.winRate
      ) {
        return (
          b.winRate -
          a.winRate
        );
      }

      return (
        b.bets -
        a.bets
      );
    },
  )[0];
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
      "⚽ XSI Football Totals V3 Poisson",
    );

    console.log(
      `${LEAGUE} ${SEASON}`,
    );

    console.log(
      `Line：${TOTAL_LINE}`,
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
      throw new Error(
        error.message,
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
       Prepare
    ====================================== */

    const prepared =
      prepareDataset(
        history,
      );

    console.log(
      `✅ Prepared：${prepared.length}`,
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
            "Poisson 有效回測樣本不足",

          prepared:
            prepared.length,
        },
        {
          status:
            400,
        },
      );
    }

    /* ======================================
       Split
    ====================================== */

    const splitIndex =
      Math.floor(
        prepared.length *
        TRAIN_RATIO,
      );

    const training =
      prepared.slice(
        0,
        splitIndex,
      );

    const validation =
      prepared.slice(
        splitIndex,
      );

    console.log(
      `📘 Training：${training.length}`,
    );

    console.log(
      `📗 Validation：${validation.length}`,
    );

    /* ======================================
       Training Threshold Search
    ====================================== */

    const trainingThresholds =
      THRESHOLDS.map(
        (
          threshold,
        ) =>
          evaluateThreshold({
            matches:
              training,

            threshold,
          }),
      );

    const bestTraining =
      chooseBestThreshold(
        trainingThresholds,
      );

    if (
      !bestTraining
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "沒有符合最小下注樣本的 Threshold",
        },
        {
          status:
            400,
        },
      );
    }

    const bestThreshold =
      bestTraining.threshold;

    /* ======================================
       Validation

       第一次使用 Validation。
    ====================================== */

    const validationThresholds =
      THRESHOLDS.map(
        (
          threshold,
        ) =>
          evaluateThreshold({
            matches:
              validation,

            threshold,
          }),
      );

    const bestValidation =
      evaluateThreshold({
        matches:
          validation,

        threshold:
          bestThreshold,
      });

    /* ======================================
       Logs
    ====================================== */

    console.log(
      "======================================",
    );

    console.log(
      "📘 TRAINING THRESHOLDS",
    );

    for (
      const result
      of trainingThresholds
    ) {
      console.log(
        `${Math.round(
          result.threshold *
          100,
        )}%｜${result.wins}/${result.bets}｜${result.winRate}%｜Bet Rate ${result.betRate}%`,
      );
    }

    console.log(
      "--------------------------------------",
    );

    console.log(
      `🏆 Best Training Threshold：${Math.round(
        bestThreshold *
        100,
      )}%`,
    );

    console.log(
      `🏆 Training：${bestTraining.wins}/${bestTraining.bets}｜${bestTraining.winRate}%`,
    );

    console.log(
      "--------------------------------------",
    );

    console.log(
      `🧪 Validation：${bestValidation.wins}/${bestValidation.bets}｜${bestValidation.winRate}%`,
    );

    console.log(
      `📌 Validation PASS：${bestValidation.passes}`,
    );

    console.log(
      `🔺 OVER：${bestValidation.overWins}/${bestValidation.overBets}｜${bestValidation.overWinRate}%`,
    );

    console.log(
      `🔻 UNDER：${bestValidation.underWins}/${bestValidation.underBets}｜${bestValidation.underWinRate}%`,
    );

    console.log(
      `⚡ Runtime：${
        Date.now() -
        startedAt
      } ms`,
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
        "XSI Football Totals V3 Poisson",

      league:
        LEAGUE,

      season:
        SEASON,

      line:
        TOTAL_LINE,

      antiLookAheadBias:
        true,

      runtimeMs:
        Date.now() -
        startedAt,

      dataset: {
        history:
          history.length,

        prepared:
          prepared.length,

        training:
          training.length,

        validation:
          validation.length,
      },

      thresholdSearch: {
        thresholds:
          THRESHOLDS,

        training:
          trainingThresholds.map(
            (
              result,
            ) => ({
              threshold:
                result.threshold,

              bets:
                result.bets,

              wins:
                result.wins,

              losses:
                result.losses,

              winRate:
                result.winRate,

              betRate:
                result.betRate,

              overBets:
                result.overBets,

              overWinRate:
                result.overWinRate,

              underBets:
                result.underBets,

              underWinRate:
                result.underWinRate,
            }),
          ),

        validation:
          validationThresholds.map(
            (
              result,
            ) => ({
              threshold:
                result.threshold,

              bets:
                result.bets,

              wins:
                result.wins,

              losses:
                result.losses,

              winRate:
                result.winRate,

              betRate:
                result.betRate,

              overBets:
                result.overBets,

              overWinRate:
                result.overWinRate,

              underBets:
                result.underBets,

              underWinRate:
                result.underWinRate,
            }),
          ),
      },

      selectedModel: {
        threshold:
          bestThreshold,

        training: {
          matches:
            bestTraining
              .totalMatches,

          bets:
            bestTraining.bets,

          passes:
            bestTraining.passes,

          wins:
            bestTraining.wins,

          losses:
            bestTraining.losses,

          winRate:
            bestTraining.winRate,

          betRate:
            bestTraining.betRate,

          over: {
            bets:
              bestTraining
                .overBets,

            wins:
              bestTraining
                .overWins,

            winRate:
              bestTraining
                .overWinRate,
          },

          under: {
            bets:
              bestTraining
                .underBets,

            wins:
              bestTraining
                .underWins,

            winRate:
              bestTraining
                .underWinRate,
          },
        },

        validation: {
          matches:
            bestValidation
              .totalMatches,

          bets:
            bestValidation.bets,

          passes:
            bestValidation.passes,

          wins:
            bestValidation.wins,

          losses:
            bestValidation.losses,

          winRate:
            bestValidation.winRate,

          betRate:
            bestValidation.betRate,

          over: {
            bets:
              bestValidation
                .overBets,

            wins:
              bestValidation
                .overWins,

            winRate:
              bestValidation
                .overWinRate,
          },

          under: {
            bets:
              bestValidation
                .underBets,

            wins:
              bestValidation
                .underWins,

            winRate:
              bestValidation
                .underWinRate,
          },
        },

        trainValidationGap:
          round(
            bestTraining.winRate -
            bestValidation.winRate,
            1,
          ),
      },

      validationSample:
        bestValidation.rows
          .filter(
            (
              row,
            ) =>
              row.prediction !==
              "pass",
          )
          .slice(
            -20,
          )
          .reverse(),
    });
  } catch (
    error
  ) {
    console.error(
      "❌ Football Totals V3 Error：",
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