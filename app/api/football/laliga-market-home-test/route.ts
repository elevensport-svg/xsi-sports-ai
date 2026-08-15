import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const LEAGUE = "西甲";
const SEASON = "2025/26";

type HistoryRow = {
  match_date: string;
  home_score: number;
  away_score: number;
  home_odds: number | null;
};

type Range = {
  label: string;
  min: number;
  max: number;
};

type MarketHomeResult = {
  oddsRange: string;
  bets: number;
  wins: number;
  losses: number;
  hitRate: number;
  totalStake: number;
  totalReturn: number;
  profit: number;
  roi: number;
  maxLosingStreak: number;
};

type SegmentResult = {
  segment: number;
  startDate: string;
  endDate: string;
  games: number;
  results: MarketHomeResult[];
};

const RANGES: Range[] = [
  { label: "1.01-1.49", min: 1.01, max: 1.49 },
  { label: "1.50-1.79", min: 1.5, max: 1.79 },
  { label: "1.80-2.19", min: 1.8, max: 2.19 },
  { label: "2.20-2.99", min: 2.2, max: 2.99 },
];

function round(value: number, digits = 1) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function evaluate(
  rows: HistoryRow[],
  range: Range,
): MarketHomeResult {
  let bets = 0;
  let wins = 0;
  let totalReturn = 0;
  let losingStreak = 0;
  let maxLosingStreak = 0;

  for (const row of rows) {
    const odds = row.home_odds;

    if (
      odds === null ||
      odds < range.min ||
      odds > range.max
    ) {
      continue;
    }

    bets += 1;

    if (row.home_score > row.away_score) {
      wins += 1;
      totalReturn += odds;
      losingStreak = 0;
    } else {
      losingStreak += 1;
      maxLosingStreak = Math.max(
        maxLosingStreak,
        losingStreak,
      );
    }
  }

  const profit = totalReturn - bets;

  return {
    oddsRange: range.label,
    bets,
    wins,
    losses: bets - wins,
    hitRate: bets ? round((wins / bets) * 100) : 0,
    totalStake: bets,
    totalReturn: round(totalReturn, 2),
    profit: round(profit, 2),
    roi: bets ? round((profit / bets) * 100) : 0,
    maxLosingStreak,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const segmentSize = Math.max(
      20,
      Number(url.searchParams.get("segmentSize") ?? 40),
    );

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("football_match_history")
      .select(`
        match_date,
        home_score,
        away_score,
        home_odds
      `)
      .eq("league", LEAGUE)
      .eq("season", SEASON)
      .eq("status", "finished")
      .not("home_odds", "is", null)
      .order("match_date", { ascending: true });

    if (error) {
      throw new Error(
        `讀取 La Liga Market Home 資料失敗：${error.message}`,
      );
    }

    const rows = (data ?? []) as HistoryRow[];

    const overall = RANGES.map((range) =>
      evaluate(rows, range),
    );

    const segments: SegmentResult[] = [];

    for (let start = 0; start < rows.length; start += segmentSize) {
      const segmentRows = rows.slice(start, start + segmentSize);

      if (!segmentRows.length) continue;

      segments.push({
        segment:
          Math.floor(start / segmentSize) + 1,
        startDate:
          segmentRows[0].match_date.slice(0, 10),
        endDate:
          segmentRows[segmentRows.length - 1].match_date.slice(0, 10),
        games: segmentRows.length,
        results: RANGES.map((range) =>
          evaluate(segmentRows, range),
        ),
      });
    }

    const stability = RANGES.map((range) => {
      const segmentResults = segments.map((segment) => {
        const result = segment.results.find(
          (item) => item.oddsRange === range.label,
        );

        return {
          segment: segment.segment,
          startDate: segment.startDate,
          endDate: segment.endDate,
          ...(result ?? evaluate([], range)),
        };
      });

      const activeSegments = segmentResults.filter(
        (result) => result.bets > 0,
      );

      const profitableSegments = activeSegments.filter(
        (result) => result.profit > 0,
      ).length;

      const losingSegments = activeSegments.filter(
        (result) => result.profit < 0,
      ).length;

      return {
        oddsRange: range.label,
        activeSegments: activeSegments.length,
        profitableSegments,
        losingSegments,
        flatSegments:
          activeSegments.length -
          profitableSegments -
          losingSegments,
        positiveSegmentRate:
          activeSegments.length > 0
            ? round(
                (profitableSegments / activeSegments.length) *
                  100,
              )
            : 0,
        segmentResults,
      };
    });

    const candidates = overall
      .map((result) => {
        const stable = stability.find(
          (item) => item.oddsRange === result.oddsRange,
        );

        return {
          ...result,
          profitableSegments:
            stable?.profitableSegments ?? 0,
          losingSegments:
            stable?.losingSegments ?? 0,
          positiveSegmentRate:
            stable?.positiveSegmentRate ?? 0,
        };
      })
      .filter(
        (result) =>
          result.bets >= 30 &&
          result.roi > 0 &&
          result.profitableSegments >
            result.losingSegments,
      )
      .sort((a, b) => b.roi - a.roi);

    console.log("======================================");
    console.log("🇪🇸 LA LIGA PURE MARKET HOME TEST COMPLETE");
    console.log(`總樣本：${rows.length}`);
    console.log(`Segment Size：${segmentSize}`);
    console.log("Overall：", overall);
    console.log("Candidates：", candidates);
    console.log("======================================");

    return NextResponse.json({
      success: true,
      league: LEAGUE,
      season: SEASON,

      methodology: {
        totalGames: rows.length,
        segmentSize,
        stakePerBet: 1,
        rule:
          "完全不使用 XSI、不做 Training 選策略。只要該場主勝賠率落在預先固定區間，就固定投注主勝 1 unit。",
        oddsRanges: RANGES.map((range) => range.label),
      },

      overall,
      stability,
      candidates,

      note:
        "這是純 Market 主勝規則測試。重點不是只看整季 ROI，而是確認正收益是否能跨不同時間 Segment 延續。",
    });
  } catch (error) {
    console.error(
      "❌ La Liga Pure Market Home Test Error：",
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