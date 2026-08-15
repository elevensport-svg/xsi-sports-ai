import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const LEAGUE = "英超";
const SEASON = "2025/26";

type HistoryRow = {
  id: number;
  external_id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;

  market_home_prob: number | null;
  market_draw_prob: number | null;
  market_away_prob: number | null;

  xsi_home_prob: number | null;
  xsi_draw_prob: number | null;
  xsi_away_prob: number | null;
};

type Side = "home" | "draw" | "away";

type ResultStat = {
  threshold: number;
  games: number;
  correct: number;
  accuracy: number;
  averageValueGap: number;
};

type SideResult = {
  side: Side;
  games: number;
  correct: number;
  accuracy: number;
};

type OddsBucket = {
  label: string;
  min: number;
  max: number | null;
};

type OddsBucketResult = {
  label: string;
  games: number;
  correct: number;
  accuracy: number;
};

function round(
  value: number,
  digits = 1,
) {
  const power =
    10 ** digits;

  return (
    Math.round(value * power) /
    power
  );
}

function getActualResult(
  row: HistoryRow,
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
    home >= draw &&
    home >= away
  ) {
    return "home";
  }

  if (
    away >= home &&
    away >= draw
  ) {
    return "away";
  }

  return "draw";
}

function getProbability(
  row: HistoryRow,
  side: Side,
  source: "market" | "xsi",
) {
  if (source === "market") {
    if (side === "home") {
      return row.market_home_prob;
    }

    if (side === "draw") {
      return row.market_draw_prob;
    }

    return row.market_away_prob;
  }

  if (side === "home") {
    return row.xsi_home_prob;
  }

  if (side === "draw") {
    return row.xsi_draw_prob;
  }

  return row.xsi_away_prob;
}

function getValueGap(
  row: HistoryRow,
  side: Side,
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
    market === null ||
    xsi === null
  ) {
    return null;
  }

  return xsi - market;
}

function hasCompleteProbabilities(
  row: HistoryRow,
) {
  return (
    row.market_home_prob !== null &&
    row.market_draw_prob !== null &&
    row.market_away_prob !== null &&
    row.xsi_home_prob !== null &&
    row.xsi_draw_prob !== null &&
    row.xsi_away_prob !== null
  );
}

function getXsiLeader(
  row: HistoryRow,
): Side {
  return getLeader(
    row.xsi_home_prob ?? 0,
    row.xsi_draw_prob ?? 0,
    row.xsi_away_prob ?? 0,
  );
}

function getMarketLeader(
  row: HistoryRow,
): Side {
  return getLeader(
    row.market_home_prob ?? 0,
    row.market_draw_prob ?? 0,
    row.market_away_prob ?? 0,
  );
}

function evaluateThreshold(
  rows: HistoryRow[],
  threshold: number,
): ResultStat {
  let games = 0;
  let correct = 0;
  let totalGap = 0;

  for (const row of rows) {
    if (!hasCompleteProbabilities(row)) {
      continue;
    }

    const side =
      getXsiLeader(row);

    const gap =
      getValueGap(
        row,
        side,
      );

    if (
      gap === null ||
      gap < threshold
    ) {
      continue;
    }

    games += 1;
    totalGap += gap;

    if (
      side ===
      getActualResult(row)
    ) {
      correct += 1;
    }
  }

  return {
    threshold,
    games,
    correct,

    accuracy:
      games > 0
        ? round(
            correct /
              games *
              100,
          )
        : 0,

    averageValueGap:
      games > 0
        ? round(
            totalGap /
              games,
          )
        : 0,
  };
}

function evaluateSideBreakdown(
  rows: HistoryRow[],
  threshold: number,
): SideResult[] {
  const sides: Side[] = [
    "home",
    "draw",
    "away",
  ];

  return sides.map(
    (side) => {
      let games = 0;
      let correct = 0;

      for (
        const row
        of rows
      ) {
        if (
          !hasCompleteProbabilities(
            row,
          )
        ) {
          continue;
        }

        const xsiLeader =
          getXsiLeader(row);

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
          gap === null ||
          gap < threshold
        ) {
          continue;
        }

        games += 1;

        if (
          getActualResult(row) ===
          side
        ) {
          correct += 1;
        }
      }

      return {
        side,
        games,
        correct,

        accuracy:
          games > 0
            ? round(
                correct /
                  games *
                  100,
              )
            : 0,
      };
    },
  );
}

