import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic =
  "force-dynamic";

/* ==========================================
   XSI Football Totals V4

   WALK-FORWARD OUT-OF-SAMPLE

   2023/24
      ↓
   Test 2024/25

   2023/24 + 2024/25
      ↓
   Test 2025/26

   Model：
   - Poisson
   - Home / Away Attack
   - Home / Away Defense
   - Over / Under 2.5
   - PASS
   - Threshold Search

   重要：
   每一場只能使用該場比賽之前的資料。
========================================== */

const LEAGUE =
  "西甲";

const TOTAL_LINE =
  2.5;

const MIN_TEAM_MATCHES =
  4;

const MIN_LEAGUE_MATCHES =
  20;

const MIN_THRESHOLD_BETS =
  20;

const THRESHOLDS = [
  0.54,
  0.56,
  0.58,
  0.6,
  0.62,
  0.65,
];

/* ==========================================
   Seasons
========================================== */

const SEASONS = [
  "2023/24",
  "2024/25",
  "2025/26",
] as const;

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

  league: string;

  season: string;

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

type ProbabilityResult = {
  expectedHomeGoals: number;

  expectedAwayGoals: number;

  expectedTotal: number;

  overProbability: number;

  underProbability: number;
};

type EvaluationRow = {
  id: number;

  season: string;

  date: string;

  homeTeam: string;

  awayTeam: string;

  score: string;

  actual: TotalsSide;

  actualTotal: number;

  expectedHomeGoals: number;

  expectedAwayGoals: number;

  expectedTotal: number;

  overProbability: number;

  underProbability: number;

  prediction: PredictionSide;

  confidence: number;

  correct:
    boolean | null;
};

type ThresholdResult = {
  threshold: number;

  matches: number;

  bets: number;

  passes: number;

  wins: number;

  losses: number;

  winRate: number;

  betRate: number;

  overBets: number;

  overWins: number;

  overLosses: number;

  overWinRate: number;

  underBets: number;

  underWins: number;

  underLosses: number;

  underWinRate: number;

  rows: EvaluationRow[];
};

type SeasonEvaluation = {
  season: string;

  threshold: number;

  sourceTrainingSeasons:
    string[];

  training: {
    matches: number;

    bets: number;

    wins: number;

    losses: number;

    winRate: number;

    betRate: number;
  };

  validation:
    ThresholdResult;
};

/* ==========================================
   Helpers
========================================== */

function round(
  value: number,
  digits = 2,
) {
  const multiplier =
    10 ** digits;

  return (
    Math.round(
      value *
        multiplier,
    ) /
    multiplier
  );
}

function percentage(
  value: number,
  total: number,
) {
  if (
    total ===
    0
  ) {
    return 0;
  }

  return Number(
    (
      (
        value /
        total
      ) *
      100
    ).toFixed(
      1,
    ),
  );
}

