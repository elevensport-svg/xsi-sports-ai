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

type HistoryRow = {
  id: number;

  external_id: string;

  match_date: string;

  home_team: string;

  away_team: string;

  home_score: number;

  away_score: number;

  home_form_score:
    | number
    | null;

  away_form_score:
    | number
    | null;

  home_attack_score:
    | number
    | null;

  away_attack_score:
    | number
    | null;

  home_defense_score:
    | number
    | null;

  away_defense_score:
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
};

type ThreeWayProbability = {
  home: number;
  draw: number;
  away: number;
};

type ActualResult =
  | "home"
  | "draw"
  | "away";

type Params = {
  formWeight: number;
  attackWeight: number;
  defenseWeight: number;
  homeEdge: number;
};

type EvaluationResult = {
  games: number;
  correct: number;
  accuracy: number;

  homePredictions: number;
  drawPredictions: number;
  awayPredictions: number;
};

type CandidateResult = {
  params: Params;

  training:
    EvaluationResult;

  validation:
    EvaluationResult;
};

/* ==========================================
   Utils
========================================== */

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(
    min,
    Math.min(
      max,
      value,
    ),
  );
}

function round(
  value: number,
  digits = 1,
) {
  const power =
    10 **
    digits;

  return Math.round(
    value *
      power,
  ) /
    power;
}

function normalizeProbabilityScores(
  home: number,
  draw: number,
  away: number,
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
      round(
        safeHome /
          total *
          100,
      ),

    draw:
      round(
        safeDraw /
          total *
          100,
      ),

    away:
      round(
        safeAway /
          total *
          100,
      ),
  };
}

function getActualResult(
  row:
    HistoryRow,
): ActualResult {
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
  probabilities:
    ThreeWayProbability,
): ActualResult {
  if (
    probabilities.home >=
      probabilities.away &&
    probabilities.home >=
      probabilities.draw
  ) {
    return "home";
  }

  if (
    probabilities.away >=
      probabilities.home &&
    probabilities.away >=
      probabilities.draw
  ) {
    return "away";
  }

  return "draw";
}

/* ==========================================
   EPL Historical XSI Simulator

   Market = baseline

   Model:
   - Form difference
   - Attack difference
   - Defense difference
   - Home edge

   Draw adjustment:
   延續現有 footballGameAnalysis.ts
   使用 Form Gap 做和局修正。
========================================== */

