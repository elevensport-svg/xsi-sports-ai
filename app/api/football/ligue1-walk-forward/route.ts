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
  market_home_prob: number | null;
  market_draw_prob: number | null;
  market_away_prob: number | null;
  home_form_score: number | null;
  away_form_score: number | null;
  home_attack_score: number | null;
  away_attack_score: number | null;
  home_defense_score: number | null;
  away_defense_score: number | null;
};

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

function round(value: number, digits = 1) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalize(home: number, draw: number, away: number): Probability {
  home = Math.max(1, home);
  draw = Math.max(1, draw);
  away = Math.max(1, away);

  const total = home + draw + away;

  return {
    home: (home / total) * 100,
    draw: (draw / total) * 100,
    away: (away / total) * 100,
  };
}

function actualResult(row: HistoryRow): Side {
  if (row.home_score > row.away_score) return "home";
  if (row.home_score < row.away_score) return "away";
  return "draw";
}

function leader(probability: Probability): Side {
  if (
    probability.home >= probability.draw &&
    probability.home >= probability.away
  ) {
    return "home";
  }

  if (
    probability.away >= probability.home &&
    probability.away >= probability.draw
  ) {
    return "away";
  }

  return "draw";
}

function calculateXsi(row: HistoryRow, params: Params): Probability | null {
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

  const formDiff = row.home_form_score - row.away_form_score;
  const attackDiff = row.home_attack_score - row.away_attack_score;
  const defenseDiff = row.home_defense_score - row.away_defense_score;

  const adjustment =
    clamp(formDiff * params.formWeight, -12, 12) +
    clamp(attackDiff * params.attackWeight, -8, 8) +
    clamp(defenseDiff * params.defenseWeight, -8, 8) +
    params.homeEdge;

  let home = row.market_home_prob + adjustment;
  let away = row.market_away_prob - adjustment;
  let draw = row.market_draw_prob;

  const formGap = Math.abs(formDiff);

  if (formGap <= 8) draw += 4;
  else if (formGap <= 15) draw += 2;
  else if (formGap >= 35) draw -= 3;

  return normalize(
    Math.max(8, home),
    Math.max(10, draw),
    Math.max(8, away),
  );
}

function evaluateMarket(rows: HistoryRow[]): Evaluation {
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

    games += 1;

    if (
      leader({
        home: row.market_home_prob,
        draw: row.market_draw_prob,
        away: row.market_away_prob,
      }) === actualResult(row)
    ) {
      correct += 1;
    }
  }

  return {
    games,
    correct,
    accuracy: games ? round((correct / games) * 100) : 0,
  };
}

function evaluateParams(rows: HistoryRow[], params: Params): Evaluation {
  let games = 0;
  let correct = 0;

  for (const row of rows) {
    const probability = calculateXsi(row, params);
    if (!probability) continue;

    games += 1;

    if (leader(probability) === actualResult(row)) {
      correct += 1;
    }
  }

  return {
    games,
    correct,
    accuracy: games ? round((correct / games) * 100) : 0,
  };
}

