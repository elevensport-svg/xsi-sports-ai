import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

const LEAGUE =
  "英超";

const SEASON =
  "2025/26";

type Side =
  | "home"
  | "draw"
  | "away";

type HistoryRow = {
  id: number;

  external_id: string;

  match_date: string;

  home_team: string;

  away_team: string;

  home_score: number;

  away_score: number;

  home_odds:
    | number
    | null;

  draw_odds:
    | number
    | null;

  away_odds:
    | number
    | null;

  market_home_prob:
    | number
    | null;

  market_draw_prob:
    | number
    | null;

  market_away_prob:
    | number
    | null;

  xsi_home_prob:
    | number
    | null;

  xsi_draw_prob:
    | number
    | null;

  xsi_away_prob:
    | number
    | null;
};

type RoiResult = {
  side: Side;

  threshold: number;

  oddsMin: number;

  oddsMax:
    | number
    | null;

  games: number;

  wins: number;

  losses: number;

  hitRate: number;

  totalStake: number;

  totalReturn: number;

  profit: number;

  roi: number;

  maxLosingStreak: number;
};

function round(
  value: number,
  digits = 1,
) {
  const power =
    10 **
    digits;

  return (
    Math.round(
      value *
        power,
    ) /
    power
  );
}

function getActualResult(
  row:
    HistoryRow,
): Side {
  if (
    row.home_score >
    row.away_score
  ) {
    return "home";
  }

  if (
    row.home_score <
    row.away_score
  ) {
    return "away";
  }

  return "draw";
}

function getLeader(
  home: number,
  draw: number,
  away: number,
): Side {
  if (
    home >=
      draw &&
    home >=
      away
  ) {
    return "home";
  }

  if (
    away >=
      home &&
    away >=
      draw
  ) {
    return "away";
  }

  return "draw";
}

function getProbability(
  row:
    HistoryRow,

  side:
    Side,

  source:
    "market"
    | "xsi",
) {
  if (
    source ===
    "market"
  ) {
    if (
      side ===
      "home"
    ) {
      return row
        .market_home_prob;
    }

    if (
      side ===
      "draw"
    ) {
      return row
        .market_draw_prob;
    }

    return row
      .market_away_prob;
  }

  if (
    side ===
    "home"
  ) {
    return row
      .xsi_home_prob;
  }

  if (
    side ===
    "draw"
  ) {
    return row
      .xsi_draw_prob;
  }

  return row
    .xsi_away_prob;
}

function getOdds(
  row:
    HistoryRow,

  side:
    Side,
) {
  if (
    side ===
    "home"
  ) {
    return row
      .home_odds;
  }

  if (
    side ===
    "draw"
  ) {
    return row
      .draw_odds;
  }

  return row
    .away_odds;
}

function getValueGap(
  row:
    HistoryRow,

  side:
    Side,
) {
  const market =
    getProbability(
      row,
      side,
      "market",
    );

  const xsi =
    getProbability(
      row,
      side,
      "xsi",
    );

  if (
    market ===
      null ||
    xsi ===
      null
  ) {
    return null;
  }

  return (
    xsi -
    market
  );
}

function hasCompleteData(
  row:
    HistoryRow,
) {
  return (
    row.home_odds !==
      null &&
    row.draw_odds !==
      null &&
    row.away_odds !==
      null &&
    row.market_home_prob !==
      null &&
    row.market_draw_prob !==
      null &&
    row.market_away_prob !==
      null &&
    row.xsi_home_prob !==
      null &&
    row.xsi_draw_prob !==
      null &&
    row.xsi_away_prob !==
      null
  );
}

function getXsiLeader(
  row:
    HistoryRow,
) {
  return getLeader(
    row.xsi_home_prob ??
      0,

    row.xsi_draw_prob ??
      0,

    row.xsi_away_prob ??
      0,
  );
}

function withinOddsRange(
  odds: number,
  min: number,
  max:
    | number
    | null,
) {
  if (
    odds <
    min
  ) {
    return false;
  }

  if (
    max !==
      null &&
    odds >
      max
  ) {
    return false;
  }

  return true;
}

