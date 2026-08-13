import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getMlbOdds,
} from "../../../../lib/api/odds";

import {
  mapOddsGamesToMlbMarketData,
} from "../../../../lib/api/market";

import {
  deleteExpiredMlbMarketCache,
  getMlbMarketCacheLastUpdated,
  getAllCachedMlbMarkets,
  saveMlbMarketCaches,
} from "../../../../lib/services/mlbMarketCache";

export const dynamic =
  "force-dynamic";

/*
 * 6 小時
 */
const SYNC_INTERVAL_MINUTES =
  360;

/* ==========================================
   計算距離上次更新幾分鐘
========================================== */

function getMinutesSince(
  dateString:
    | string
    | null,
) {
  if (!dateString) {
    return Infinity;
  }

  const timestamp =
    new Date(
      dateString,
    ).getTime();

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return Infinity;
  }

  return (
    Date.now() -
    timestamp
  ) /
    1000 /
    60;
}

/* ==========================================
   盤口診斷資料
========================================== */

function buildMarketDiagnostics(
  markets:
    ReturnType<
      typeof mapOddsGamesToMlbMarketData
    >,
) {
  return markets.map(
    (market) => ({
      eventId:
        market.eventId,

      matchup:
        `${market.awayTeam} vs ${market.homeTeam}`,

      commenceTime:
        market.commenceTime,

      awayMoneyline:
        market.consensus
          .awayMoneyline,

      homeMoneyline:
        market.consensus
          .homeMoneyline,

      awaySpread:
        market.consensus
          .awaySpread,

      homeSpread:
        market.consensus
          .homeSpread,

      total:
        market.consensus
          .total,

      bookmakerCount:
        market.bookmakers.length,

      spreadBookmakerCount:
        market.bookmakers.filter(
          (bookmaker) =>
            bookmaker.spreads.length >
            0,
        ).length,
    }),
  );
}

/* ==========================================
   GET /api/mlb/market-sync

   正常：
   /api/mlb/market-sync

   強制：
   /api/mlb/market-sync?force=1
========================================== */

