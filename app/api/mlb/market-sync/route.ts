import {
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
   GET /api/mlb/market-sync
========================================== */

export async function GET() {
  try {
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
     * 6 小時內更新過
     *
     * 不呼叫 Odds API
     * ========================================
     */

    if (
      minutesSinceUpdate <
      SYNC_INTERVAL_MINUTES
    ) {
      const cachedMarkets =
        await getAllCachedMlbMarkets();

      console.log(
        `⚾ MLB 盤口 ${Math.floor(
          minutesSinceUpdate,
        )} 分鐘前已更新，本次跳過 Odds API`,
      );

      return NextResponse.json({
        success: true,

        skipped: true,

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
     * 超過 6 小時
     *
     * 這裡才允許呼叫 Odds API
     * ========================================
     */

    console.log(
      "⚾ MLB 盤口快取已過期，開始同步 Odds API...",
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
     * Odds API 格式
     * →
     * XSI MlbMarketData 格式
     * ========================================
     */

    const markets =
      mapOddsGamesToMlbMarketData(
        oddsGames,
      );

    console.log(
      `⚾ Odds API 取得 ${markets.length} 場 MLB 盤口`,
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

          reason:
            "DATABASE_ERROR",

          message:
            "MLB 盤口取得成功，但寫入 mlb_market_cache 失敗。",

          fetched:
            markets.length,

          saved: 0,

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
     * 完成
     * ========================================
     */

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
      `取得：${markets.length} 場`,
    );

    console.log(
      `儲存：${saveResult.saved} 場`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success: true,

      skipped: false,

      reason:
        "SYNC_COMPLETED",

      message:
        "MLB 盤口同步完成。",

      syncIntervalMinutes:
        SYNC_INTERVAL_MINUTES,

      fetched:
        markets.length,

      saved:
        saveResult.saved,

      syncedAt,
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

export async function POST() {
  return GET();
}