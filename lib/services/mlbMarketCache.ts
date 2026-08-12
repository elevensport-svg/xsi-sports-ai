import {
  createAdminClient,
} from "../supabase/admin";

import type {
  MlbMarketData,
  MarketBookmaker,
} from "../api/market";

type MlbMarketCacheRow = {
  event_id: string;

  commence_time: string;

  away_team: string;
  home_team: string;

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

  total:
    | number
    | null;

  bookmakers:
    MarketBookmaker[];

  updated_at: string;

  created_at?: string;
};

/* ==========================================
   隊名正規化
========================================== */

function normalizeTeamName(
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
   MlbMarketData → DB Row
========================================== */

function marketDataToRow(
  market:
    MlbMarketData,
) {
  return {
    event_id:
      market.eventId,

    commence_time:
      market.commenceTime,

    away_team:
      market.awayTeam,

    home_team:
      market.homeTeam,

    away_moneyline:
      market.consensus
        .awayMoneyline,

    home_moneyline:
      market.consensus
        .homeMoneyline,

    away_spread:
      market.consensus
        .awaySpread,

    home_spread:
      market.consensus
        .homeSpread,

    total:
      market.consensus
        .total,

    bookmakers:
      market.bookmakers,

    updated_at:
      new Date()
        .toISOString(),
  };
}

/* ==========================================
   DB Row → MlbMarketData
========================================== */

function rowToMarketData(
  row:
    MlbMarketCacheRow,
): MlbMarketData {
  return {
    eventId:
      row.event_id,

    commenceTime:
      row.commence_time,

    awayTeam:
      row.away_team,

    homeTeam:
      row.home_team,

    bookmakers:
      Array.isArray(
        row.bookmakers,
      )
        ? row.bookmakers
        : [],

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
        row.total,
    },
  };
}

/* ==========================================
   儲存單場 MLB 盤口
========================================== */

export async function saveMlbMarketCache(
  market:
    MlbMarketData,
) {
  const supabase =
    createAdminClient();

  const row =
    marketDataToRow(
      market,
    );

  const {
    error,
  } = await supabase
    .from(
      "mlb_market_cache",
    )
    .upsert(
      row,
      {
        onConflict:
          "event_id",
      },
    );

  if (
    error
  ) {
    console.error(
      "MLB market cache 寫入失敗:",
      error,
    );

    return false;
  }

  return true;
}

/* ==========================================
   批次儲存 MLB 盤口
========================================== */

export async function saveMlbMarketCaches(
  markets:
    MlbMarketData[],
) {
  if (
    markets.length ===
    0
  ) {
    return {
      success: true,
      saved: 0,
    };
  }

  const supabase =
    createAdminClient();

  const rows =
    markets.map(
      marketDataToRow,
    );

  const {
    error,
  } = await supabase
    .from(
      "mlb_market_cache",
    )
    .upsert(
      rows,
      {
        onConflict:
          "event_id",
      },
    );

  if (
    error
  ) {
    console.error(
      "MLB market cache 批次寫入失敗:",
      error,
    );

    return {
      success: false,
      saved: 0,
      error:
        error.message,
    };
  }

  console.log(
    `⚾ mlb_market_cache 已儲存 ${rows.length} 場`,
  );

  return {
    success: true,
    saved:
      rows.length,
  };
}

/* ==========================================
   用兩隊名稱讀取單場快取
========================================== */

export async function getCachedMlbMarketData(
  awayTeamName:
    string,

  homeTeamName:
    string,
): Promise<
  MlbMarketData | null
> {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "mlb_market_cache",
    )
    .select(
      `
        event_id,
        commence_time,
        away_team,
        home_team,
        away_moneyline,
        home_moneyline,
        away_spread,
        home_spread,
        total,
        bookmakers,
        updated_at,
        created_at
      `,
    )
    .gte(
      "commence_time",
      new Date()
        .toISOString(),
    )
    .order(
      "commence_time",
      {
        ascending:
          true,
      },
    );

  if (
    error
  ) {
    console.error(
      "讀取 MLB market cache 失敗:",
      error,
    );

    return null;
  }

  const rows =
    (data ??
      []) as MlbMarketCacheRow[];

  const normalizedAway =
    normalizeTeamName(
      awayTeamName,
    );

  const normalizedHome =
    normalizeTeamName(
      homeTeamName,
    );

  const matched =
    rows.find(
      (row) =>
        normalizeTeamName(
          row.away_team,
        ) ===
          normalizedAway &&
        normalizeTeamName(
          row.home_team,
        ) ===
          normalizedHome,
    );

  if (
    !matched
  ) {
    return null;
  }

  return rowToMarketData(
    matched,
  );
}

/* ==========================================
   取得全部未來 MLB 盤口快取
========================================== */

export async function getAllCachedMlbMarkets(): Promise<
  MlbMarketData[]
> {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "mlb_market_cache",
    )
    .select(
      `
        event_id,
        commence_time,
        away_team,
        home_team,
        away_moneyline,
        home_moneyline,
        away_spread,
        home_spread,
        total,
        bookmakers,
        updated_at,
        created_at
      `,
    )
    .gte(
      "commence_time",
      new Date()
        .toISOString(),
    )
    .order(
      "commence_time",
      {
        ascending:
          true,
      },
    );

  if (
    error
  ) {
    console.error(
      "讀取全部 MLB market cache 失敗:",
      error,
    );

    return [];
  }

  return (
    (data ??
      []) as MlbMarketCacheRow[]
  ).map(
    rowToMarketData,
  );
}

/* ==========================================
   取得最後更新時間
========================================== */

export async function getMlbMarketCacheLastUpdated(): Promise<
  string | null
> {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "mlb_market_cache",
    )
    .select(
      "updated_at",
    )
    .order(
      "updated_at",
      {
        ascending:
          false,
      },
    )
    .limit(
      1,
    );

  if (
    error
  ) {
    console.error(
      "讀取 MLB market cache 更新時間失敗:",
      error,
    );

    return null;
  }

  return (
    data?.[0]
      ?.updated_at ??
    null
  );
}

/* ==========================================
   清除已開賽 MLB 盤口
========================================== */

export async function deleteExpiredMlbMarketCache() {
  const supabase =
    createAdminClient();

  const {
    error,
  } = await supabase
    .from(
      "mlb_market_cache",
    )
    .delete()
    .lt(
      "commence_time",
      new Date()
        .toISOString(),
    );

  if (
    error
  ) {
    console.error(
      "清除過期 MLB market cache 失敗:",
      error,
    );

    return false;
  }

  return true;
}