export async function GET(
  request:
    NextRequest,
) {
  try {
    const force =
      request.nextUrl.searchParams.get(
        "force",
      ) === "1";

    /*
     * ========================================
     * STEP 1
     * 查 Supabase 最後更新時間
     * ========================================
     */

    const lastUpdatedAt =
      await getMlbMarketCacheLastUpdated();

    const minutesSinceUpdate =
      getMinutesSince(
        lastUpdatedAt,
      );

    /*
     * ========================================
     * STEP 2
     * 正常模式：
     * 6 小時內更新過就跳過 Odds API
     *
     * force=1：
     * 完全忽略這個限制
     * ========================================
     */

    if (
      !force &&
      minutesSinceUpdate <
        SYNC_INTERVAL_MINUTES
    ) {
      const cachedMarkets =
        await getAllCachedMlbMarkets();

      const diagnostics =
        buildMarketDiagnostics(
          cachedMarkets,
        );

      console.log(
        `⚾ MLB 盤口 ${Math.floor(
          minutesSinceUpdate,
        )} 分鐘前已更新，本次跳過 Odds API`,
      );

      console.log(
        "📊 MLB 快取盤口診斷：",
        diagnostics,
      );

      return NextResponse.json({
        success: true,

        skipped: true,

        forced: false,

        reason:
          "CACHE_FRESH",

        message:
          "MLB 盤口快取仍在 6 小時有效期內，本次沒有呼叫 Odds API。",

        syncIntervalMinutes:
          SYNC_INTERVAL_MINUTES,

        lastUpdatedAt,

        minutesSinceUpdate:
          Math.floor(
            minutesSinceUpdate,
          ),

        marketCount:
          cachedMarkets.length,

        diagnostics,
      });
    }

    /*
     * ========================================
     * STEP 3
     * 清除已經開賽的舊盤口
     * ========================================
     */

    await deleteExpiredMlbMarketCache();

    /*
     * ========================================
     * STEP 4
     * 呼叫 Odds API
     * ========================================
     */

    console.log(
      force
        ? "🔥 MLB 強制同步啟動，忽略 6 小時快取..."
        : "⚾ MLB 盤口快取已過期，開始同步 Odds API...",
    );

    const oddsGames =
      await getMlbOdds();

    /*
     * ========================================
     * STEP 5
     * Odds API 沒有資料
     * ========================================
     */

    if (
      oddsGames.length ===
      0
    ) {
      console.warn(
        "⚠️ Odds API 本次沒有取得 MLB 盤口。",
      );

      return NextResponse.json(
        {
          success: false,

          skipped: false,

          forced:
            force,

          reason:
            "NO_API_DATA",

          message:
            "Odds API 沒有取得 MLB 盤口。",

          syncIntervalMinutes:
            SYNC_INTERVAL_MINUTES,

          fetched: 0,

          saved: 0,
        },
        {
          status: 503,
        },
      );
    }

    /*
     * ========================================
     * STEP 6
     * Odds API → XSI MlbMarketData
     * ========================================
     */

    const markets =
      mapOddsGamesToMlbMarketData(
        oddsGames,
      );

    const diagnostics =
      buildMarketDiagnostics(
        markets,
      );

    console.log(
      `⚾ Odds API 取得 ${markets.length} 場 MLB 盤口`,
    );

    console.log(
      "======================================",
    );

    console.log(
      "📈 MLB Odds API Run Line 診斷",
    );

    for (
      const item
      of diagnostics
    ) {
      console.log(
        `${item.matchup}`,
      );

      console.log(
        `Moneyline：Away ${item.awayMoneyline ?? "null"} / Home ${item.homeMoneyline ?? "null"}`,
      );

      console.log(
        `Run Line：Away ${item.awaySpread ?? "null"} / Home ${item.homeSpread ?? "null"}`,
      );

      console.log(
        `Spread Books：${item.spreadBookmakerCount}/${item.bookmakerCount}`,
      );

      console.log(
        "--------------------------------------",
      );
    }

    console.log(
      "======================================",
    );

    /*
     * ========================================
     * STEP 7
     * 整批寫入 Supabase
     * ========================================
     */

    const saveResult =
      await saveMlbMarketCaches(
        markets,
      );

    if (
      !saveResult.success
    ) {
      return NextResponse.json(
        {
          success: false,

          skipped: false,

          forced:
            force,

          reason:
            "DATABASE_ERROR",

          message:
            "MLB 盤口取得成功，但寫入 mlb_market_cache 失敗。",

          fetched:
            markets.length,

          saved: 0,

          diagnostics,

          error:
            saveResult.error,
        },
        {
          status: 500,
        },
      );
    }

    /*
     * ========================================
     * STEP 8
     * 再讀一次 Supabase
     *
     * 確認 awaySpread / homeSpread
     * 寫進去後仍然存在
     * ========================================
     */

    const cachedMarkets =
      await getAllCachedMlbMarkets();

    const cacheDiagnostics =
      buildMarketDiagnostics(
        cachedMarkets,
      );

    const syncedAt =
      new Date()
        .toISOString();

    console.log(
      "======================================",
    );

    console.log(
      "⚾ MLB 盤口同步完成",
    );

    console.log(
      `強制同步：${force ? "YES" : "NO"}`,
    );

    console.log(
      `取得：${markets.length} 場`,
    );

    console.log(
      `儲存：${saveResult.saved} 場`,
    );

    console.log(
      `快取讀回：${cachedMarkets.length} 場`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success: true,

      skipped: false,

      forced:
        force,

      reason:
        force
          ? "FORCE_SYNC_COMPLETED"
          : "SYNC_COMPLETED",

      message:
        force
          ? "MLB 盤口強制同步完成。"
          : "MLB 盤口同步完成。",

      syncIntervalMinutes:
        SYNC_INTERVAL_MINUTES,

      fetched:
        markets.length,

      saved:
        saveResult.saved,

      syncedAt,

      /*
       * Odds API 原始轉換後
       */
      diagnostics,

      /*
       * 寫入 Supabase 後再讀回
       */
      cacheDiagnostics,
    });
  } catch (error) {
    console.error(
      "MLB market-sync 發生錯誤：",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        skipped: false,

        reason:
          "UNKNOWN_ERROR",

        message:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status: 500,
      },
    );
  }
}

/* ==========================================
   POST
========================================== */

export async function POST(
  request:
    NextRequest,
) {
  return GET(
    request,
  );
}