function evaluateStrategy({
  rows,
  side,
  threshold,
  oddsMin,
  oddsMax,
}: {
  rows:
    HistoryRow[];

  side:
    Side;

  threshold:
    number;

  oddsMin:
    number;

  oddsMax:
    | number
    | null;
}): RoiResult {
  let games =
    0;

  let wins =
    0;

  let losses =
    0;

  let totalReturn =
    0;

  let currentLosingStreak =
    0;

  let maxLosingStreak =
    0;

  for (
    const row
    of rows
  ) {
    if (
      !hasCompleteData(
        row,
      )
    ) {
      continue;
    }

    const xsiLeader =
      getXsiLeader(
        row,
      );

    if (
      xsiLeader !==
      side
    ) {
      continue;
    }

    const gap =
      getValueGap(
        row,
        side,
      );

    if (
      gap ===
        null ||
      gap <
        threshold
    ) {
      continue;
    }

    const odds =
      getOdds(
        row,
        side,
      );

    if (
      odds ===
        null ||
      !withinOddsRange(
        odds,
        oddsMin,
        oddsMax,
      )
    ) {
      continue;
    }

    games +=
      1;

    const actual =
      getActualResult(
        row,
      );

    if (
      actual ===
      side
    ) {
      wins +=
        1;

      totalReturn +=
        odds;

      currentLosingStreak =
        0;
    } else {
      losses +=
        1;

      currentLosingStreak +=
        1;

      maxLosingStreak =
        Math.max(
          maxLosingStreak,
          currentLosingStreak,
        );
    }
  }

  const totalStake =
    games;

  const profit =
    totalReturn -
    totalStake;

  return {
    side,

    threshold,

    oddsMin,

    oddsMax,

    games,

    wins,

    losses,

    hitRate:
      games >
      0
        ? round(
            wins /
              games *
              100,
          )
        : 0,

    totalStake:
      round(
        totalStake,
        2,
      ),

    totalReturn:
      round(
        totalReturn,
        2,
      ),

    profit:
      round(
        profit,
        2,
      ),

    roi:
      totalStake >
      0
        ? round(
            profit /
              totalStake *
              100,
          )
        : 0,

    maxLosingStreak,
  };
}

export async function GET(
  request:
    Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const minGamesRaw =
      Number(
        url.searchParams.get(
          "minGames",
        ) ??
          "20",
      );

    const minGames =
      Number.isFinite(
        minGamesRaw,
      )
        ? Math.max(
            10,
            Math.floor(
              minGamesRaw,
            ),
          )
        : 20;

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "football_match_history",
        )
        .select(
          `
            id,
            external_id,
            match_date,
            home_team,
            away_team,
            home_score,
            away_score,
            home_odds,
            draw_odds,
            away_odds,
            market_home_prob,
            market_draw_prob,
            market_away_prob,
            xsi_home_prob,
            xsi_draw_prob,
            xsi_away_prob
          `,
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
        `讀取 EPL ROI Backtest 資料失敗：${error.message}`,
      );
    }

    const rows =
      (
        data ??
        []
      ) as HistoryRow[];

    const thresholds = [
      0,
      3,
      5,
      7,
    ];

    const oddsRanges:
      Array<{
        label:
          string;

        min:
          number;

        max:
          | number
          | null;
      }> = [
      {
        label:
          "1.01-1.49",

        min:
          1.01,

        max:
          1.49,
      },
      {
        label:
          "1.50-1.79",

        min:
          1.5,

        max:
          1.79,
      },
      {
        label:
          "1.80-2.19",

        min:
          1.8,

        max:
          2.19,
      },
      {
        label:
          "2.20-2.99",

        min:
          2.2,

        max:
          2.99,
      },
      {
        label:
          "3.00+",

        min:
          3,

        max:
          null,
      },
    ];

    const sides:
      Side[] = [
      "home",
      "draw",
      "away",
    ];

    const results:
      Array<
        RoiResult & {
          oddsRange:
            string;
        }
      > = [];

    for (
      const threshold
      of thresholds
    ) {
      for (
        const oddsRange
        of oddsRanges
      ) {
        for (
          const side
          of sides
        ) {
          const result =
            evaluateStrategy({
              rows,
              side,
              threshold,
              oddsMin:
                oddsRange.min,
              oddsMax:
                oddsRange.max,
            });

          results.push({
            ...result,

            oddsRange:
              oddsRange.label,
          });
        }
      }
    }

    const qualified =
      results
        .filter(
          (result) =>
            result.games >=
            minGames,
        )
        .sort(
          (a, b) => {
            if (
              b.roi !==
              a.roi
            ) {
              return (
                b.roi -
                a.roi
              );
            }

            return (
              b.games -
              a.games
            );
          },
        );

    const positiveRoi =
      qualified.filter(
        (result) =>
          result.roi >
          0,
      );

    const robustCandidates =
      qualified.filter(
        (result) =>
          result.roi >=
            5 &&
          result.games >=
            25 &&
          result.maxLosingStreak <=
            6,
      );

    return NextResponse.json({
      success:
        true,

      league:
        LEAGUE,

      season:
        SEASON,

      sampleGames:
        rows.length,

      minimumGames:
        minGames,

      methodology: {
        stakePerBet:
          1,

        valueGapThresholds:
          thresholds,

        oddsRanges:
          oddsRanges.map(
            (item) =>
              item.label,
          ),

        note:
          "每場固定投注 1 unit。Profit = 總返還 - 總投注；ROI = Profit / 總投注。",
      },

      summary: {
        testedStrategies:
          results.length,

        qualifiedStrategies:
          qualified.length,

        positiveRoiStrategies:
          positiveRoi.length,

        robustCandidates:
          robustCandidates.length,
      },

      bestByRoi:
        qualified.slice(
          0,
          30,
        ),

      positiveRoi:
        positiveRoi.slice(
          0,
          30,
        ),

      robustCandidates:
        robustCandidates.slice(
          0,
          30,
        ),

      note:
        "ROI 回測比單看命中率更接近實際投注價值，但單季樣本仍可能過度擬合。若找到正 ROI 條件，下一步應做時間序或跨賽季驗證。",
    });
  } catch (
    error
  ) {
    console.error(
      "❌ EPL ROI Backtest Error：",
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