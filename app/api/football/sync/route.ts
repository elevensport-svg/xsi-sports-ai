import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

import {
  getTomorrowFootballGames,
} from "../../../../lib/api/football";

import {
  deleteExpiredFootballSchedule,
  saveFootballSchedule,
} from "../../../../lib/services/footballSchedule";

export const dynamic =
  "force-dynamic";

const SYNC_INTERVAL_MINUTES =
  360;

type LatestScheduleRow = {
  updated_at:
    | string
    | null;
};

/* ==========================================
   計算距離上次更新幾分鐘
========================================== */

function getMinutesSince(
  dateString:
    string | null,
) {
  if (
    !dateString
  ) {
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
   GET /api/football/sync
========================================== */

export async function GET() {
  try {
    const supabase =
      createAdminClient();

    /*
     * ========================================
     * STEP 1
     * 找最後更新時間
     * ========================================
     */

    const {
      data:
        latestRows,

      error:
        latestError,
    } = await supabase
      .from(
        "football_schedule",
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
      latestError
    ) {
      console.error(
        "讀取 football_schedule 更新時間失敗：",
        latestError,
      );
    }

    const latestRow =
      (
        latestRows ??
        []
      )[0] as
        | LatestScheduleRow
        | undefined;

    const lastUpdatedAt =
      latestRow
        ?.updated_at ??
      null;

    const minutesSinceUpdate =
      getMinutesSince(
        lastUpdatedAt,
      );

    /*
     * ========================================
     * STEP 2
     * 60 分鐘內更新過
     *
     * 不呼叫 Odds API
     * ========================================
     */

    if (
      minutesSinceUpdate <
      SYNC_INTERVAL_MINUTES
    ) {
      const {
        count,
      } = await supabase
        .from(
          "football_schedule",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        )
        .gte(
          "commence_time",
          new Date()
            .toISOString(),
        );

      console.log(
        `⚽ football_schedule ${Math.floor(
          minutesSinceUpdate,
        )} 分鐘前已更新，本次跳過 Odds API`,
      );

      return NextResponse.json(
        {
          success:
            true,

          skipped:
            true,

          reason:
            "CACHE_FRESH",

          message:
            "足球賽程快取仍在 60 分鐘有效期內，本次沒有呼叫 Odds API。",

          syncIntervalMinutes:
            SYNC_INTERVAL_MINUTES,

          lastUpdatedAt,

          minutesSinceUpdate:
            Math.floor(
              minutesSinceUpdate,
            ),

          scheduleCount:
            count ??
            0,
        },
      );
    }

    /*
     * ========================================
     * STEP 3
     * 清除已經開賽的舊賽事
     * ========================================
     */

    await deleteExpiredFootballSchedule();

    /*
     * ========================================
     * STEP 4
     * 超過 60 分鐘
     *
     * 才呼叫 Odds API
     * ========================================
     */

    console.log(
      "⚽ 足球快取已過期，開始同步 Odds API...",
    );

    const games =
      await getTomorrowFootballGames();

    /*
     * ========================================
     * STEP 5
     * API 沒有取得資料
     *
     * 不清空舊快取
     * ========================================
     */

    if (
      games.length ===
      0
    ) {
      console.warn(
        "⚠️ Odds API 本次沒有取得任何足球賽事。",
      );

      return NextResponse.json(
        {
          success:
            false,

          skipped:
            false,

          reason:
            "NO_API_DATA",

          message:
            "Odds API 沒有取得足球賽事，既有快取不會被清空。",

          syncIntervalMinutes:
            SYNC_INTERVAL_MINUTES,

          fetched:
            0,

          saved:
            0,
        },
        {
          status:
            503,
        },
      );
    }

    /*
     * ========================================
     * STEP 6
     * 寫入 football_schedule
     * ========================================
     */

    const saveResult =
      await saveFootballSchedule(
        games,
      );

    if (
      !saveResult.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          skipped:
            false,

          reason:
            "DATABASE_ERROR",

          message:
            "Odds API 已取得資料，但 football_schedule 寫入失敗。",

          fetched:
            games.length,

          saved:
            0,

          error:
            saveResult.error,
        },
        {
          status:
            500,
        },
      );
    }

    /*
     * ========================================
     * STEP 7
     * 完成
     * ========================================
     */

    const now =
      new Date()
        .toISOString();

    console.log(
      `⚽ 足球賽程同步完成：${games.length} 場`,
    );

    return NextResponse.json(
      {
        success:
          true,

        skipped:
          false,

        reason:
          "SYNC_COMPLETED",

        message:
          "足球賽程同步完成。",

        syncIntervalMinutes:
          SYNC_INTERVAL_MINUTES,

        fetched:
          games.length,

        saved:
          saveResult.saved,

        syncedAt:
          now,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "足球賽程同步 API 發生錯誤：",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        skipped:
          false,

        reason:
          "UNKNOWN_ERROR",

        message:
          error instanceof
          Error
            ? error.message
            : "足球賽程同步失敗",
      },
      {
        status:
          500,
      },
    );
  }
}