import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const LEAGUE = "法甲";
const SEASON = "2025/26";

type Side = "home" | "draw" | "away";

type HistoryRow = {
  id: number;
  match_date: string;
  home_score: number;
  away_score: number;

  home_odds: number | null;
  draw_odds: number | null;
  away_odds: number | null;

  market_home_prob: number | null;
  market_draw_prob: number | null;
  market_away_prob: number | null;

  xsi_home_prob: number | null;
  xsi_draw_prob: number | null;
  xsi_away_prob: number | null;
};

type Strategy = {
  side: Side;
  threshold: number;
  oddsMin: number;
  oddsMax: number | null;
  oddsRange: string;
};

type StrategyResult = Strategy & {
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

type FoldResult = {
  fold: number;

  trainingGames: number;
  testGames: number;

  trainingStart: string;
  trainingEnd: string;
  testStart: string;
  testEnd: string;

  selectedStrategy:
    | StrategyResult
    | null;

  xsiOos:
    | StrategyResult
    | null;

  marketBaselineOos:
    | StrategyResult
    | null;
};

function round(
  value: number,
  digits = 1,
) {
  const p =
    10 ** digits;

  return (
    Math.round(
      value * p,
    ) / p
  );
}

function actual(
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

function leader(
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

function xsiLeader(
  row: HistoryRow,
): Side {
  return leader(
    row.xsi_home_prob ?? 0,
    row.xsi_draw_prob ?? 0,
    row.xsi_away_prob ?? 0,
  );
}

function marketLeader(
  row: HistoryRow,
): Side {
  return leader(
    row.market_home_prob ?? 0,
    row.market_draw_prob ?? 0,
    row.market_away_prob ?? 0,
  );
}

function probability(
  row: HistoryRow,
  side: Side,
  source:
    | "xsi"
    | "market",
) {
  if (
    source === "xsi"
  ) {
    if (
      side === "home"
    ) {
      return row.xsi_home_prob;
    }

    if (
      side === "draw"
    ) {
      return row.xsi_draw_prob;
    }

    return row.xsi_away_prob;
  }

  if (
    side === "home"
  ) {
    return row.market_home_prob;
  }

  if (
    side === "draw"
  ) {
    return row.market_draw_prob;
  }

  return row.market_away_prob;
}

function odds(
  row: HistoryRow,
  side: Side,
) {
  if (
    side === "home"
  ) {
    return row.home_odds;
  }

  if (
    side === "draw"
  ) {
    return row.draw_odds;
  }

  return row.away_odds;
}

function complete(
  row: HistoryRow,
) {
  return (
    row.home_odds !== null &&
    row.draw_odds !== null &&
    row.away_odds !== null &&
    row.market_home_prob !== null &&
    row.market_draw_prob !== null &&
    row.market_away_prob !== null &&
    row.xsi_home_prob !== null &&
    row.xsi_draw_prob !== null &&
    row.xsi_away_prob !== null
  );
}

function valueGap(
  row: HistoryRow,
  side: Side,
) {
  const x =
    probability(
      row,
      side,
      "xsi",
    );

  const m =
    probability(
      row,
      side,
      "market",
    );

  if (
    x === null ||
    m === null
  ) {
    return null;
  }

  return x - m;
}

function inRange(
  value: number,
  min: number,
  max:
    | number
    | null,
) {
  return (
    value >= min &&
    (
      max === null ||
      value <= max
    )
  );
}

function evaluate(
  rows: HistoryRow[],
  strategy: Strategy,
  mode:
    | "xsi"
    | "market",
): StrategyResult {
  let games = 0;
  let wins = 0;
  let totalReturn = 0;

  let losing = 0;
  let maxLosingStreak =
    0;

  for (
    const row
    of rows
  ) {
    if (
      !complete(row)
    ) {
      continue;
    }

    const selected =
      mode === "xsi"
        ? xsiLeader(row)
        : marketLeader(row);

    if (
      selected !==
      strategy.side
    ) {
      continue;
    }

    if (
      mode === "xsi"
    ) {
      const gap =
        valueGap(
          row,
          strategy.side,
        );

      if (
        gap === null ||
        gap <
          strategy.threshold
      ) {
        continue;
      }
    }

    const selectedOdds =
      odds(
        row,
        strategy.side,
      );

    if (
      selectedOdds === null ||
      !inRange(
        selectedOdds,
        strategy.oddsMin,
        strategy.oddsMax,
      )
    ) {
      continue;
    }

    games += 1;

    if (
      actual(row) ===
      strategy.side
    ) {
      wins += 1;

      totalReturn +=
        selectedOdds;

      losing = 0;
    } else {
      losing += 1;

      maxLosingStreak =
        Math.max(
          maxLosingStreak,
          losing,
        );
    }
  }

  const losses =
    games -
    wins;

  const profit =
    totalReturn -
    games;

  return {
    ...strategy,

    games,
    wins,
    losses,

    hitRate:
      games
        ? round(
            wins /
              games *
              100,
          )
        : 0,

    totalStake:
      games,

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
      games
        ? round(
            profit /
              games *
              100,
          )
        : 0,

    maxLosingStreak,
  };
}

function strategies():
  Strategy[] {
  const thresholds = [
    0,
    3,
    5,
    7,
  ];

  const ranges = [
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

  const result:
    Strategy[] = [];

  for (
    const threshold
    of thresholds
  ) {
    for (
      const range
      of ranges
    ) {
      for (
        const side
        of sides
      ) {
        result.push({
          side,
          threshold,

          oddsMin:
            range.min,

          oddsMax:
            range.max,

          oddsRange:
            range.label,
        });
      }
    }
  }

  return result;
}

function chooseStrategy(
  training:
    HistoryRow[],

  minTrainingBets:
    number,
) {
  const candidates =
    strategies()
      .map(
        (
          strategy,
        ) =>
          evaluate(
            training,
            strategy,
            "xsi",
          ),
      )
      .filter(
        (result) =>
          result.games >=
          minTrainingBets,
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

          if (
            b.games !==
            a.games
          ) {
            return (
              b.games -
              a.games
            );
          }

          return (
            b.hitRate -
            a.hitRate
          );
        },
      );

  return (
    candidates[0] ??
    null
  );
}

function aggregate(
  results:
    Array<
      | StrategyResult
      | null
    >,
) {
  const valid =
    results.filter(
      (
        result,
      ): result is StrategyResult =>
        result !==
        null,
    );

  const games =
    valid.reduce(
      (
        sum,
        result,
      ) =>
        sum +
        result.games,
      0,
    );

  const wins =
    valid.reduce(
      (
        sum,
        result,
      ) =>
        sum +
        result.wins,
      0,
    );

  const totalReturn =
    valid.reduce(
      (
        sum,
        result,
      ) =>
        sum +
        result.totalReturn,
      0,
    );

  const profit =
    totalReturn -
    games;

  return {
    bets:
      games,

    wins,

    losses:
      games -
      wins,

    hitRate:
      games
        ? round(
            wins /
              games *
              100,
          )
        : 0,

    totalStake:
      games,

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
      games
        ? round(
            profit /
              games *
              100,
          )
        : 0,
  };
}

function dateOnly(
  value: string,
) {
  return value.slice(
    0,
    10,
  );
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const initialTrain =
      Math.max(
        100,
        Number(
          url.searchParams.get(
            "initialTrain",
          ) ??
            160,
        ),
      );

    const testSize =
      Math.max(
        20,
        Number(
          url.searchParams.get(
            "testSize",
          ) ??
            40,
        ),
      );

    const minTrainingBets =
      Math.max(
        10,
        Number(
          url.searchParams.get(
            "minTrainingBets",
          ) ??
            20,
        ),
      );

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
            match_date,
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
        `讀取 Ligue 1 ROI Walk-Forward 資料失敗：${error.message}`,
      );
    }

    const rows =
      (
        data ??
        []
      ) as HistoryRow[];

    if (
      rows.length <
      initialTrain +
        testSize
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            `樣本不足：${rows.length} 場`,
        },
        {
          status:
            400,
        },
      );
    }

    const folds:
      FoldResult[] = [];

    let cursor =
      initialTrain;

    while (
      cursor <
      rows.length
    ) {
      const end =
        Math.min(
          cursor +
            testSize,
          rows.length,
        );

      const training =
        rows.slice(
          0,
          cursor,
        );

      const test =
        rows.slice(
          cursor,
          end,
        );

      if (
        !test.length
      ) {
        break;
      }

      const selected =
        chooseStrategy(
          training,
          minTrainingBets,
        );

      let xsiOos:
        | StrategyResult
        | null =
        null;

      let marketBaselineOos:
        | StrategyResult
        | null =
        null;

      if (
        selected
      ) {
        xsiOos =
          evaluate(
            test,
            selected,
            "xsi",
          );

        marketBaselineOos =
          evaluate(
            test,
            {
              side:
                selected.side,

              threshold:
                0,

              oddsMin:
                selected.oddsMin,

              oddsMax:
                selected.oddsMax,

              oddsRange:
                selected.oddsRange,
            },
            "market",
          );
      }

      folds.push({
        fold:
          folds.length +
          1,

        trainingGames:
          training.length,

        testGames:
          test.length,

        trainingStart:
          dateOnly(
            training[0]
              .match_date,
          ),

        trainingEnd:
          dateOnly(
            training[
              training.length -
                1
            ].match_date,
          ),

        testStart:
          dateOnly(
            test[0]
              .match_date,
          ),

        testEnd:
          dateOnly(
            test[
              test.length -
                1
            ].match_date,
          ),

        selectedStrategy:
          selected,

        xsiOos,

        marketBaselineOos,
      });

      cursor =
        end;
    }

    const xsiOverall =
      aggregate(
        folds.map(
          (
            fold,
          ) =>
            fold.xsiOos,
        ),
      );

    const marketOverall =
      aggregate(
        folds.map(
          (
            fold,
          ) =>
            fold
              .marketBaselineOos,
        ),
      );

    const selectedFrequency =
      new Map<
        string,
        {
          strategy:
            Strategy;
          count:
            number;
        }
      >();

    for (
      const fold
      of folds
    ) {
      if (
        !fold
          .selectedStrategy
      ) {
        continue;
      }

      const strategy:
        Strategy = {
        side:
          fold
            .selectedStrategy
            .side,

        threshold:
          fold
            .selectedStrategy
            .threshold,

        oddsMin:
          fold
            .selectedStrategy
            .oddsMin,

        oddsMax:
          fold
            .selectedStrategy
            .oddsMax,

        oddsRange:
          fold
            .selectedStrategy
            .oddsRange,
      };

      const key =
        JSON.stringify(
          strategy,
        );

      const current =
        selectedFrequency.get(
          key,
        );

      if (
        current
      ) {
        current.count +=
          1;
      } else {
        selectedFrequency.set(
          key,
          {
            strategy,
            count:
              1,
          },
        );
      }
    }

    const mostSelectedStrategies =
      Array.from(
        selectedFrequency
          .values(),
      ).sort(
        (a, b) =>
          b.count -
          a.count,
      );

    console.log(
      "======================================",
    );

    console.log(
      "🇫🇷 LIGUE 1 ROI WALK FORWARD COMPLETE",
    );

    console.log(
      `總樣本：${rows.length}`,
    );

    console.log(
      `Initial Train：${initialTrain}`,
    );

    console.log(
      `Test Size：${testSize}`,
    );

    console.log(
      `Folds：${folds.length}`,
    );

    console.log(
      `XSI OOS Bets：${xsiOverall.bets}`,
    );

    console.log(
      `XSI OOS Profit：${xsiOverall.profit}`,
    );

    console.log(
      `XSI OOS ROI：${xsiOverall.roi}%`,
    );

    console.log(
      `Market OOS Bets：${marketOverall.bets}`,
    );

    console.log(
      `Market OOS Profit：${marketOverall.profit}`,
    );

    console.log(
      `Market OOS ROI：${marketOverall.roi}%`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        true,

      league:
        LEAGUE,

      season:
        SEASON,

      methodology: {
        type:
          "expanding-window ROI walk-forward",

        totalGames:
          rows.length,

        initialTrain,

        testSize,

        minTrainingBets,

        strategyCount:
          strategies()
            .length,

        note:
          "每個 Fold 只用過去 Training 資料挑選 ROI 最佳且達最低樣本數的 XSI 策略，再於未來 Test 區間驗證。Market baseline 使用相同 side 與 odds range，但不使用 XSI Value Gap。",
      },

      overall: {
        xsi:
          xsiOverall,

        marketBaseline:
          marketOverall,

        roiDifference:
          round(
            xsiOverall.roi -
              marketOverall.roi,
          ),
      },

      mostSelectedStrategies,

      folds,

      conclusion:
        xsiOverall.bets <
        20
          ? "OOS 投注樣本仍太少，不建議定版。"
          : xsiOverall.roi >
                5 &&
              xsiOverall.roi >
                marketOverall.roi
            ? "XSI 在真正 OOS ROI 驗證中有正向訊號，可進一步做跨賽季驗證。"
            : "XSI 尚未在 OOS ROI 驗證中證明穩定優於 Market baseline。",
    });
  } catch (
    error
  ) {
    console.error(
      "❌ Ligue 1 ROI Walk-Forward Error：",
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