function normalizeTeamName(
  value: string,
) {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function matchTime(
  match: HistoryMatch,
) {
  return new Date(
    match.match_date,
  ).getTime();
}

/* ==========================================
   Team Venue Stats

   history 已經只會傳入
   「該場之前可使用的資料」
========================================== */

function calculateTeamVenueStats({
  teamName,
  history,
  venue,
}: {
  teamName: string;

  history: HistoryMatch[];

  venue:
    | "home"
    | "away";
}): TeamVenueStats {
  const teamKey =
    normalizeTeamName(
      teamName,
    );

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

  return {
    matches,

    goalsFor,

    goalsAgainst,

    avgGoalsFor:
      goalsFor /
      matches,

    avgGoalsAgainst:
      goalsAgainst /
      matches,
  };
}

/* ==========================================
   League Stats
========================================== */

function calculateLeagueStats(
  history: HistoryMatch[],
): LeagueStats {
  if (
    history.length ===
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

  let homeGoals =
    0;

  let awayGoals =
    0;

  for (
    const match
    of history
  ) {
    homeGoals +=
      match.home_score;

    awayGoals +=
      match.away_score;
  }

  const avgHomeGoals =
    homeGoals /
    history.length;

  const avgAwayGoals =
    awayGoals /
    history.length;

  return {
    matches:
      history.length,

    avgHomeGoals,

    avgAwayGoals,

    avgTotalGoals:
      avgHomeGoals +
      avgAwayGoals,
  };
}

/* ==========================================
   Poisson
========================================== */

function factorial(
  value: number,
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
    i +=
      1
  ) {
    result *=
      i;
  }

  return result;
}

function poissonProbability(
  lambda: number,
  goals: number,
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

function calculateProbability({
  homeStats,
  awayStats,
  leagueStats,
}: {
  homeStats:
    TeamVenueStats;

  awayStats:
    TeamVenueStats;

  leagueStats:
    LeagueStats;
}): ProbabilityResult {
  const leagueHome =
    Math.max(
      leagueStats
        .avgHomeGoals,
      0.2,
    );

  const leagueAway =
    Math.max(
      leagueStats
        .avgAwayGoals,
      0.2,
    );

  /* ======================================
     Attack Strength
  ====================================== */

  const homeAttackStrength =
    homeStats
      .avgGoalsFor /
    leagueHome;

  const awayAttackStrength =
    awayStats
      .avgGoalsFor /
    leagueAway;

  /* ======================================
     Defense Weakness

     > 1：
     比聯盟平均容易失球
  ====================================== */

  const homeDefenseWeakness =
    homeStats
      .avgGoalsAgainst /
    leagueAway;

  const awayDefenseWeakness =
    awayStats
      .avgGoalsAgainst /
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
     Clamp

     避免極端值
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
     Under 2.5

     P(Total <= 2)
  ====================================== */

  let underProbability =
    0;

  for (
    let goals =
      0;
    goals <=
      2;
    goals +=
      1
  ) {
    underProbability +=
      poissonProbability(
        expectedTotal,
        goals,
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
   Evaluate Chronologically

   IMPORTANT：

   availableHistory 一開始只有
   過去賽季。

   每測完一場 target match，
   才把這場加入 availableHistory。

   所以不會偷看到未來比分。
========================================== */

function evaluateSeason({
  baseHistory,
  targetMatches,
  threshold,
}: {
  baseHistory:
    HistoryMatch[];

  targetMatches:
    HistoryMatch[];

  threshold:
    number;
}): ThresholdResult {
  const availableHistory =
    [...baseHistory]
      .sort(
        (
          a,
          b,
        ) =>
          matchTime(
            a,
          ) -
          matchTime(
            b,
          ),
      );

  const targets =
    [...targetMatches]
      .sort(
        (
          a,
          b,
        ) =>
          matchTime(
            a,
          ) -
          matchTime(
            b,
          ),
      );

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
    of targets
  ) {
    /*
     * 只保留該場開賽前
     * 真正已發生的比賽。
     */

    const currentTime =
      matchTime(
        match,
      );

    const usableHistory =
      availableHistory.filter(
        (
          oldMatch,
        ) =>
          matchTime(
            oldMatch,
          ) <
          currentTime,
      );

    const homeStats =
      calculateTeamVenueStats({
        teamName:
          match.home_team,

        history:
          usableHistory,

        venue:
          "home",
      });

    const awayStats =
      calculateTeamVenueStats({
        teamName:
          match.away_team,

        history:
          usableHistory,

        venue:
          "away",
      });

    const leagueStats =
      calculateLeagueStats(
        usableHistory,
      );

    /*
     * 球隊資料不足：
     * 直接 PASS。
     */

    if (
      homeStats.matches <
        MIN_TEAM_MATCHES ||
      awayStats.matches <
        MIN_TEAM_MATCHES ||
      leagueStats.matches <
        MIN_LEAGUE_MATCHES
    ) {
      rows.push({
        id:
          match.id,

        season:
          match.season,

        date:
          match.match_date,

        homeTeam:
          match.home_team,

        awayTeam:
          match.away_team,

        score:
          `${match.home_score}-${match.away_score}`,

        actual:
          match.home_score +
            match.away_score >
          TOTAL_LINE
            ? "over"
            : "under",

        actualTotal:
          match.home_score +
          match.away_score,

        expectedHomeGoals:
          0,

        expectedAwayGoals:
          0,

        expectedTotal:
          0,

        overProbability:
          0,

        underProbability:
          0,

        prediction:
          "pass",

        confidence:
          0,

        correct:
          null,
      });

      /*
       * 比賽結束後，
       * 才能加入歷史。
       */

      availableHistory.push(
        match,
      );

      continue;
    }

    const probability =
      calculateProbability({
        homeStats,
        awayStats,
        leagueStats,
      });

    let prediction:
      PredictionSide =
      "pass";

    let confidence =
      0;

    if (
      probability
        .overProbability >=
      threshold
    ) {
      prediction =
        "over";

      confidence =
        probability
          .overProbability;
    } else if (
      probability
        .underProbability >=
      threshold
    ) {
      prediction =
        "under";

      confidence =
        probability
          .underProbability;
    }

    const actualTotal =
      match.home_score +
      match.away_score;

    const actual:
      TotalsSide =
      actualTotal >
      TOTAL_LINE
        ? "over"
        : "under";

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
        actual;

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

      season:
        match.season,

      date:
        match.match_date,

      homeTeam:
        match.home_team,

      awayTeam:
        match.away_team,

      score:
        `${match.home_score}-${match.away_score}`,

      actual,

      actualTotal,

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

      confidence:
        round(
          confidence,
          4,
        ),

      correct,
    });

    /*
     * 到這裡才加入該場比分。
     */

    availableHistory.push(
      match,
    );
  }

  return {
    threshold,

    matches:
      targets.length,

    bets,

    passes:
      targets.length -
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
        targets.length,
      ),

    overBets,

    overWins,

    overLosses:
      overBets -
      overWins,

    overWinRate:
      percentage(
        overWins,
        overBets,
      ),

    underBets,

    underWins,

    underLosses:
      underBets -
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
   Training Evaluation

   用過去完整賽季做 Threshold Search。

   第一季本身也採 chronological，
   前面的比賽只用更早的比賽。
========================================== */

function evaluateTraining({
  matches,
  threshold,
}: {
  matches:
    HistoryMatch[];

  threshold:
    number;
}) {
  return evaluateSeason({
    baseHistory:
      [],

    targetMatches:
      matches,

    threshold,
  });
}

/* ==========================================
   Choose Threshold

   只允許使用 Training 結果。

   Validation 完全不能參與選擇。
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
        MIN_THRESHOLD_BETS,
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

      /*
       * 勝率相同：
       * 選出手數較多。
       */

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
      "========================================",
    );

    console.log(
      "🏆 XSI TOTALS V4 WALK-FORWARD",
    );

    console.log(
      "========================================",
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
       Load 3 Seasons
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
            "league",
            "season",
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
        .in(
          "season",
          [
            ...SEASONS,
          ],
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

    const allMatches =
      (
        data ??
        []
      ) as unknown as HistoryMatch[];

    /* ======================================
       Split Seasons
    ====================================== */

    const season2324 =
      allMatches.filter(
        (
          match,
        ) =>
          match.season ===
          "2023/24",
      );

    const season2425 =
      allMatches.filter(
        (
          match,
        ) =>
          match.season ===
          "2024/25",
      );

    const season2526 =
      allMatches.filter(
        (
          match,
        ) =>
          match.season ===
          "2025/26",
      );

    console.log(
      `📚 2023/24：${season2324.length}`,
    );

    console.log(
      `📚 2024/25：${season2425.length}`,
    );

    console.log(
      `📚 2025/26：${season2526.length}`,
    );

    if (
      season2324.length ===
        0 ||
      season2425.length ===
        0 ||
      season2526.length ===
        0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "三個賽季資料不完整",

          seasons: {
            "2023/24":
              season2324.length,

            "2024/25":
              season2425.length,

            "2025/26":
              season2526.length,
          },
        },
        {
          status:
            400,
        },
      );
    }

    /* ======================================
       WALK FORWARD #1

       TRAIN：
       2023/24

       TEST：
       2024/25
    ====================================== */

    console.log(
      "",
    );

    console.log(
      "========================================",
    );

    console.log(
      "🔬 WALK FORWARD #1",
    );

    console.log(
      "TRAIN：2023/24",
    );

    console.log(
      "TEST ：2024/25",
    );

    console.log(
      "========================================",
    );

    const training1Results =
      THRESHOLDS.map(
        (
          threshold,
        ) =>
          evaluateTraining({
            matches:
              season2324,

            threshold,
          }),
      );

    const bestTraining1 =
      chooseBestThreshold(
        training1Results,
      );

    if (
      !bestTraining1
    ) {
      throw new Error(
        "2023/24 Training 無法選出 Threshold",
      );
    }

    const threshold1 =
      bestTraining1.threshold;

    console.log(
      `🎯 Selected Threshold：${Math.round(
        threshold1 *
          100,
      )}%`,
    );

    console.log(
      `🏋️ Training：${bestTraining1.wins}/${bestTraining1.bets} = ${bestTraining1.winRate}%`,
    );

    const validation2425 =
      evaluateSeason({
        baseHistory:
          season2324,

        targetMatches:
          season2425,

        threshold:
          threshold1,
      });

    console.log(
      "",
    );

    console.log(
      "📅 2024/25 OOS",
    );

    console.log(
      `🎯 Bets：${validation2425.bets}`,
    );

    console.log(
      `✅ Wins：${validation2425.wins}`,
    );

    console.log(
      `❌ Losses：${validation2425.losses}`,
    );

    console.log(
      `📈 Win Rate：${validation2425.winRate}%`,
    );

    console.log(
      `⏭ PASS：${validation2425.passes}`,
    );

    console.log(
      `🔺 OVER：${validation2425.overWins}/${validation2425.overBets} = ${validation2425.overWinRate}%`,
    );

    console.log(
      `🔻 UNDER：${validation2425.underWins}/${validation2425.underBets} = ${validation2425.underWinRate}%`,
    );

    /* ======================================
       WALK FORWARD #2

       TRAIN：
       2023/24 + 2024/25

       TEST：
       2025/26
    ====================================== */

    const training2 =
      [
        ...season2324,
        ...season2425,
      ].sort(
        (
          a,
          b,
        ) =>
          matchTime(
            a,
          ) -
          matchTime(
            b,
          ),
      );

    console.log(
      "",
    );

    console.log(
      "========================================",
    );

    console.log(
      "🔬 WALK FORWARD #2",
    );

    console.log(
      "TRAIN：2023/24 + 2024/25",
    );

    console.log(
      "TEST ：2025/26",
    );

    console.log(
      "========================================",
    );

    const training2Results =
      THRESHOLDS.map(
        (
          threshold,
        ) =>
          evaluateTraining({
            matches:
              training2,

            threshold,
          }),
      );

    const bestTraining2 =
      chooseBestThreshold(
        training2Results,
      );

    if (
      !bestTraining2
    ) {
      throw new Error(
        "2023/24 + 2024/25 Training 無法選出 Threshold",
      );
    }

    const threshold2 =
      bestTraining2.threshold;

    console.log(
      `🎯 Selected Threshold：${Math.round(
        threshold2 *
          100,
      )}%`,
    );

    console.log(
      `🏋️ Training：${bestTraining2.wins}/${bestTraining2.bets} = ${bestTraining2.winRate}%`,
    );

    const validation2526 =
      evaluateSeason({
        baseHistory:
          training2,

        targetMatches:
          season2526,

        threshold:
          threshold2,
      });

    console.log(
      "",
    );

    console.log(
      "📅 2025/26 OOS",
    );

    console.log(
      `🎯 Bets：${validation2526.bets}`,
    );

    console.log(
      `✅ Wins：${validation2526.wins}`,
    );

    console.log(
      `❌ Losses：${validation2526.losses}`,
    );

    console.log(
      `📈 Win Rate：${validation2526.winRate}%`,
    );

    console.log(
      `⏭ PASS：${validation2526.passes}`,
    );

    console.log(
      `🔺 OVER：${validation2526.overWins}/${validation2526.overBets} = ${validation2526.overWinRate}%`,
    );

    console.log(
      `🔻 UNDER：${validation2526.underWins}/${validation2526.underBets} = ${validation2526.underWinRate}%`,
    );

    /* ======================================
       Combined OOS
    ====================================== */

    const combinedBets =
      validation2425.bets +
      validation2526.bets;

    const combinedWins =
      validation2425.wins +
      validation2526.wins;

    const combinedLosses =
      validation2425.losses +
      validation2526.losses;

    const combinedPasses =
      validation2425.passes +
      validation2526.passes;

    const combinedMatches =
      validation2425.matches +
      validation2526.matches;

    const combinedOverBets =
      validation2425.overBets +
      validation2526.overBets;

    const combinedOverWins =
      validation2425.overWins +
      validation2526.overWins;

    const combinedUnderBets =
      validation2425.underBets +
      validation2526.underBets;

    const combinedUnderWins =
      validation2425.underWins +
      validation2526.underWins;

    const combinedWinRate =
      percentage(
        combinedWins,
        combinedBets,
      );

    const combinedBetRate =
      percentage(
        combinedBets,
        combinedMatches,
      );

    const combinedOverWinRate =
      percentage(
        combinedOverWins,
        combinedOverBets,
      );

    const combinedUnderWinRate =
      percentage(
        combinedUnderWins,
        combinedUnderBets,
      );

    /* ======================================
       Final Logs
    ====================================== */

    console.log(
      "",
    );

    console.log(
      "========================================",
    );

    console.log(
      "📊 COMBINED OOS",
    );

    console.log(
      "========================================",
    );

    console.log(
      `⚽ Matches：${combinedMatches}`,
    );

    console.log(
      `🎯 Bets：${combinedBets}`,
    );

    console.log(
      `⏭ PASS：${combinedPasses}`,
    );

    console.log(
      `📊 Bet Rate：${combinedBetRate}%`,
    );

    console.log(
      `✅ Wins：${combinedWins}`,
    );

    console.log(
      `❌ Losses：${combinedLosses}`,
    );

    console.log(
      `🏆 Win Rate：${combinedWinRate}%`,
    );

    console.log(
      `🔺 OVER：${combinedOverWins}/${combinedOverBets} = ${combinedOverWinRate}%`,
    );

    console.log(
      `🔻 UNDER：${combinedUnderWins}/${combinedUnderBets} = ${combinedUnderWinRate}%`,
    );

    console.log(
      `⚡ Runtime：${
        Date.now() -
        startedAt
      } ms`,
    );

    console.log(
      "========================================",
    );

    /* ======================================
       Response
    ====================================== */

    return NextResponse.json({
      success:
        true,

      model:
        "XSI Football Totals V4 Walk-Forward",

      league:
        LEAGUE,

      line:
        TOTAL_LINE,

      methodology: {
        type:
          "walk-forward-out-of-sample",

        antiLookAheadBias:
          true,

        thresholdSelectedFromTrainingOnly:
          true,

        thresholds:
          THRESHOLDS,

        minTeamMatches:
          MIN_TEAM_MATCHES,

        minThresholdBets:
          MIN_THRESHOLD_BETS,
      },

      dataset: {
        total:
          allMatches.length,

        seasons: {
          "2023/24":
            season2324.length,

          "2024/25":
            season2425.length,

          "2025/26":
            season2526.length,
        },
      },

      walkForward: [
        {
          trainingSeasons: [
            "2023/24",
          ],

          testSeason:
            "2024/25",

          selectedThreshold:
            threshold1,

          training: {
            matches:
              bestTraining1.matches,

            bets:
              bestTraining1.bets,

            wins:
              bestTraining1.wins,

            losses:
              bestTraining1.losses,

            winRate:
              bestTraining1.winRate,

            betRate:
              bestTraining1.betRate,
          },

          validation: {
            matches:
              validation2425.matches,

            bets:
              validation2425.bets,

            passes:
              validation2425.passes,

            wins:
              validation2425.wins,

            losses:
              validation2425.losses,

            winRate:
              validation2425.winRate,

            betRate:
              validation2425.betRate,

            over: {
              bets:
                validation2425.overBets,

              wins:
                validation2425.overWins,

              losses:
                validation2425.overLosses,

              winRate:
                validation2425.overWinRate,
            },

            under: {
              bets:
                validation2425.underBets,

              wins:
                validation2425.underWins,

              losses:
                validation2425.underLosses,

              winRate:
                validation2425.underWinRate,
            },
          },
        },

        {
          trainingSeasons: [
            "2023/24",
            "2024/25",
          ],

          testSeason:
            "2025/26",

          selectedThreshold:
            threshold2,

          training: {
            matches:
              bestTraining2.matches,

            bets:
              bestTraining2.bets,

            wins:
              bestTraining2.wins,

            losses:
              bestTraining2.losses,

            winRate:
              bestTraining2.winRate,

            betRate:
              bestTraining2.betRate,
          },

          validation: {
            matches:
              validation2526.matches,

            bets:
              validation2526.bets,

            passes:
              validation2526.passes,

            wins:
              validation2526.wins,

            losses:
              validation2526.losses,

            winRate:
              validation2526.winRate,

            betRate:
              validation2526.betRate,

            over: {
              bets:
                validation2526.overBets,

              wins:
                validation2526.overWins,

              losses:
                validation2526.overLosses,

              winRate:
                validation2526.overWinRate,
            },

            under: {
              bets:
                validation2526.underBets,

              wins:
                validation2526.underWins,

              losses:
                validation2526.underLosses,

              winRate:
                validation2526.underWinRate,
            },
          },
        },
      ],

      combinedOOS: {
        matches:
          combinedMatches,

        bets:
          combinedBets,

        passes:
          combinedPasses,

        betRate:
          combinedBetRate,

        wins:
          combinedWins,

        losses:
          combinedLosses,

        winRate:
          combinedWinRate,

        over: {
          bets:
            combinedOverBets,

          wins:
            combinedOverWins,

          losses:
            combinedOverBets -
            combinedOverWins,

          winRate:
            combinedOverWinRate,
        },

        under: {
          bets:
            combinedUnderBets,

          wins:
            combinedUnderWins,

          losses:
            combinedUnderBets -
            combinedUnderWins,

          winRate:
            combinedUnderWinRate,
        },
      },

      recentPredictions: [
        ...validation2425.rows,
        ...validation2526.rows,
      ]
        .filter(
          (
            row,
          ) =>
            row.prediction !==
            "pass",
        )
        .slice(
          -30,
        )
        .reverse(),

      runtimeMs:
        Date.now() -
        startedAt,
    });
  } catch (
    error
  ) {
    console.error(
      "❌ Football Totals V4 Error：",
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