function calculateProbabilities(
  row:
    HistoryRow,

  params:
    Params,
): ThreeWayProbability | null {
  if (
    row.market_home_prob ===
      null ||
    row.market_draw_prob ===
      null ||
    row.market_away_prob ===
      null ||
    row.home_form_score ===
      null ||
    row.away_form_score ===
      null ||
    row.home_attack_score ===
      null ||
    row.away_attack_score ===
      null ||
    row.home_defense_score ===
      null ||
    row.away_defense_score ===
      null
  ) {
    return null;
  }

  const formDifference =
    row.home_form_score -
    row.away_form_score;

  const attackDifference =
    row.home_attack_score -
    row.away_attack_score;

  const defenseDifference =
    row.home_defense_score -
    row.away_defense_score;

  const formAdjustment =
    clamp(
      formDifference *
        params.formWeight,
      -12,
      12,
    );

  const attackAdjustment =
    clamp(
      attackDifference *
        params.attackWeight,
      -8,
      8,
    );

  const defenseAdjustment =
    clamp(
      defenseDifference *
        params.defenseWeight,
      -8,
      8,
    );

  const totalSideAdjustment =
    formAdjustment +
    attackAdjustment +
    defenseAdjustment +
    params.homeEdge;

  let home =
    row.market_home_prob +
    totalSideAdjustment;

  let away =
    row.market_away_prob -
    totalSideAdjustment;

  let draw =
    row.market_draw_prob;

  const formGap =
    Math.abs(
      formDifference,
    );

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
   Evaluation
========================================== */

function evaluateMarket(
  rows:
    HistoryRow[],
): EvaluationResult {
  let games =
    0;

  let correct =
    0;

  let homePredictions =
    0;

  let drawPredictions =
    0;

  let awayPredictions =
    0;

  for (
    const row
    of rows
  ) {
    if (
      row.market_home_prob ===
        null ||
      row.market_draw_prob ===
        null ||
      row.market_away_prob ===
        null
    ) {
      continue;
    }

    const prediction =
      getLeader({
        home:
          row.market_home_prob,

        draw:
          row.market_draw_prob,

        away:
          row.market_away_prob,
      });

    const actual =
      getActualResult(
        row,
      );

    games +=
      1;

    if (
      prediction ===
      "home"
    ) {
      homePredictions +=
        1;
    } else if (
      prediction ===
      "draw"
    ) {
      drawPredictions +=
        1;
    } else {
      awayPredictions +=
        1;
    }

    if (
      prediction ===
      actual
    ) {
      correct +=
        1;
    }
  }

  return {
    games,

    correct,

    accuracy:
      games >
      0
        ? round(
            correct /
              games *
              100,
          )
        : 0,

    homePredictions,

    drawPredictions,

    awayPredictions,
  };
}

function evaluateParams(
  rows:
    HistoryRow[],

  params:
    Params,
): EvaluationResult {
  let games =
    0;

  let correct =
    0;

  let homePredictions =
    0;

  let drawPredictions =
    0;

  let awayPredictions =
    0;

  for (
    const row
    of rows
  ) {
    const probabilities =
      calculateProbabilities(
        row,
        params,
      );

    if (
      !probabilities
    ) {
      continue;
    }

    const prediction =
      getLeader(
        probabilities,
      );

    const actual =
      getActualResult(
        row,
      );

    games +=
      1;

    if (
      prediction ===
      "home"
    ) {
      homePredictions +=
        1;
    } else if (
      prediction ===
      "draw"
    ) {
      drawPredictions +=
        1;
    } else {
      awayPredictions +=
        1;
    }

    if (
      prediction ===
      actual
    ) {
      correct +=
        1;
    }
  }

  return {
    games,

    correct,

    accuracy:
      games >
      0
        ? round(
            correct /
              games *
              100,
          )
        : 0,

    homePredictions,

    drawPredictions,

    awayPredictions,
  };
}

/* ==========================================
   Parameter Grid

   刻意保持網格有限，
   避免過度細調 EPL 單季資料。
========================================== */

function buildParameterGrid(): Params[] {
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

  const grid:
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
          grid.push({
            formWeight,
            attackWeight,
            defenseWeight,
            homeEdge,
          });
        }
      }
    }
  }

  return grid;
}

/* ==========================================
   GET

   /api/football/epl-backtest

   可改 Training 比例：
   /api/football/epl-backtest?trainRatio=0.7
========================================== */