function evaluateContrarian(
  rows: HistoryRow[],
  threshold: number,
) {
  let games = 0;
  let correct = 0;

  for (const row of rows) {
    if (
      !hasCompleteProbabilities(
        row,
      )
    ) {
      continue;
    }

    const xsiLeader =
      getXsiLeader(row);

    const marketLeader =
      getMarketLeader(row);

    if (
      xsiLeader ===
      marketLeader
    ) {
      continue;
    }

    const gap =
      getValueGap(
        row,
        xsiLeader,
      );

    if (
      gap === null ||
      gap < threshold
    ) {
      continue;
    }

    games += 1;

    if (
      xsiLeader ===
      getActualResult(row)
    ) {
      correct += 1;
    }
  }

  return {
    threshold,
    games,
    correct,

    accuracy:
      games > 0
        ? round(
            correct /
              games *
              100,
          )
        : 0,
  };
}

function marketProbabilityToDecimalOdds(
  probability: number | null,
) {
  if (
    probability === null ||
    probability <= 0
  ) {
    return null;
  }

  return 100 / probability;
}

function evaluateOddsBuckets(
  rows: HistoryRow[],
  threshold: number,
): OddsBucketResult[] {
  const buckets: OddsBucket[] = [
    {
      label: "1.01-1.49",
      min: 1.01,
      max: 1.49,
    },
    {
      label: "1.50-1.79",
      min: 1.5,
      max: 1.79,
    },
    {
      label: "1.80-2.19",
      min: 1.8,
      max: 2.19,
    },
    {
      label: "2.20-2.99",
      min: 2.2,
      max: 2.99,
    },
    {
      label: "3.00+",
      min: 3,
      max: null,
    },
  ];

  return buckets.map(
    (bucket) => {
      let games = 0;
      let correct = 0;

      for (
        const row
        of rows
      ) {
        if (
          !hasCompleteProbabilities(
            row,
          )
        ) {
          continue;
        }

        const side =
          getXsiLeader(row);

        const gap =
          getValueGap(
            row,
            side,
          );

        if (
          gap === null ||
          gap < threshold
        ) {
          continue;
        }

        const marketProbability =
          getProbability(
            row,
            side,
            "market",
          );

        const odds =
          marketProbabilityToDecimalOdds(
            marketProbability,
          );

        if (
          odds === null ||
          odds < bucket.min ||
          (
            bucket.max !== null &&
            odds > bucket.max
          )
        ) {
          continue;
        }

        games += 1;

        if (
          side ===
          getActualResult(row)
        ) {
          correct += 1;
        }
      }

      return {
        label:
          bucket.label,

        games,

        correct,

        accuracy:
          games > 0
            ? round(
                correct /
                  games *
                  100,
              )
            : 0,
      };
    },
  );
}

export async function GET() {
  try {
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
        .not(
          "market_home_prob",
          "is",
          null,
        )
        .not(
          "market_draw_prob",
          "is",
          null,
        )
        .not(
          "market_away_prob",
          "is",
          null,
        )
        .not(
          "xsi_home_prob",
          "is",
          null,
        )
        .not(
          "xsi_draw_prob",
          "is",
          null,
        )
        .not(
          "xsi_away_prob",
          "is",
          null,
        )
        .order(
          "match_date",
          {
            ascending:
              true,
          },
        );

    if (error) {
      throw new Error(
        `讀取 EPL Value Backtest 資料失敗：${error.message}`,
      );
    }

    const rows =
      (data ??
        []) as HistoryRow[];

    const thresholds = [
      0,
      3,
      5,
      7,
      10,
      12,
      15,
    ];

    const thresholdResults =
      thresholds.map(
        (threshold) =>
          evaluateThreshold(
            rows,
            threshold,
          ),
      );

    const detailed =
      thresholds.map(
        (threshold) => ({
          threshold,

          sides:
            evaluateSideBreakdown(
              rows,
              threshold,
            ),

          contrarian:
            evaluateContrarian(
              rows,
              threshold,
            ),

          oddsBuckets:
            evaluateOddsBuckets(
              rows,
              threshold,
            ),
        }),
      );

    const candidates =
      thresholdResults
        .filter(
          (item) =>
            item.games >=
            20,
        )
        .sort(
          (a, b) => {
            if (
              b.accuracy !==
              a.accuracy
            ) {
              return (
                b.accuracy -
                a.accuracy
              );
            }

            return (
              b.games -
              a.games
            );
          },
        );

    return NextResponse.json({
      success: true,

      league: LEAGUE,

      season: SEASON,

      sampleGames:
        rows.length,

      message:
        "EPL Value Backtest 完成。此版本使用已寫入的 Historical XSI baseline，主要用來找 Value Gap 門檻與出手區間。",

      thresholds:
        thresholdResults,

      bestThresholdsMin20:
        candidates.slice(
          0,
          10,
        ),

      detailed,

      note:
        "若某門檻樣本很小，即使命中率高也不建議直接接正式模型；優先看樣本 >= 20 且在不同區間仍穩定的訊號。",
    });
  } catch (error) {
    console.error(
      "❌ EPL Value Backtest Error：",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof
          Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}