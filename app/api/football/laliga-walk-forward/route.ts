import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const LEAGUE = "西甲";
const SEASON = "2025/26";

type HistoryRow = {
  id: number;
  external_id: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;

  home_form_score: number | null;
  away_form_score: number | null;

  home_attack_score: number | null;
  away_attack_score: number | null;

  home_defense_score: number | null;
  away_defense_score: number | null;

  market_home_prob: number | null;
  market_draw_prob: number | null;
  market_away_prob: number | null;
};

type Side = "home" | "draw" | "away";

type Params = {
  formWeight: number;
  attackWeight: number;
  defenseWeight: number;
  homeEdge: number;
};

type Probability = {
  home: number;
  draw: number;
  away: number;
};

type Evaluation = {
  games: number;
  correct: number;
  accuracy: number;
};

type FoldResult = {
  fold: number;

  trainingStart: string;
  trainingEnd: string;
  testStart: string;
  testEnd: string;

  trainingGames: number;
  testGames: number;

  params: Params;

  trainingAccuracy: number;
  marketAccuracy: number;
  xsiAccuracy: number;
  improvement: number;
};

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(
    min,
    Math.min(max, value),
  );
}

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

function normalize(
  home: number,
  draw: number,
  away: number,
): Probability {
  const safeHome =
    Math.max(1, home);

  const safeDraw =
    Math.max(1, draw);

  const safeAway =
    Math.max(1, away);

  const total =
    safeHome +
    safeDraw +
    safeAway;

  return {
    home: round(
      safeHome /
        total *
        100,
    ),

    draw: round(
      safeDraw /
        total *
        100,
    ),

    away: round(
      safeAway /
        total *
        100,
    ),
  };
}

