import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const LEAGUE = "西甲";
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

type Bet = {
  fold: number;
  date: string;
  side: Side;
  oddsRange: string;
  odds: number;
  won: boolean;
  profit: number;
};

function round(value: number, digits = 1) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function actual(row: HistoryRow): Side {
  if (row.home_score > row.away_score) return "home";
  if (row.home_score < row.away_score) return "away";
  return "draw";
}

function leader(home: number, draw: number, away: number): Side {
  if (home >= draw && home >= away) return "home";
  if (away >= home && away >= draw) return "away";
  return "draw";
}

function xsiLeader(row: HistoryRow): Side {
  return leader(
    row.xsi_home_prob ?? 0,
    row.xsi_draw_prob ?? 0,
    row.xsi_away_prob ?? 0,
  );
}

function marketLeader(row: HistoryRow): Side {
  return leader(
    row.market_home_prob ?? 0,
    row.market_draw_prob ?? 0,
    row.market_away_prob ?? 0,
  );
}

function prob(row: HistoryRow, side: Side, source: "xsi" | "market") {
  if (source === "xsi") {
    if (side === "home") return row.xsi_home_prob;
    if (side === "draw") return row.xsi_draw_prob;
    return row.xsi_away_prob;
  }
  if (side === "home") return row.market_home_prob;
  if (side === "draw") return row.market_draw_prob;
  return row.market_away_prob;
}

function getOdds(row: HistoryRow, side: Side) {
  if (side === "home") return row.home_odds;
  if (side === "draw") return row.draw_odds;
  return row.away_odds;
}