function buildParameterGrid(): Params[] {
  const formWeights = [0, 0.05, 0.1, 0.15, 0.2];
  const attackWeights = [0, 0.05, 0.1, 0.15];
  const defenseWeights = [0, 0.05, 0.1, 0.12, 0.15, 0.2];
  const homeEdges = [0, 1, 2, 3, 4, 5];

  const grid: Params[] = [];

  for (const formWeight of formWeights) {
    for (const attackWeight of attackWeights) {
      for (const defenseWeight of defenseWeights) {
        for (const homeEdge of homeEdges) {
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

function complexity(params: Params) {
  return (
    params.formWeight +
    params.attackWeight +
    params.defenseWeight +
    params.homeEdge / 10
  );
}

function selectBestParams(rows: HistoryRow[], grid: Params[]) {
  return grid
    .map((params) => ({
      params,
      evaluation: evaluateParams(rows, params),
    }))
    .sort((a, b) => {
      if (b.evaluation.accuracy !== a.evaluation.accuracy) {
        return b.evaluation.accuracy - a.evaluation.accuracy;
      }

      return complexity(a.params) - complexity(b.params);
    })[0];
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const initialTrain = Math.max(
      100,
      Math.floor(Number(url.searchParams.get("initialTrain") ?? 160)),
    );

    const testSize = Math.max(
      20,
      Math.floor(Number(url.searchParams.get("testSize") ?? 40)),
    );

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("football_match_history")
      .select(`
        id,
        match_date,
        home_score,
        away_score,
        market_home_prob,
        market_draw_prob,
        market_away_prob,
        home_form_score,
        away_form_score,
        home_attack_score,
        away_attack_score,
        home_defense_score,
        away_defense_score
      `)
      .eq("league", LEAGUE)
      .eq("season", SEASON)
      .eq("status", "finished")
      .order("match_date", { ascending: true });

    if (error) {
      throw new Error(`讀取 Ligue 1 Walk-Forward 資料失敗：${error.message}`);
    }

    const rows = (data ?? []) as HistoryRow[];

    if (rows.length < initialTrain + testSize) {
      return NextResponse.json(
        {
          success: false,
          message: `樣本不足：${rows.length} 場`,
        },
        { status: 400 },
      );
    }

    const grid = buildParameterGrid();
    const folds = [];

    let cursor = initialTrain;
    let marketCorrect = 0;
    let xsiCorrect = 0;
    let outOfSampleGames = 0;

    while (cursor < rows.length) {
      const end = Math.min(cursor + testSize, rows.length);
      const training = rows.slice(0, cursor);
      const test = rows.slice(cursor, end);

      if (!test.length) break;

      const best = selectBestParams(training, grid);
      const market = evaluateMarket(test);
      const xsi = evaluateParams(test, best.params);

      marketCorrect += market.correct;
      xsiCorrect += xsi.correct;
      outOfSampleGames += test.length;

      folds.push({
        fold: folds.length + 1,
        trainingStart: dateOnly(training[0].match_date),
        trainingEnd: dateOnly(training[training.length - 1].match_date),
        testStart: dateOnly(test[0].match_date),
        testEnd: dateOnly(test[test.length - 1].match_date),
        trainingGames: training.length,
        testGames: test.length,
        params: best.params,
        trainingAccuracy: best.evaluation.accuracy,
        marketAccuracy: market.accuracy,
        xsiAccuracy: xsi.accuracy,
        improvement: round(xsi.accuracy - market.accuracy),
      });

      cursor = end;
    }

    const marketAccuracy = outOfSampleGames
      ? round((marketCorrect / outOfSampleGames) * 100)
      : 0;

    const xsiAccuracy = outOfSampleGames
      ? round((xsiCorrect / outOfSampleGames) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      league: LEAGUE,
      season: SEASON,

      methodology: {
        type: "expanding-window walk-forward",
        totalGames: rows.length,
        initialTrain,
        testSize,
        folds: folds.length,
        parameterCombinations: grid.length,
        note:
          "每個 Fold 只使用 Test 區間之前的資料選參數，Test 不參與調參。",
      },

      overall: {
        outOfSampleGames,
        marketCorrect,
        xsiCorrect,
        marketAccuracy,
        xsiAccuracy,
        improvement: round(xsiAccuracy - marketAccuracy),
      },

      folds,

      conclusion:
        xsiAccuracy > marketAccuracy
          ? "Ligue 1 Walk-Forward XSI 整體優於 Market baseline，可繼續做 ROI 驗證。"
          : "Ligue 1 Walk-Forward XSI 未能整體優於 Market baseline，不建議直接定版。",
    });
  } catch (error) {
    console.error("❌ Ligue 1 Walk Forward Error：", error);

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