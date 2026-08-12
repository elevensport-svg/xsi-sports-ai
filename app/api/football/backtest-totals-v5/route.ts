import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/* =========================================================
   XSI Football Totals V5
   Dual Threshold Walk-Forward Out-of-Sample

   WF1: train 2023/24 -> test 2024/25
   WF2: train 2023/24 + 2024/25 -> test 2025/26

   V5 change:
   - OVER threshold selected independently
   - UNDER threshold selected independently
   - Validation never participates in threshold selection
   - Every match only sees matches played before kickoff
========================================================= */

const LEAGUE = "西甲";
const TOTAL_LINE = 2.5;
const MIN_TEAM_MATCHES = 4;
const MIN_LEAGUE_MATCHES = 20;
const MIN_SIDE_BETS = 20;

const THRESHOLDS = [0.54, 0.56, 0.58, 0.6, 0.62, 0.65];

const SEASONS = ["2023/24", "2024/25", "2025/26"] as const;

type TotalsSide = "over" | "under";
type PredictionSide = TotalsSide | "pass";

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
  correct: boolean | null;
};

type EvaluationResult = {
  overThreshold: number;
  underThreshold: number;
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

type SideThresholdResult = {
  side: TotalsSide;
  threshold: number;
  bets: number;
  wins: number;
  losses: number;
  winRate: number;
};

function round(value: number, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function percentage(value: number, total: number) {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function normalizeTeamName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

function matchTime(match: HistoryMatch) {
  return new Date(match.match_date).getTime();
}

function calculateTeamVenueStats({
  teamName,
  history,
  venue,
}: {
  teamName: string;
  history: HistoryMatch[];
  venue: "home" | "away";
}): TeamVenueStats {
  const teamKey = normalizeTeamName(teamName);

  let matches = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const match of history) {
    if (venue === "home") {
      if (normalizeTeamName(match.home_team) !== teamKey) continue;

      matches += 1;
      goalsFor += match.home_score;
      goalsAgainst += match.away_score;
    } else {
      if (normalizeTeamName(match.away_team) !== teamKey) continue;

      matches += 1;
      goalsFor += match.away_score;
      goalsAgainst += match.home_score;
    }
  }

  return {
    matches,
    goalsFor,
    goalsAgainst,
    avgGoalsFor: matches > 0 ? goalsFor / matches : 0,
    avgGoalsAgainst: matches > 0 ? goalsAgainst / matches : 0,
  };
}

function calculateLeagueStats(history: HistoryMatch[]): LeagueStats {
  if (history.length === 0) {
    return {
      matches: 0,
      avgHomeGoals: 0,
      avgAwayGoals: 0,
      avgTotalGoals: 0,
    };
  }

  let homeGoals = 0;
  let awayGoals = 0;

  for (const match of history) {
    homeGoals += match.home_score;
    awayGoals += match.away_score;
  }

  const avgHomeGoals = homeGoals / history.length;
  const avgAwayGoals = awayGoals / history.length;

  return {
    matches: history.length,
    avgHomeGoals,
    avgAwayGoals,
    avgTotalGoals: avgHomeGoals + avgAwayGoals,
  };
}

function factorial(value: number) {
  if (value <= 1) return 1;

  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
}

function poissonProbability(lambda: number, goals: number) {
  return (
    (Math.exp(-lambda) * Math.pow(lambda, goals)) /
    factorial(goals)
  );
}

function calculateProbability({
  homeStats,
  awayStats,
  leagueStats,
}: {
  homeStats: TeamVenueStats;
  awayStats: TeamVenueStats;
  leagueStats: LeagueStats;
}): ProbabilityResult {
  const leagueHome = Math.max(leagueStats.avgHomeGoals, 0.2);
  const leagueAway = Math.max(leagueStats.avgAwayGoals, 0.2);

  const homeAttackStrength =
    homeStats.avgGoalsFor / leagueHome;

  const awayAttackStrength =
    awayStats.avgGoalsFor / leagueAway;

  const homeDefenseWeakness =
    homeStats.avgGoalsAgainst / leagueAway;

  const awayDefenseWeakness =
    awayStats.avgGoalsAgainst / leagueHome;

  let expectedHomeGoals =
    leagueHome *
    homeAttackStrength *
    awayDefenseWeakness;

  let expectedAwayGoals =
    leagueAway *
    awayAttackStrength *
    homeDefenseWeakness;

  expectedHomeGoals = Math.max(
    0.25,
    Math.min(3.5, expectedHomeGoals),
  );

  expectedAwayGoals = Math.max(
    0.2,
    Math.min(3.2, expectedAwayGoals),
  );

  const expectedTotal =
    expectedHomeGoals + expectedAwayGoals;

  let underProbability = 0;

  for (let goals = 0; goals <= 2; goals += 1) {
    underProbability += poissonProbability(
      expectedTotal,
      goals,
    );
  }

  const overProbability = 1 - underProbability;

  return {
    expectedHomeGoals: round(expectedHomeGoals, 3),
    expectedAwayGoals: round(expectedAwayGoals, 3),
    expectedTotal: round(expectedTotal, 3),
    overProbability: round(overProbability, 4),
    underProbability: round(underProbability, 4),
  };
}

/*
 * Core chronological evaluator.
 *
 * Important:
 * A target match is added to availableHistory only AFTER
 * that match has been predicted/evaluated.
 */
function evaluateSeason({
  baseHistory,
  targetMatches,
  overThreshold,
  underThreshold,
}: {
  baseHistory: HistoryMatch[];
  targetMatches: HistoryMatch[];
  overThreshold: number;
  underThreshold: number;
}): EvaluationResult {
  const availableHistory = [...baseHistory].sort(
    (a, b) => matchTime(a) - matchTime(b),
  );

  const targets = [...targetMatches].sort(
    (a, b) => matchTime(a) - matchTime(b),
  );

  const rows: EvaluationRow[] = [];

  let bets = 0;
  let wins = 0;
  let losses = 0;

  let overBets = 0;
  let overWins = 0;

  let underBets = 0;
  let underWins = 0;

  for (const match of targets) {
    const currentTime = matchTime(match);

    const usableHistory = availableHistory.filter(
      (oldMatch) => matchTime(oldMatch) < currentTime,
    );

    const homeStats = calculateTeamVenueStats({
      teamName: match.home_team,
      history: usableHistory,
      venue: "home",
    });

    const awayStats = calculateTeamVenueStats({
      teamName: match.away_team,
      history: usableHistory,
      venue: "away",
    });

    const leagueStats =
      calculateLeagueStats(usableHistory);

    const actualTotal =
      match.home_score + match.away_score;

    const actual: TotalsSide =
      actualTotal > TOTAL_LINE ? "over" : "under";

    if (
      homeStats.matches < MIN_TEAM_MATCHES ||
      awayStats.matches < MIN_TEAM_MATCHES ||
      leagueStats.matches < MIN_LEAGUE_MATCHES
    ) {
      rows.push({
        id: match.id,
        season: match.season,
        date: match.match_date,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        score: `${match.home_score}-${match.away_score}`,
        actual,
        actualTotal,
        expectedHomeGoals: 0,
        expectedAwayGoals: 0,
        expectedTotal: 0,
        overProbability: 0,
        underProbability: 0,
        prediction: "pass",
        confidence: 0,
        correct: null,
      });

      availableHistory.push(match);
      continue;
    }

    const probability = calculateProbability({
      homeStats,
      awayStats,
      leagueStats,
    });

    let prediction: PredictionSide = "pass";
    let confidence = 0;

    /*
     * At O/U 2.5, P(over) + P(under) = 1.
     * With thresholds > 0.50 both sides cannot qualify together.
     */
    if (probability.overProbability >= overThreshold) {
      prediction = "over";
      confidence = probability.overProbability;
    } else if (
      probability.underProbability >= underThreshold
    ) {
      prediction = "under";
      confidence = probability.underProbability;
    }

    let correct: boolean | null = null;

    if (prediction !== "pass") {
      bets += 1;
      correct = prediction === actual;

      if (correct) wins += 1;
      else losses += 1;

      if (prediction === "over") {
        overBets += 1;
        if (correct) overWins += 1;
      }

      if (prediction === "under") {
        underBets += 1;
        if (correct) underWins += 1;
      }
    }

    rows.push({
      id: match.id,
      season: match.season,
      date: match.match_date,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      score: `${match.home_score}-${match.away_score}`,
      actual,
      actualTotal,
      expectedHomeGoals: probability.expectedHomeGoals,
      expectedAwayGoals: probability.expectedAwayGoals,
      expectedTotal: probability.expectedTotal,
      overProbability: probability.overProbability,
      underProbability: probability.underProbability,
      prediction,
      confidence: round(confidence, 4),
      correct,
    });

    availableHistory.push(match);
  }

  return {
    overThreshold,
    underThreshold,
    matches: targets.length,
    bets,
    passes: targets.length - bets,
    wins,
    losses,
    winRate: percentage(wins, bets),
    betRate: percentage(bets, targets.length),
    overBets,
    overWins,
    overLosses: overBets - overWins,
    overWinRate: percentage(overWins, overBets),
    underBets,
    underWins,
    underLosses: underBets - underWins,
    underWinRate: percentage(underWins, underBets),
    rows,
  };
}

function evaluateTrainingSide({
  matches,
  side,
  threshold,
}: {
  matches: HistoryMatch[];
  side: TotalsSide;
  threshold: number;
}): SideThresholdResult {
  /*
   * Make the opposite side impossible to trigger.
   * This lets us measure each side independently.
   */
  const result = evaluateSeason({
    baseHistory: [],
    targetMatches: matches,
    overThreshold:
      side === "over" ? threshold : 1.01,
    underThreshold:
      side === "under" ? threshold : 1.01,
  });

  if (side === "over") {
    return {
      side,
      threshold,
      bets: result.overBets,
      wins: result.overWins,
      losses: result.overLosses,
      winRate: result.overWinRate,
    };
  }

  return {
    side,
    threshold,
    bets: result.underBets,
    wins: result.underWins,
    losses: result.underLosses,
    winRate: result.underWinRate,
  };
}

function chooseBestSideThreshold(
  results: SideThresholdResult[],
) {
  const eligible = results.filter(
    (result) => result.bets >= MIN_SIDE_BETS,
  );

  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => {
    if (b.winRate !== a.winRate) {
      return b.winRate - a.winRate;
    }

    if (b.bets !== a.bets) {
      return b.bets - a.bets;
    }

    /*
     * If still tied, prefer the stricter threshold.
     */
    return b.threshold - a.threshold;
  })[0];
}

function findDualThresholds(
  trainingMatches: HistoryMatch[],
) {
  const overResults = THRESHOLDS.map((threshold) =>
    evaluateTrainingSide({
      matches: trainingMatches,
      side: "over",
      threshold,
    }),
  );

  const underResults = THRESHOLDS.map((threshold) =>
    evaluateTrainingSide({
      matches: trainingMatches,
      side: "under",
      threshold,
    }),
  );

  const bestOver =
    chooseBestSideThreshold(overResults);

  const bestUnder =
    chooseBestSideThreshold(underResults);

  if (!bestOver) {
    throw new Error(
      "Training 無法選出 OVER Threshold",
    );
  }

  if (!bestUnder) {
    throw new Error(
      "Training 無法選出 UNDER Threshold",
    );
  }

  return {
    bestOver,
    bestUnder,
    overResults,
    underResults,
  };
}

function logValidation(
  season: string,
  result: EvaluationResult,
) {
  console.log("");
  console.log(`📅 ${season} OOS`);
  console.log(`🎯 Bets：${result.bets}`);
  console.log(`⏭ PASS：${result.passes}`);
  console.log(`📊 Bet Rate：${result.betRate}%`);
  console.log(`✅ Wins：${result.wins}`);
  console.log(`❌ Losses：${result.losses}`);
  console.log(`🏆 Win Rate：${result.winRate}%`);
  console.log(
    `🔺 OVER：${result.overWins}/${result.overBets} = ${result.overWinRate}%`,
  );
  console.log(
    `🔻 UNDER：${result.underWins}/${result.underBets} = ${result.underWinRate}%`,
  );
}

export async function GET() {
  try {
    const startedAt = Date.now();

    console.log(
      "========================================",
    );
    console.log(
      "🏆 XSI TOTALS V5 DUAL-THRESHOLD WALK-FORWARD",
    );
    console.log(
      "========================================",
    );

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          message: "找不到 Supabase 環境變數",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data, error } = await supabase
      .from("football_match_history")
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
        ].join(","),
      )
      .eq("league", LEAGUE)
      .in("season", [...SEASONS])
      .eq("status", "finished")
      .order("match_date", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const allMatches =
      (data ?? []) as unknown as HistoryMatch[];

    const season2324 = allMatches.filter(
      (match) => match.season === "2023/24",
    );

    const season2425 = allMatches.filter(
      (match) => match.season === "2024/25",
    );

    const season2526 = allMatches.filter(
      (match) => match.season === "2025/26",
    );

    console.log(`📚 2023/24：${season2324.length}`);
    console.log(`📚 2024/25：${season2425.length}`);
    console.log(`📚 2025/26：${season2526.length}`);

    if (
      season2324.length === 0 ||
      season2425.length === 0 ||
      season2526.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "三個賽季資料不完整",
          seasons: {
            "2023/24": season2324.length,
            "2024/25": season2425.length,
            "2025/26": season2526.length,
          },
        },
        { status: 400 },
      );
    }

    /* =========================
       WALK FORWARD #1
       Train 2023/24
       Test  2024/25
    ========================= */

    console.log("");
    console.log(
      "========================================",
    );
    console.log("🔬 WALK FORWARD #1");
    console.log("TRAIN：2023/24");
    console.log("TEST ：2024/25");
    console.log(
      "========================================",
    );

    const selection1 =
      findDualThresholds(season2324);

    const overThreshold1 =
      selection1.bestOver.threshold;

    const underThreshold1 =
      selection1.bestUnder.threshold;

    console.log(
      `🔺 Selected OVER Threshold：${Math.round(
        overThreshold1 * 100,
      )}%`,
    );

    console.log(
      `🔻 Selected UNDER Threshold：${Math.round(
        underThreshold1 * 100,
      )}%`,
    );

    console.log(
      `🔺 Training OVER：${selection1.bestOver.wins}/${selection1.bestOver.bets} = ${selection1.bestOver.winRate}%`,
    );

    console.log(
      `🔻 Training UNDER：${selection1.bestUnder.wins}/${selection1.bestUnder.bets} = ${selection1.bestUnder.winRate}%`,
    );

    const validation2425 = evaluateSeason({
      baseHistory: season2324,
      targetMatches: season2425,
      overThreshold: overThreshold1,
      underThreshold: underThreshold1,
    });

    logValidation("2024/25", validation2425);

    /* =========================
       WALK FORWARD #2
       Train 2023/24 + 2024/25
       Test  2025/26
    ========================= */

    const training2 = [
      ...season2324,
      ...season2425,
    ].sort((a, b) => matchTime(a) - matchTime(b));

    console.log("");
    console.log(
      "========================================",
    );
    console.log("🔬 WALK FORWARD #2");
    console.log("TRAIN：2023/24 + 2024/25");
    console.log("TEST ：2025/26");
    console.log(
      "========================================",
    );

    const selection2 =
      findDualThresholds(training2);

    const overThreshold2 =
      selection2.bestOver.threshold;

    const underThreshold2 =
      selection2.bestUnder.threshold;

    console.log(
      `🔺 Selected OVER Threshold：${Math.round(
        overThreshold2 * 100,
      )}%`,
    );

    console.log(
      `🔻 Selected UNDER Threshold：${Math.round(
        underThreshold2 * 100,
      )}%`,
    );

    console.log(
      `🔺 Training OVER：${selection2.bestOver.wins}/${selection2.bestOver.bets} = ${selection2.bestOver.winRate}%`,
    );

    console.log(
      `🔻 Training UNDER：${selection2.bestUnder.wins}/${selection2.bestUnder.bets} = ${selection2.bestUnder.winRate}%`,
    );

    const validation2526 = evaluateSeason({
      baseHistory: training2,
      targetMatches: season2526,
      overThreshold: overThreshold2,
      underThreshold: underThreshold2,
    });

    logValidation("2025/26", validation2526);

    /* =========================
       Combined OOS
    ========================= */

    const combinedMatches =
      validation2425.matches +
      validation2526.matches;

    const combinedBets =
      validation2425.bets +
      validation2526.bets;

    const combinedPasses =
      validation2425.passes +
      validation2526.passes;

    const combinedWins =
      validation2425.wins +
      validation2526.wins;

    const combinedLosses =
      validation2425.losses +
      validation2526.losses;

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
      percentage(combinedWins, combinedBets);

    const combinedBetRate =
      percentage(combinedBets, combinedMatches);

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

    console.log("");
    console.log(
      "========================================",
    );
    console.log("📊 COMBINED OOS");
    console.log(
      "========================================",
    );
    console.log(`⚽ Matches：${combinedMatches}`);
    console.log(`🎯 Bets：${combinedBets}`);
    console.log(`⏭ PASS：${combinedPasses}`);
    console.log(`📊 Bet Rate：${combinedBetRate}%`);
    console.log(`✅ Wins：${combinedWins}`);
    console.log(`❌ Losses：${combinedLosses}`);
    console.log(`🏆 Win Rate：${combinedWinRate}%`);
    console.log(
      `🔺 OVER：${combinedOverWins}/${combinedOverBets} = ${combinedOverWinRate}%`,
    );
    console.log(
      `🔻 UNDER：${combinedUnderWins}/${combinedUnderBets} = ${combinedUnderWinRate}%`,
    );
    console.log(
      `⚡ Runtime：${Date.now() - startedAt} ms`,
    );
    console.log(
      "========================================",
    );

    return NextResponse.json({
      success: true,
      model:
        "XSI Football Totals V5 Dual-Threshold Walk-Forward",
      league: LEAGUE,
      line: TOTAL_LINE,

      methodology: {
        type: "walk-forward-out-of-sample",
        antiLookAheadBias: true,
        thresholdSelectedFromTrainingOnly: true,
        dualThreshold: true,
        thresholds: THRESHOLDS,
        minTeamMatches: MIN_TEAM_MATCHES,
        minLeagueMatches: MIN_LEAGUE_MATCHES,
        minSideBets: MIN_SIDE_BETS,
      },

      dataset: {
        total: allMatches.length,
        seasons: {
          "2023/24": season2324.length,
          "2024/25": season2425.length,
          "2025/26": season2526.length,
        },
      },

      walkForward: [
        {
          trainingSeasons: ["2023/24"],
          testSeason: "2024/25",
          selectedThresholds: {
            over: overThreshold1,
            under: underThreshold1,
          },
          trainingSelection: {
            over: selection1.bestOver,
            under: selection1.bestUnder,
          },
          validation: {
            matches: validation2425.matches,
            bets: validation2425.bets,
            passes: validation2425.passes,
            wins: validation2425.wins,
            losses: validation2425.losses,
            winRate: validation2425.winRate,
            betRate: validation2425.betRate,
            over: {
              bets: validation2425.overBets,
              wins: validation2425.overWins,
              losses: validation2425.overLosses,
              winRate: validation2425.overWinRate,
            },
            under: {
              bets: validation2425.underBets,
              wins: validation2425.underWins,
              losses: validation2425.underLosses,
              winRate: validation2425.underWinRate,
            },
          },
        },
        {
          trainingSeasons: [
            "2023/24",
            "2024/25",
          ],
          testSeason: "2025/26",
          selectedThresholds: {
            over: overThreshold2,
            under: underThreshold2,
          },
          trainingSelection: {
            over: selection2.bestOver,
            under: selection2.bestUnder,
          },
          validation: {
            matches: validation2526.matches,
            bets: validation2526.bets,
            passes: validation2526.passes,
            wins: validation2526.wins,
            losses: validation2526.losses,
            winRate: validation2526.winRate,
            betRate: validation2526.betRate,
            over: {
              bets: validation2526.overBets,
              wins: validation2526.overWins,
              losses: validation2526.overLosses,
              winRate: validation2526.overWinRate,
            },
            under: {
              bets: validation2526.underBets,
              wins: validation2526.underWins,
              losses: validation2526.underLosses,
              winRate: validation2526.underWinRate,
            },
          },
        },
      ],

      combinedOOS: {
        matches: combinedMatches,
        bets: combinedBets,
        passes: combinedPasses,
        betRate: combinedBetRate,
        wins: combinedWins,
        losses: combinedLosses,
        winRate: combinedWinRate,
        over: {
          bets: combinedOverBets,
          wins: combinedOverWins,
          losses:
            combinedOverBets - combinedOverWins,
          winRate: combinedOverWinRate,
        },
        under: {
          bets: combinedUnderBets,
          wins: combinedUnderWins,
          losses:
            combinedUnderBets - combinedUnderWins,
          winRate: combinedUnderWinRate,
        },
      },

      recentPredictions: [
        ...validation2425.rows,
        ...validation2526.rows,
      ]
        .filter(
          (row) => row.prediction !== "pass",
        )
        .slice(-30)
        .reverse(),

      runtimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      "❌ Football Totals V5 Error：",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}