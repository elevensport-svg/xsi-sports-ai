import {
  getMlbGameByPk,
} from "../api/mlb";

import {
  getPitcherStatsBeforeDate,
} from "../api/historical-pitcher";

import {
  getTeamBattingStatsBeforeDate,
} from "../api/historical-batting";

import {
  getBullpenStatsBeforeDate,
} from "../api/historical-bullpen";

import {
  getTeamRecentFormBeforeDate,
} from "../api/historical-team-form";

import type {
  MlbMarketData,
} from "../api/market";

import {
  calculatePitcherScore,
} from "../xsi/pitcher";

import {
  calculateBattingScore,
} from "../xsi/batting";

import {
  calculateBullpenScore,
} from "../xsi/bullpen";

import {
  calculateFormScore,
} from "../xsi/recent";

import {
  calculateMarketScore,
} from "../xsi/market";

import {
  calculateWinProbability,
} from "../xsi/win-probability";

import {
  calculateXsiEngine,
} from "../xsi/engine";

import {
  calculateBetAdvisor,
} from "../xsi/betAdvisor";

export type HistoricalMlbMatchInput = {
  game_pk:
    string;

  match_date:
    string;

  away_team:
    string;

  home_team:
    string;

  away_moneyline:
    | number
    | null;

  home_moneyline:
    | number
    | null;

  away_spread:
    | number
    | null;

  home_spread:
    | number
    | null;

  total_line:
    | number
    | null;
};

export type HistoricalMlbXsiResult = {
  gamePk:
    string;

  cutoffDate:
    string;

  awayTeam:
    string;

  homeTeam:
    string;

  awayPitchScore:
    number;

  homePitchScore:
    number;

  awayBattingScore:
    number;

  homeBattingScore:
    number;

  awayBullpenScore:
    number;

  homeBullpenScore:
    number;

  awayFormScore:
    number;

  homeFormScore:
    number;

  awayMarketScore:
    number;

  homeMarketScore:
    number;

  awayXsi:
    number;

  homeXsi:
    number;

  xsiDiff:
    number;

  awayWinProbability:
    number;

  homeWinProbability:
    number;

  probabilityDiff:
    number;

  selectedTeam:
    string;

  selectedSide:
    "away" | "home";

  selectedSpread:
    number | null;

  recommendation:
    "獨贏" | "讓分" | "受讓 +1.5";

  confidence:
    number;

  diagnostics: {
    awayPitcherId:
      number | null;

    homePitcherId:
      number | null;

    h2hMode:
      "neutral";

    marketAvailable:
      boolean;
  };
};

/* ==========================================
   日期工具
========================================== */

function toDateKey(
  value: string,
) {
  return new Date(
    value,
  )
    .toISOString()
    .slice(
      0,
      10,
    );
}

/* ==========================================
   歷史 Market Data

   使用 mlb_match_history 裡已同步好的
   當時 Moneyline / Run Line / Total。

   bookmakers 留空沒關係，
   calculateMarketScore 主要仍會使用：
   moneyline + spread
========================================== */

function buildHistoricalMarketData(
  row:
    HistoricalMlbMatchInput,
): MlbMarketData | null {
  const hasAnyMarket =
    row.away_moneyline !==
      null ||
    row.home_moneyline !==
      null ||
    row.away_spread !==
      null ||
    row.home_spread !==
      null ||
    row.total_line !==
      null;

  if (
    !hasAnyMarket
  ) {
    return null;
  }

  return {
    eventId:
      `history-${row.game_pk}`,

    commenceTime:
      row.match_date,

    awayTeam:
      row.away_team,

    homeTeam:
      row.home_team,

    bookmakers:
      [],

    consensus: {
      awayMoneyline:
        row.away_moneyline,

      homeMoneyline:
        row.home_moneyline,

      awaySpread:
        row.away_spread,

      homeSpread:
        row.home_spread,

      total:
        row.total_line,
    },
  };
}

/* ==========================================
   歷史 XSI 單場計算

   重要：
   - Pitch / Batting / Bullpen / Form
     全部只使用 cutoffDate 前一天以前資料。
   - Market 使用當時 Historical Odds。
   - 不使用比賽結果。
   - H2H 暫時固定 50 / 50，避免誤用
     現在的 H2H 資料造成 look-ahead bias。
========================================== */

export async function calculateHistoricalMlbXsi(
  row:
    HistoricalMlbMatchInput,
): Promise<
  HistoricalMlbXsiResult | null