export async function GET(
  request:
    Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const requestedTrainRatio =
      Number(
        url.searchParams.get(
          "trainRatio",
        ) ??
          "0.7",
      );

    const trainRatio =
      Number.isFinite(
        requestedTrainRatio,
      )
        ? clamp(
            requestedTrainRatio,
            0.6,
            0.85,
          )
        : 0.7;

    const supabase =
      createAdminClient();

    /* ========================================
       STEP 1
       讀取 EPL 歷史資料
    ======================================== */

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

    if (
      error
    ) {
      throw new Error(
        `讀取 EPL backtest 資料失敗：${error.message}`,
      );
    }

    const rows =
      (
        data ??
        []
      ) as HistoryRow[];

    if (
      rows.length <
      100
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            `EPL 可回測樣本不足，目前只有 ${rows.length} 場。`,
        },
        {
          status:
            400,
        },
      );
    }

    /* ========================================
       STEP 2
       時間序切 Training / Validation

       不隨機洗牌。
       前段調參，後段獨立驗證。
    ======================================== */

    const splitIndex =
      Math.floor(
        rows.length *
          trainRatio,
      );

    const trainingRows =
      rows.slice(
        0,
        splitIndex,
      );

    const validationRows =
      rows.slice(
        splitIndex,
      );

    /* ========================================
       STEP 3
       市場 Baseline
    ======================================== */

    const marketTraining =
      evaluateMarket(
        trainingRows,
      );

    const marketValidation =
      evaluateMarket(
        validationRows,
      );

    /* ========================================
       STEP 4
       Grid Search

       只用 Training Accuracy 排名。
       Validation 絕對不參與選參數。
    ======================================== */

    const parameterGrid =
      buildParameterGrid();

    const candidates:
      CandidateResult[] =
      parameterGrid.map(
        (
          params,
        ) => ({
          params,

          training:
            evaluateParams(
              trainingRows,
              params,
            ),

          validation:
            evaluateParams(
              validationRows,
              params,
            ),
        }),
      );

    candidates.sort(
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

        /*
         * Training 同分時，
         * 優先較簡單、較小的總權重。
         * 不使用 Validation 做 tie-break。
         */
        const complexityA =
          a.params
            .formWeight +
          a.params
            .attackWeight +
          a.params
            .defenseWeight +
          a.params
            .homeEdge /
            10;

        const complexityB =
          b.params
            .formWeight +
          b.params
            .attackWeight +
          b.params
            .defenseWeight +
          b.params
            .homeEdge /
            10;

        return (
          complexityA -
          complexityB
        );
      },
    );

    const best =
      candidates[0];

    /* ========================================
       STEP 5
       西甲 V2 baseline

       用相同 EPL 資料測目前正式參數：
       form 0
       attack 0
       defense 0.12
       homeEdge 3
    ======================================== */

    const currentV2Params:
      Params = {
      formWeight:
        0,

      attackWeight:
        0,

      defenseWeight:
        0.12,

      homeEdge:
        3,
    };

    const currentV2Training =
      evaluateParams(
        trainingRows,
        currentV2Params,
      );

    const currentV2Validation =
      evaluateParams(
        validationRows,
        currentV2Params,
      );

    /* ========================================
       STEP 6
       結果
    ======================================== */

    const validationImprovementVsMarket =
      round(
        best.validation
          .accuracy -
        marketValidation
          .accuracy,
      );

    const validationImprovementVsCurrentV2 =
      round(
        best.validation
          .accuracy -
        currentV2Validation
          .accuracy,
      );

    console.log(
      "======================================",
    );

    console.log(
      "🏴 EPL BACKTEST COMPLETE",
    );

    console.log(
      `總樣本：${rows.length}`,
    );

    console.log(
      `Training：${trainingRows.length}`,
    );

    console.log(
      `Validation：${validationRows.length}`,
    );

    console.log(
      "Best Params：",
      best.params,
    );

    console.log(
      `Training Accuracy：${best.training.accuracy}%`,
    );

    console.log(
      `Validation Accuracy：${best.validation.accuracy}%`,
    );

    console.log(
      `Market Validation：${marketValidation.accuracy}%`,
    );

    console.log(
      `Current V2 Validation：${currentV2Validation.accuracy}%`,
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
        chronologicalSplit:
          true,

        trainRatio:
          round(
            trainRatio,
            2,
          ),

        selectionRule:
          "最佳參數只依 Training Accuracy 選擇；Validation 不參與調參。",

        totalGames:
          rows.length,

        trainingGames:
          trainingRows.length,

        validationGames:
          validationRows.length,

        parameterCombinations:
          parameterGrid.length,
      },

      marketBaseline: {
        training:
          marketTraining,

        validation:
          marketValidation,
      },

      currentLaLigaV2Baseline: {
        params:
          currentV2Params,

        training:
          currentV2Training,

        validation:
          currentV2Validation,
      },

      selectedEplModel: {
        params:
          best.params,

        training:
          best.training,

        validation:
          best.validation,

        validationImprovementVsMarket,

        validationImprovementVsCurrentV2,
      },

      topTrainingCandidates:
        candidates
          .slice(
            0,
            20,
          )
          .map(
            (
              candidate,
              index,
            ) => ({
              rank:
                index +
                1,

              params:
                candidate.params,

              training:
                candidate.training,

              validation:
                candidate.validation,
            }),
          ),

      note:
        "Validation 為時間序後段資料，未參與參數選擇。若 EPL 模型在 Validation 仍優於 Market，才建議接進正式 footballGameAnalysis。",
    });
  } catch (
    error
  ) {
    console.error(
      "❌ EPL Backtest Error：",
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