function actualResult(
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
  probability: Probability,
): Side {
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

function calculateXsi(
  row: HistoryRow,
  params: Params,
): Probability | null {
  if (
    row.market_home_prob === null ||
    row.market_draw_prob === null ||
    row.market_away_prob === null ||
    row.home_form_score === null ||
    row.away_form_score === null ||
    row.home_attack_score === null ||
    row.away_attack_score === null ||
    row.home_defense_score === null ||
    row.away_defense_score === null
  ) {
    return null;
  }

  const formDiff =
    row.home_form_score -
    row.away_form_score;

  const attackDiff =
    row.home_attack_score -
    row.away_attack_score;

  const defenseDiff =
    row.home_defense_score -
    row.away_defense_score;

  const formAdjustment =
    clamp(
      formDiff *
        params.formWeight,
      -12,
      12,
    );

  const attackAdjustment =
    clamp(
      attackDiff *
        params.attackWeight,
      -8,
      8,
    );

  const defenseAdjustment =
    clamp(
      defenseDiff *
        params.defenseWeight,
      -8,
      8,
    );

  const sideAdjustment =
    formAdjustment +
    attackAdjustment +
    defenseAdjustment +
    params.homeEdge;

  let home =
    row.market_home_prob +
    sideAdjustment;

  let away =
    row.market_away_prob -
    sideAdjustment;

  let draw =
    row.market_draw_prob;

  const formGap =
    Math.abs(formDiff);

  if (formGap <= 8) {
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
    Math.max(8, home);

  draw =
    Math.max(10, draw);

  away =
    Math.max(8, away);

  return normalize(
    home,
    draw,
    away,
  );
}

function evaluateMarket(
  rows: HistoryRow[],
): Evaluation {
  let games = 0;
  let correct = 0;

  for (const row of rows) {
    if (
      row.market_home_prob === null ||
      row.market_draw_prob === null ||
      row.market_away_prob === null
    ) {
      continue;
    }

    const prediction =
      leader({
        home:
          row.market_home_prob,

        draw:
          row.market_draw_prob,

        away:
          row.market_away_prob,
      });

    games += 1;

    if (
      prediction ===
      actualResult(row)
    ) {
      correct += 1;
    }
  }

  return {
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

function evaluateParams(
  rows: HistoryRow[],
  params: Params,
): Evaluation {
  let games = 0;
  let correct = 0;

  for (const row of rows) {
    const probability =
      calculateXsi(
        row,
        params,
      );

    if (!probability) {
      continue;
    }

    games += 1;

    if (
      leader(probability) ===
      actualResult(row)
    ) {
      correct += 1;
    }
  }

  return {
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

function buildParameterGrid() {
  const formWeights = [
    0,
    0.05,
    0.1,
    0.15,
    0.2,
  ];

  const attackWeights = [
    0,
    0.05,
    0.1,
    0.15,
  ];

  const defenseWeights = [
    0,
    0.05,
    0.1,
    0.12,
    0.15,
    0.2,
  ];

  const homeEdges = [
    0,
    1,
    2,
    3,
    4,
    5,
  ];

  const result:
    Params[] = [];

  for (
    const formWeight
    of formWeights
  ) {
    for (
      const attackWeight
      of attackWeights
    ) {
      for (
        const defenseWeight
        of defenseWeights
      ) {
        for (
          const homeEdge
          of homeEdges
        ) {
          result.push({
            formWeight,
            attackWeight,
            defenseWeight,
            homeEdge,
          });
        }
      }
    }
  }

  return result;
}

function complexity(
  params: Params,
) {
  return (
    params.formWeight +
    params.attackWeight +
    params.defenseWeight +
    params.homeEdge /
      10
  );
}

function selectBestParams(
  trainingRows:
    HistoryRow[],

  grid:
    Params[],
) {
  const evaluated =
    grid.map(
      (params) => ({
        params,

        evaluation:
          evaluateParams(
            trainingRows,
            params,
          ),
      }),
    );

  evaluated.sort(
    (a, b) => {
      if (
        b.evaluation
          .accuracy !==
        a.evaluation
          .accuracy
      ) {
        return (
          b.evaluation
            .accuracy -
          a.evaluation
            .accuracy
        );
      }

      return (
        complexity(
          a.params,
        ) -
        complexity(
          b.params,
        )
      );
    },
  );

  return evaluated[0];
}

function dateOnly(
  value: string,
) {
  return value.slice(
    0,
    10,
  );
}

/*
 * Expanding-window Walk Forward
 *
 * URL:
 * /api/football/laliga-walk-forward
 *
 * 可調：
 * ?initialTrain=160&testSize=40
 */
export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const initialTrainRaw =
      Number(
        url.searchParams.get(
          "initialTrain",
        ) ??
          "160",
      );

    const testSizeRaw =
      Number(
        url.searchParams.get(
          "testSize",
        ) ??
          "40",
      );

    const initialTrain =
      Number.isFinite(
        initialTrainRaw,
      )
        ? Math.max(
            100,
            Math.floor(
              initialTrainRaw,
            ),
          )
        : 160;

    const testSize =
      Number.isFinite(
        testSizeRaw,
      )
        ? Math.max(
            20,
            Math.floor(
              testSizeRaw,
            ),
          )
        : 40;

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
            home_form_score,
            away_form_score,
            home_attack_score,
            away_attack_score,
            home_defense_score,
            away_defense_score,
            market_home_prob,
            market_draw_prob,
            market_away_prob
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
          "home_form_score",
          "is",
          null,
        )
        .not(
          "away_form_score",
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
        `讀取 La Liga Walk Forward 資料失敗：${error.message}`,
      );
    }

    const rows =
      (data ??
        []) as HistoryRow[];

    if (
      rows.length <
      initialTrain +
        testSize
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `樣本不足。總樣本 ${rows.length}，initialTrain=${initialTrain}，testSize=${testSize}。`,
        },
        {
          status: 400,
        },
      );
    }

    const grid =
      buildParameterGrid();

    const folds:
      FoldResult[] = [];

    let cursor =
      initialTrain;

    let totalMarketCorrect =
      0;

    let totalXsiCorrect =
      0;

    let totalTestGames =
      0;

    while (
      cursor <
      rows.length
    ) {
      const testEnd =
        Math.min(
          cursor +
            testSize,
          rows.length,
        );

      const trainingRows =
        rows.slice(
          0,
          cursor,
        );

      const testRows =
        rows.slice(
          cursor,
          testEnd,
        );

      if (
        testRows.length ===
        0
      ) {
        break;
      }

      const best =
        selectBestParams(
          trainingRows,
          grid,
        );

      const market =
        evaluateMarket(
          testRows,
        );

      const xsi =
        evaluateParams(
          testRows,
          best.params,
        );

      totalMarketCorrect +=
        market.correct;

      totalXsiCorrect +=
        xsi.correct;

      totalTestGames +=
        Math.min(
          market.games,
          xsi.games,
        );

      folds.push({
        fold:
          folds.length +
          1,

        trainingStart:
          dateOnly(
            trainingRows[0]
              .match_date,
          ),

        trainingEnd:
          dateOnly(
            trainingRows[
              trainingRows.length -
                1
            ].match_date,
          ),

        testStart:
          dateOnly(
            testRows[0]
              .match_date,
          ),

        testEnd:
          dateOnly(
            testRows[
              testRows.length -
                1
            ].match_date,
          ),

        trainingGames:
          trainingRows.length,

        testGames:
          testRows.length,

        params:
          best.params,

        trainingAccuracy:
          best.evaluation
            .accuracy,

        marketAccuracy:
          market.accuracy,

        xsiAccuracy:
          xsi.accuracy,

        improvement:
          round(
            xsi.accuracy -
              market.accuracy,
          ),
      });

      cursor =
        testEnd;
    }

    const overallMarketAccuracy =
      totalTestGames >
      0
        ? round(
            totalMarketCorrect /
              totalTestGames *
              100,
          )
        : 0;

    const overallXsiAccuracy =
      totalTestGames >
      0
        ? round(
            totalXsiCorrect /
              totalTestGames *
              100,
          )
        : 0;

    const parameterFrequency =
      new Map<
        string,
        {
          params: Params;
          count: number;
        }
      >();

    for (
      const fold
      of folds
    ) {
      const key =
        JSON.stringify(
          fold.params,
        );

      const current =
        parameterFrequency.get(
          key,
        );

      if (current) {
        current.count +=
          1;
      } else {
        parameterFrequency.set(
          key,
          {
            params:
              fold.params,

            count:
              1,
          },
        );
      }
    }

    const mostSelectedParams =
      Array.from(
        parameterFrequency
          .values(),
      )
        .sort(
          (a, b) =>
            b.count -
            a.count,
        )
        .slice(
          0,
          10,
        );

    console.log(
      "======================================",
    );

    console.log(
      "🇪🇸 LA LIGA WALK FORWARD COMPLETE",
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
      `Out-of-sample Games：${totalTestGames}`,
    );

    console.log(
      `Market OOS Accuracy：${overallMarketAccuracy}%`,
    );

    console.log(
      `XSI OOS Accuracy：${overallXsiAccuracy}%`,
    );

    console.log(
      `Improvement：${round(
        overallXsiAccuracy -
          overallMarketAccuracy,
      )}%`,
    );

    console.log(
      "Most Selected Params：",
      mostSelectedParams,
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
          "expanding-window walk-forward",

        totalGames:
          rows.length,

        initialTrain,

        testSize,

        folds:
          folds.length,

        parameterCombinations:
          grid.length,

        note:
          "每個 Fold 只使用該 Test 區間之前的資料選參數，Test 不參與調參。",
      },

      overall: {
        outOfSampleGames:
          totalTestGames,

        marketCorrect:
          totalMarketCorrect,

        xsiCorrect:
          totalXsiCorrect,

        marketAccuracy:
          overallMarketAccuracy,

        xsiAccuracy:
          overallXsiAccuracy,

        improvement:
          round(
            overallXsiAccuracy -
              overallMarketAccuracy,
          ),
      },

      mostSelectedParams,

      folds,

      conclusion:
        overallXsiAccuracy >
        overallMarketAccuracy
          ? "La Liga Walk-Forward XSI 整體優於 Market baseline，可繼續做 Value / ROI 驗證。"
          : "La Liga Walk-Forward XSI 未能整體優於 Market baseline，不建議直接把參數視為正式優勢。",
    });
  } catch (
    error
  ) {
    console.error(
      "❌ La Liga Walk Forward Error：",
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