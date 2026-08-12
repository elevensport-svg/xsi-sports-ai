/* ==========================================
   XSI Football Totals Model

   Production Model

   V5 / V6 驗證後固定：

   OVER Threshold  = 65%
   UNDER Threshold = 56%

   核心：
   - 主隊主場攻守
   - 客隊客場攻守
   - 聯盟平均進球
   - Poisson
   - Over / Under 2.5
   - Dual Threshold
   - PASS
========================================== */

export const FOOTBALL_TOTAL_LINE =
  2.5;

export const FOOTBALL_OVER_THRESHOLD =
  0.65;

export const FOOTBALL_UNDER_THRESHOLD =
  0.56;

export const FOOTBALL_TOTALS_MIN_TEAM_MATCHES =
  4;

export const FOOTBALL_TOTALS_MIN_LEAGUE_MATCHES =
  20;

/* ==========================================
   Types
========================================== */

export type FootballTotalsSide =
  | "over"
  | "under"
  | "pass";

export type FootballHistoryMatch = {
  match_date: string;

  home_team: string;

  away_team: string;

  home_score: number;

  away_score: number;
};

export type FootballTotalsInput = {
  homeTeam: string;

  awayTeam: string;

  kickoff:
    string | Date;

  history:
    FootballHistoryMatch[];
};

export type FootballTotalsTeamStats = {
  matches: number;

  goalsFor: number;

  goalsAgainst: number;

  averageGoalsFor: number;

  averageGoalsAgainst: number;
};

export type FootballTotalsLeagueStats = {
  matches: number;

  averageHomeGoals: number;

  averageAwayGoals: number;

  averageTotalGoals: number;
};

