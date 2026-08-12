import {
  type OddsBookmaker,
  type OddsGame,
  type OddsMarket,
} from "./odds";

import {
  getCachedMlbMarketData,
} from "../services/mlbMarketCache";

export type MarketOutcome = {
  name: string;
  price: number;
  point?: number;
};

export type MarketBookmaker = {
  key: string;
  title: string;
  lastUpdate: string;
  moneyline: MarketOutcome[];
  spreads: MarketOutcome[];
  totals: MarketOutcome[];
};

export type MlbMarketData = {
  eventId: string;
  commenceTime: string;
  awayTeam: string;
  homeTeam: string;

  bookmakers:
    MarketBookmaker[];

  consensus: {
    awayMoneyline:
      number | null;

    homeMoneyline:
      number | null;

    awaySpread:
      number | null;

    homeSpread:
      number | null;

    total:
      number | null;
  };
};

/* ==========================================
   隊名正規化
========================================== */

export function normalizeTeamName(
  name: string,
): string {
  return name
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    )
    .trim();
}

/* ==========================================
   找指定 Market
========================================== */

function getMarket(
  bookmaker:
    OddsBookmaker,

  key:
    | "h2h"
    | "spreads"
    | "totals",
): OddsMarket | undefined {
  return bookmaker.markets.find(
    (market) =>
      market.key === key,
  );
}

/* ==========================================
   平均值
========================================== */

function average(
  values: number[],
): number | null {
  if (
    values.length ===
    0
  ) {
    return null;
  }

  const total =
    values.reduce(
      (
        sum,
        value,
      ) =>
        sum + value,
      0,
    );

  return Number(
    (
      total /
      values.length
    ).toFixed(
      2,
    ),
  );
}

/* ==========================================
   建立 MLB Consensus
========================================== */

export function buildMlbConsensus(
  game: OddsGame,
): MlbMarketData["consensus"] {
  const awayMoneylines:
    number[] = [];

  const homeMoneylines:
    number[] = [];

  const awaySpreads:
    number[] = [];

  const homeSpreads:
    number[] = [];

  const totals:
    number[] = [];

  for (
    const bookmaker
    of game.bookmakers
  ) {
    const moneyline =
      getMarket(
        bookmaker,
        "h2h",
      );

    const spreads =
      getMarket(
        bookmaker,
        "spreads",
      );

    const totalMarket =
      getMarket(
        bookmaker,
        "totals",
      );

    const awayMoneyline =
      moneyline
        ?.outcomes
        .find(
          (outcome) =>
            outcome.name ===
            game.away_team,
        );

    const homeMoneyline =
      moneyline
        ?.outcomes
        .find(
          (outcome) =>
            outcome.name ===
            game.home_team,
        );

    if (
      awayMoneyline
    ) {
      awayMoneylines.push(
        awayMoneyline.price,
      );
    }

    if (
      homeMoneyline
    ) {
      homeMoneylines.push(
        homeMoneyline.price,
      );
    }

    const awaySpread =
      spreads
        ?.outcomes
        .find(
          (outcome) =>
            outcome.name ===
            game.away_team,
        );

    const homeSpread =
      spreads
        ?.outcomes
        .find(
          (outcome) =>
            outcome.name ===
            game.home_team,
        );

    if (
      awaySpread?.point !==
      undefined
    ) {
      awaySpreads.push(
        awaySpread.point,
      );
    }

    if (
      homeSpread?.point !==
      undefined
    ) {
      homeSpreads.push(
        homeSpread.point,
      );
    }

    const over =
      totalMarket
        ?.outcomes
        .find(
          (outcome) =>
            outcome.name
              .toLowerCase() ===
            "over",
        );

    if (
      over?.point !==
      undefined
    ) {
      totals.push(
        over.point,
      );
    }
  }

  return {
    awayMoneyline:
      average(
        awayMoneylines,
      ),

    homeMoneyline:
      average(
        homeMoneylines,
      ),

    awaySpread:
      average(
        awaySpreads,
      ),

    homeSpread:
      average(
        homeSpreads,
      ),

    total:
      average(
        totals,
      ),
  };
}

/* ==========================================
   Bookmaker 轉換
========================================== */

export function mapMlbBookmaker(
  bookmaker:
    OddsBookmaker,
): MarketBookmaker {
  return {
    key:
      bookmaker.key,

    title:
      bookmaker.title,

    lastUpdate:
      bookmaker.last_update,

    moneyline:
      getMarket(
        bookmaker,
        "h2h",
      )
        ?.outcomes ??
      [],

    spreads:
      getMarket(
        bookmaker,
        "spreads",
      )
        ?.outcomes ??
      [],

    totals:
      getMarket(
        bookmaker,
        "totals",
      )
        ?.outcomes ??
      [],
  };
}

/* ==========================================
   OddsGame → MlbMarketData
========================================== */

export function mapOddsGameToMlbMarketData(
  game:
    OddsGame,
): MlbMarketData {
  return {
    eventId:
      game.id,

    commenceTime:
      game.commence_time,

    awayTeam:
      game.away_team,

    homeTeam:
      game.home_team,

    bookmakers:
      game.bookmakers.map(
        mapMlbBookmaker,
      ),

    consensus:
      buildMlbConsensus(
        game,
      ),
  };
}

/* ==========================================
   整批轉換

   給 /api/mlb/market-sync 使用
========================================== */

export function mapOddsGamesToMlbMarketData(
  games:
    OddsGame[],
): MlbMarketData[] {
  return games.map(
    mapOddsGameToMlbMarketData,
  );
}

/* ==========================================
   單場 MLB Market Data

   ★ 重要：
   現在只讀 Supabase mlb_market_cache
   不再呼叫 The Odds API
========================================== */

export async function getMlbMarketData(
  awayTeamName:
    string,

  homeTeamName:
    string,
): Promise<
  MlbMarketData | null
> {
  try {
    const cached =
      await getCachedMlbMarketData(
        awayTeamName,
        homeTeamName,
      );

    if (
      !cached
    ) {
      console.warn(
        `⚠️ MLB 快取找不到盤口：${awayTeamName} vs ${homeTeamName}`,
      );

      return null;
    }

    console.log(
      `⚾ 使用 MLB Supabase 盤口：${awayTeamName} vs ${homeTeamName}`,
    );

    return cached;
  } catch (error) {
    /*
     * 市場資料失敗不能讓整個
     * XSI Game Analysis 掛掉
     */
    console.error(
      `取得 MLB 快取盤口失敗：${awayTeamName} vs ${homeTeamName}`,
      error,
    );

    return null;
  }
}