function complete(row: HistoryRow) {
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

function valueGap(row: HistoryRow, side: Side) {
  const x = prob(row, side, "xsi");
  const m = prob(row, side, "market");
  if (x === null || m === null) return null;
  return x - m;
}

function inRange(value: number, min: number, max: number | null) {
  return value >= min && (max === null || value <= max);
}

function strategyGrid(): Strategy[] {
  const thresholds = [0, 3, 5, 7];
  const ranges = [
    { label: "1.01-1.49", min: 1.01, max: 1.49 },
    { label: "1.50-1.79", min: 1.5, max: 1.79 },
    { label: "1.80-2.19", min: 1.8, max: 2.19 },
    { label: "2.20-2.99", min: 2.2, max: 2.99 },
    { label: "3.00+", min: 3, max: null },
  ];
  const sides: Side[] = ["home", "draw", "away"];
  const result: Strategy[] = [];

  for (const threshold of thresholds) {
    for (const range of ranges) {
      for (const side of sides) {
        result.push({
          side,
          threshold,
          oddsMin: range.min,
          oddsMax: range.max,
          oddsRange: range.label,
        });
      }
    }
  }
  return result;
}

function evaluateTraining(rows: HistoryRow[], strategy: Strategy) {
  let games = 0;
  let returns = 0;

  for (const row of rows) {
    if (!complete(row)) continue;
    if (xsiLeader(row) !== strategy.side) continue;

    const gap = valueGap(row, strategy.side);
    if (gap === null || gap < strategy.threshold) continue;

    const odds = getOdds(row, strategy.side);
    if (odds === null || !inRange(odds, strategy.oddsMin, strategy.oddsMax)) {
      continue;
    }

    games += 1;
    if (actual(row) === strategy.side) returns += odds;
  }

  const profit = returns - games;

  return {
    ...strategy,
    games,
    profit: round(profit, 2),
    roi: games ? round((profit / games) * 100) : 0,
  };
}

function chooseStrategy(rows: HistoryRow[], minTrainingBets: number) {
  return (
    strategyGrid()
      .map((strategy) => evaluateTraining(rows, strategy))
      .filter((result) => result.games >= minTrainingBets)
      .sort((a, b) => {
        if (b.roi !== a.roi) return b.roi - a.roi;
        return b.games - a.games;
      })[0] ?? null
  );
}

function collectMarketBets(
  rows: HistoryRow[],
  strategy: Strategy,
  fold: number,
): Bet[] {
  const bets: Bet[] = [];

  for (const row of rows) {
    if (!complete(row)) continue;

    const side = marketLeader(row);
    if (side !== strategy.side) continue;

    const odds = getOdds(row, side);
    if (
      odds === null ||
      !inRange(odds, strategy.oddsMin, strategy.oddsMax)
    ) {
      continue;
    }

    const won = actual(row) === side;

    bets.push({
      fold,
      date: row.match_date.slice(0, 10),
      side,
      oddsRange: strategy.oddsRange,
      odds,
      won,
      profit: round(won ? odds - 1 : -1, 2),
    });
  }

  return bets;
}

function summarize(bets: Bet[]) {
  const wins = bets.filter((bet) => bet.won).length;
  const profit = bets.reduce((sum, bet) => sum + bet.profit, 0);

  let currentLosing = 0;
  let maxLosingStreak = 0;

  for (const bet of bets) {
    if (bet.won) {
      currentLosing = 0;
    } else {
      currentLosing += 1;
      maxLosingStreak = Math.max(maxLosingStreak, currentLosing);
    }
  }

  return {
    bets: bets.length,
    wins,
    losses: bets.length - wins,
    hitRate: bets.length ? round((wins / bets.length) * 100) : 0,
    profit: round(profit, 2),
    roi: bets.length ? round((profit / bets.length) * 100) : 0,
    maxLosingStreak,
  };
}

function groupBy<T>(
  bets: Bet[],
  keyFn: (bet: Bet) => T,
) {
  const map = new Map<string, { key: T; bets: Bet[] }>();

  for (const bet of bets) {
    const key = keyFn(bet);
    const serialized = JSON.stringify(key);

    const current = map.get(serialized);
    if (current) {
      current.bets.push(bet);
    } else {
      map.set(serialized, { key, bets: [bet] });
    }
  }

  return Array.from(map.values()).map((entry) => ({
    key: entry.key,
    ...summarize(entry.bets),
  }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const initialTrain = Math.max(
      100,
      Number(url.searchParams.get("initialTrain") ?? 160),
    );

    const testSize = Math.max(
      20,
      Number(url.searchParams.get("testSize") ?? 40),
    );

    const minTrainingBets = Math.max(
      10,
      Number(url.searchParams.get("minTrainingBets") ?? 20),
    );

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("football_match_history")
      .select(`
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
      `)
      .eq("league", LEAGUE)
      .eq("season", SEASON)
      .eq("status", "finished")
      .order("match_date", { ascending: true });

    if (error) {
      throw new Error(`讀取西甲資料失敗：${error.message}`);
    }

    const rows = (data ?? []) as HistoryRow[];

    if (rows.length < initialTrain + testSize) {
      return NextResponse.json(
        { success: false, message: `樣本不足：${rows.length} 場` },
        { status: 400 },
      );
    }

    const allMarketBets: Bet[] = [];
    const foldDetails: any[] = [];

    let cursor = initialTrain;
    let fold = 1;

    while (cursor < rows.length) {
      const end = Math.min(cursor + testSize, rows.length);
      const training = rows.slice(0, cursor);
      const test = rows.slice(cursor, end);

      if (!test.length) break;

      const selected = chooseStrategy(training, minTrainingBets);

      if (selected) {
        const bets = collectMarketBets(test, selected, fold);
        allMarketBets.push(...bets);

        foldDetails.push({
          fold,
          trainingGames: training.length,
          testGames: test.length,
          testStart: test[0].match_date.slice(0, 10),
          testEnd: test[test.length - 1].match_date.slice(0, 10),
          xsiSelectedStrategy: selected,
          marketResult: summarize(bets),
        });
      }

      cursor = end;
      fold += 1;
    }

    const bySide = groupBy(allMarketBets, (bet) => bet.side)
      .sort((a, b) => b.bets - a.bets);

    const byOddsRange = groupBy(
      allMarketBets,
      (bet) => bet.oddsRange,
    ).sort((a, b) => b.bets - a.bets);

    const byFold = groupBy(allMarketBets, (bet) => bet.fold)
      .sort((a, b) => Number(a.key) - Number(b.key));

    const profitableFolds = byFold.filter((x) => x.profit > 0).length;
    const losingFolds = byFold.filter((x) => x.profit < 0).length;

    console.log("======================================");
    console.log("🇪🇸 LA LIGA MARKET OOS BREAKDOWN COMPLETE");
    console.log(`總 Market OOS Bets：${allMarketBets.length}`);
    console.log(`總 Profit：${summarize(allMarketBets).profit}`);
    console.log(`總 ROI：${summarize(allMarketBets).roi}%`);
    console.log(`正收益 Folds：${profitableFolds}`);
    console.log(`負收益 Folds：${losingFolds}`);
    console.log("By Side：", bySide);
    console.log("By Odds Range：", byOddsRange);
    console.log("By Fold：", byFold);
    console.log("======================================");

    return NextResponse.json({
      success: true,
      league: LEAGUE,
      season: SEASON,

      methodology: {
        initialTrain,
        testSize,
        minTrainingBets,
        note:
          "重現 La Liga ROI Walk-Forward：每個 Fold 先由 Training 的 XSI ROI 選策略，再拆解該策略於 Test 區間的 Market baseline 投注。每注固定 1 unit。",
      },

      overall: summarize(allMarketBets),

      stability: {
        totalFolds: byFold.length,
        profitableFolds,
        losingFolds,
        flatFolds: byFold.filter((x) => x.profit === 0).length,
      },

      bySide,
      byOddsRange,
      byFold,
      foldDetails,

      bets: allMarketBets,

      conclusion:
        profitableFolds > losingFolds &&
        summarize(allMarketBets).roi > 5
          ? "Market OOS 收益具有一定跨 Fold 延續性，值得進一步驗證。"
          : "Market OOS 收益可能集中於少數 Fold 或區間，暫時不應直接上線。",
    });
  } catch (error) {
    console.error("❌ La Liga Market OOS Breakdown Error：", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}