export type FootballTotalsPrediction = {
  qualified: boolean;

  prediction:
    FootballTotalsSide;

  market:
    "TOTALS_2_5";

  line: number;

  recommendation:
    string;

  confidence:
    number;

  overProbability:
    number;

  underProbability:
    number;

  expectedHomeGoals:
    number;

  expectedAwayGoals:
    number;

  expectedTotal:
    number;

  thresholds: {
    over:
      number;

    under:
      number;
  };

  sample: {
    homeMatches:
      number;

    awayMatches:
      number;

    leagueMatches:
      number;
  };

  reasons:
    string[];
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

function normalizeTeamName(
  value:
    string,
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

function toTime(
  value:
    string | Date,
) {
  return value instanceof
    Date
    ? value.getTime()
    : new Date(
        value,
      ).getTime();
}

/* ==========================================
   Team Venue Stats
========================================== */

function calculateTeamVenueStats({
  teamName,
  history,
  venue,
}: {
  teamName:
    string;

  history:
    FootballHistoryMatch[];

  venue:
    "home" | "away";
}): FootballTotalsTeamStats {
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

  return {
    matches,

    goalsFor,

    goalsAgainst,

    averageGoalsFor:
      matches >
      0
        ? goalsFor /
          matches
        : 0,

    averageGoalsAgainst:
      matches >
      0
        ? goalsAgainst /
          matches
        : 0,
  };
}

/* ==========================================
   League Stats
========================================== */

function calculateLeagueStats(
  history:
    FootballHistoryMatch[],
): FootballTotalsLeagueStats {
  if (
    history.length ===
    0
  ) {
    return {
      matches:
        0,

      averageHomeGoals:
        0,

      averageAwayGoals:
        0,

      averageTotalGoals:
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

  const averageHomeGoals =
    homeGoals /
    history.length;

  const averageAwayGoals =
    awayGoals /
    history.length;

  return {
    matches:
      history.length,

    averageHomeGoals,

    averageAwayGoals,

    averageTotalGoals:
      averageHomeGoals +
      averageAwayGoals,
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
    i +=
      1
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
   Main Prediction
========================================== */

export function calculateFootballTotalsPrediction({
  homeTeam,
  awayTeam,
  kickoff,
  history,
}: FootballTotalsInput): FootballTotalsPrediction {
  const kickoffTime =
    toTime(
      kickoff,
    );

  /*
   * 正式預測非常重要：
   * 只允許使用 kickoff 以前的比賽。
   */
  const usableHistory =
    history
      .filter(
        (
          match,
        ) => {
          const time =
            toTime(
              match.match_date,
            );

          return (
            Number.isFinite(
              time,
            ) &&
            time <
              kickoffTime
          );
        },
      )
      .sort(
        (
          a,
          b,
        ) =>
          toTime(
            a.match_date,
          ) -
          toTime(
            b.match_date,
          ),
      );

  const homeStats =
    calculateTeamVenueStats({
      teamName:
        homeTeam,

      history:
        usableHistory,

      venue:
        "home",
    });

  const awayStats =
    calculateTeamVenueStats({
      teamName:
        awayTeam,

      history:
        usableHistory,

      venue:
        "away",
    });

  const leagueStats =
    calculateLeagueStats(
      usableHistory,
    );

  /* ======================================
     Sample Check
  ====================================== */

  if (
    homeStats.matches <
      FOOTBALL_TOTALS_MIN_TEAM_MATCHES ||
    awayStats.matches <
      FOOTBALL_TOTALS_MIN_TEAM_MATCHES ||
    leagueStats.matches <
      FOOTBALL_TOTALS_MIN_LEAGUE_MATCHES
  ) {
    return {
      qualified:
        false,

      prediction:
        "pass",

      market:
        "TOTALS_2_5",

      line:
        FOOTBALL_TOTAL_LINE,

      recommendation:
        "PASS",

      confidence:
        0,

      overProbability:
        0,

      underProbability:
        0,

      expectedHomeGoals:
        0,

      expectedAwayGoals:
        0,

      expectedTotal:
        0,

      thresholds: {
        over:
          FOOTBALL_OVER_THRESHOLD,

        under:
          FOOTBALL_UNDER_THRESHOLD,
      },

      sample: {
        homeMatches:
          homeStats.matches,

        awayMatches:
          awayStats.matches,

        leagueMatches:
          leagueStats.matches,
      },

      reasons: [
        "歷史樣本不足",
        `主隊主場樣本 ${homeStats.matches} 場`,
        `客隊客場樣本 ${awayStats.matches} 場`,
        `聯盟歷史樣本 ${leagueStats.matches} 場`,
      ],
    };
  }

  /* ======================================
     League Baseline
  ====================================== */

  const leagueHome =
    Math.max(
      leagueStats
        .averageHomeGoals,
      0.2,
    );

  const leagueAway =
    Math.max(
      leagueStats
        .averageAwayGoals,
      0.2,
    );

  /* ======================================
     Attack Strength
  ====================================== */

  const homeAttackStrength =
    homeStats
      .averageGoalsFor /
    leagueHome;

  const awayAttackStrength =
    awayStats
      .averageGoalsFor /
    leagueAway;

  /* ======================================
     Defense Weakness
  ====================================== */

  const homeDefenseWeakness =
    homeStats
      .averageGoalsAgainst /
    leagueAway;

  const awayDefenseWeakness =
    awayStats
      .averageGoalsAgainst /
    leagueHome;

  /* ======================================
     Expected Goals Lambda
  ====================================== */

  let expectedHomeGoals =
    leagueHome *
    homeAttackStrength *
    awayDefenseWeakness;

  let expectedAwayGoals =
    leagueAway *
    awayAttackStrength *
    homeDefenseWeakness;

  /*
   * 沿用 V5 / V6 clamp。
   */
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

     P(total <= 2)
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

  /* ======================================
     Dual Threshold
  ====================================== */

  let prediction:
    FootballTotalsSide =
    "pass";

  let recommendation =
    "PASS";

  let confidence =
    Math.max(
      overProbability,
      underProbability,
    );

  if (
    overProbability >=
    FOOTBALL_OVER_THRESHOLD
  ) {
    prediction =
      "over";

    recommendation =
      "大 2.5";

    confidence =
      overProbability;
  } else if (
    underProbability >=
    FOOTBALL_UNDER_THRESHOLD
  ) {
    prediction =
      "under";

    recommendation =
      "小 2.5";

    confidence =
      underProbability;
  }

  const qualified =
    prediction !==
    "pass";

  /* ======================================
     Reasons
  ====================================== */

  const reasons:
    string[] =
    [];

  reasons.push(
    `預期總進球 ${round(
      expectedTotal,
      2,
    )}`,
  );

  reasons.push(
    `主隊預期進球 ${round(
      expectedHomeGoals,
      2,
    )}`,
  );

  reasons.push(
    `客隊預期進球 ${round(
      expectedAwayGoals,
      2,
    )}`,
  );

  reasons.push(
    `大 2.5 機率 ${round(
      overProbability *
        100,
      1,
    )}%`,
  );

  reasons.push(
    `小 2.5 機率 ${round(
      underProbability *
        100,
      1,
    )}%`,
  );

  if (
    prediction ===
    "over"
  ) {
    reasons.push(
      `大球機率達到 ${round(
        FOOTBALL_OVER_THRESHOLD *
          100,
        0,
      )}% 出手門檻`,
    );
  } else if (
    prediction ===
    "under"
  ) {
    reasons.push(
      `小球機率達到 ${round(
        FOOTBALL_UNDER_THRESHOLD *
          100,
        0,
      )}% 出手門檻`,
    );
  } else {
    reasons.push(
      "大小球訊號未達出手門檻",
    );
  }

  return {
    qualified,

    prediction,

    market:
      "TOTALS_2_5",

    line:
      FOOTBALL_TOTAL_LINE,

    recommendation,

    confidence:
      round(
        confidence *
          100,
        1,
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

    thresholds: {
      over:
        FOOTBALL_OVER_THRESHOLD,

      under:
        FOOTBALL_UNDER_THRESHOLD,
    },

    sample: {
      homeMatches:
        homeStats.matches,

      awayMatches:
        awayStats.matches,

      leagueMatches:
        leagueStats.matches,
    },

    reasons,
  };
}