> {
  const game =
    await getMlbGameByPk(
      row.game_pk,
    );

  if (
    !game
  ) {
    console.warn(
      `⚠️ Historical XSI 找不到 MLB Game：${row.game_pk}`,
    );

    return null;
  }

  const cutoffDate =
    toDateKey(
      row.match_date,
    );

  const awayTeamId =
    game.teams.away
      .team.id;

  const homeTeamId =
    game.teams.home
      .team.id;

  const awayPitcherId =
    game.teams.away
      .probablePitcher
      ?.id ??
    null;

  const homePitcherId =
    game.teams.home
      .probablePitcher
      ?.id ??
    null;

  /* ========================================
     STEP 1
     歷史資料
  ======================================== */

  const [
    awayPitcherStats,
    homePitcherStats,
    awayBattingStats,
    homeBattingStats,
    awayBullpenStats,
    homeBullpenStats,
    awayFormStats,
    homeFormStats,
  ] =
    await Promise.all([
      getPitcherStatsBeforeDate(
        awayPitcherId ??
          undefined,
        cutoffDate,
      ),

      getPitcherStatsBeforeDate(
        homePitcherId ??
          undefined,
        cutoffDate,
      ),

      getTeamBattingStatsBeforeDate(
        awayTeamId,
        cutoffDate,
      ),

      getTeamBattingStatsBeforeDate(
        homeTeamId,
        cutoffDate,
      ),

      getBullpenStatsBeforeDate(
        awayTeamId,
        cutoffDate,
      ),

      getBullpenStatsBeforeDate(
        homeTeamId,
        cutoffDate,
      ),

      getTeamRecentFormBeforeDate(
        awayTeamId,
        cutoffDate,
      ),

      getTeamRecentFormBeforeDate(
        homeTeamId,
        cutoffDate,
      ),
    ]);

  /* ========================================
     STEP 2
     各模組分數
  ======================================== */

  const awayPitchScore =
    calculatePitcherScore(
      awayPitcherStats,
    );

  const homePitchScore =
    calculatePitcherScore(
      homePitcherStats,
    );

  const awayBattingScore =
    calculateBattingScore(
      awayBattingStats,
    );

  const homeBattingScore =
    calculateBattingScore(
      homeBattingStats,
    );

  const awayBullpenScore =
    calculateBullpenScore(
      awayBullpenStats,
    );

  const homeBullpenScore =
    calculateBullpenScore(
      homeBullpenStats,
    );

  const awayFormScore =
    calculateFormScore(
      awayFormStats,
    );

  const homeFormScore =
    calculateFormScore(
      homeFormStats,
    );

  const historicalMarket =
    buildHistoricalMarketData(
      row,
    );

  const marketScore =
    calculateMarketScore(
      historicalMarket,
    );

  /* ========================================
     STEP 3
     Win Probability

     H2H 暫時使用 50 / 50。
     這是刻意的：
     在 historical-h2h 尚未建立前，
     絕不能使用現在的 H2H API。
  ======================================== */

  const winProbability =
    calculateWinProbability(
      {
        pitch:
          awayPitchScore.score,

        batting:
          awayBattingScore.score,

        bullpen:
          awayBullpenScore.score,

        form:
          awayFormScore.score,

        market:
          marketScore.away
            .score,

        h2h:
          50,
      },

      {
        pitch:
          homePitchScore.score,

        batting:
          homeBattingScore.score,

        bullpen:
          homeBullpenScore.score,

        form:
          homeFormScore.score,

        market:
          marketScore.home
            .score,

        h2h:
          50,
      },
    );

  /* ========================================
     STEP 4
     XSI Engine

     直接沿用正式站 calculateXsiEngine。
  ======================================== */

  const awayXsi =
    calculateXsiEngine({
      pitch:
        awayPitchScore.score,

      bat:
        awayBattingScore.score,

      bullpen:
        awayBullpenScore.score,

      form:
        awayFormScore.score,

      market:
        marketScore.away
          .score,
    });

  const homeXsi =
    calculateXsiEngine({
      pitch:
        homePitchScore.score,

      bat:
        homeBattingScore.score,

      bullpen:
        homeBullpenScore.score,

      form:
        homeFormScore.score,

      market:
        marketScore.home
          .score,
    });

  /* ========================================
     STEP 5
     選隊

     跟正式 mlbGameAnalysis 一樣：
     Win Probability 決定方向；
     完全相同才用 XSI total tie-break。
  ======================================== */

  const awayWinProbability =
    winProbability
      .awayWinProbability;

  const homeWinProbability =
    winProbability
      .homeWinProbability;

  const selectedSide:
    "away" | "home" =
      awayWinProbability ===
      homeWinProbability
        ? awayXsi.total >=
          homeXsi.total
          ? "away"
          : "home"
        : awayWinProbability >
          homeWinProbability
          ? "away"
          : "home";

  const selectedTeam =
    selectedSide ===
    "away"
      ? row.away_team
      : row.home_team;

  const selectedXsi =
    selectedSide ===
    "away"
      ? awayXsi
      : homeXsi;

  const selectedWinProbability =
    selectedSide ===
    "away"
      ? awayWinProbability
      : homeWinProbability;

  const selectedSpread =
    selectedSide ===
    "away"
      ? row.away_spread
      : row.home_spread;

  const selectedPitchScore =
    selectedSide ===
    "away"
      ? awayPitchScore.score
      : homePitchScore.score;

  const selectedBattingScore =
    selectedSide ===
    "away"
      ? awayBattingScore.score
      : homeBattingScore.score;

  const selectedBullpenScore =
    selectedSide ===
    "away"
      ? awayBullpenScore.score
      : homeBullpenScore.score;

  const selectedFormScore =
    selectedSide ===
    "away"
      ? awayFormScore.score
      : homeFormScore.score;

  const selectedMarketScore =
    selectedSide ===
    "away"
      ? marketScore.away
          .score
      : marketScore.home
          .score;

  const xsiDiff =
    Math.abs(
      awayXsi.total -
        homeXsi.total,
    );

  const probabilityDiff =
    Math.abs(
      awayWinProbability -
        homeWinProbability,
    );

  /* ========================================
     STEP 6
     Bet Advisor 基礎信心
  ======================================== */

  const baseBetAdvisor =
    calculateBetAdvisor({
      pitch:
        selectedPitchScore,

      batting:
        selectedBattingScore,

      bullpen:
        selectedBullpenScore,

      form:
        selectedFormScore,

      market:
        selectedMarketScore,

      spread:
        selectedSpread,
    });

  /* ========================================
     STEP 7
     玩法

     完全沿用目前正式版規則：
     + spread → 受讓 +1.5
     - spread + 條件足夠 → 讓分
     其他 → 獨贏
  ======================================== */

  let recommendation:
    | "獨贏"
    | "讓分"
    | "受讓 +1.5" =
    "獨贏";

  const normalizedSpread =
    selectedSpread !==
      null &&
    Number.isFinite(
      Number(
        selectedSpread,
      ),
    )
      ? Number(
          selectedSpread,
        )
      : null;

  if (
    normalizedSpread !==
      null &&
    normalizedSpread > 0
  ) {
    recommendation =
      "受讓 +1.5";
  } else if (
    normalizedSpread !==
      null &&
    normalizedSpread < 0 &&
    selectedWinProbability >=
      58 &&
    (
      probabilityDiff >= 8 ||
      xsiDiff >= 5
    )
  ) {
    recommendation =
      "讓分";
  } else if (
    normalizedSpread !==
      null &&
    normalizedSpread < 0
  ) {
    recommendation =
      "獨贏";
  } else if (
    normalizedSpread === 0
  ) {
    recommendation =
      "獨贏";
  } else if (
    selectedWinProbability >=
      68 &&
    probabilityDiff >=
      20 &&
    selectedXsi.total >=
      70 &&
    xsiDiff >=
      10
  ) {
    recommendation =
      "讓分";
  } else {
    recommendation =
      "獨贏";
  }

  /* ========================================
     STEP 8
     Confidence

     跟正式版一樣：
     依 probability difference 調整，
     再依玩法難度校正。
  ======================================== */

  let confidenceBoost =
    0;

  if (
    probabilityDiff >=
    25
  ) {
    confidenceBoost =
      8;
  } else if (
    probabilityDiff >=
    15
  ) {
    confidenceBoost =
      5;
  } else if (
    probabilityDiff >=
    8
  ) {
    confidenceBoost =
      2;
  } else if (
    probabilityDiff <
    4
  ) {
    confidenceBoost =
      -5;
  }

  let marketTypeAdjustment =
    0;

  if (
    recommendation ===
    "受讓 +1.5"
  ) {
    marketTypeAdjustment =
      2;
  } else if (
    recommendation ===
    "讓分"
  ) {
    marketTypeAdjustment =
      -4;
  }

  const confidence =
    Math.max(
      50,
      Math.min(
        95,
        Math.round(
          baseBetAdvisor.confidence +
            confidenceBoost +
            marketTypeAdjustment,
        ),
      ),
    );

  return {
    gamePk:
      row.game_pk,

    cutoffDate,

    awayTeam:
      row.away_team,

    homeTeam:
      row.home_team,

    awayPitchScore:
      awayPitchScore.score,

    homePitchScore:
      homePitchScore.score,

    awayBattingScore:
      awayBattingScore.score,

    homeBattingScore:
      homeBattingScore.score,

    awayBullpenScore:
      awayBullpenScore.score,

    homeBullpenScore:
      homeBullpenScore.score,

    awayFormScore:
      awayFormScore.score,

    homeFormScore:
      homeFormScore.score,

    awayMarketScore:
      marketScore.away
        .score,

    homeMarketScore:
      marketScore.home
        .score,

    awayXsi:
      awayXsi.total,

    homeXsi:
      homeXsi.total,

    xsiDiff,

    awayWinProbability,

    homeWinProbability,

    probabilityDiff,

    selectedTeam,

    selectedSide,

    selectedSpread:
      normalizedSpread,

    recommendation,

    confidence,

    diagnostics: {
      awayPitcherId,

      homePitcherId,

      h2hMode:
        "neutral",

      marketAvailable:
        historicalMarket !==
        null,
    },
  };
}