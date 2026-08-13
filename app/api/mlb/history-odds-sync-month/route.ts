import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

import {
  syncMlbHistoricalOddsForDate,
} from "../../../../lib/services/mlbHistoricalOddsSync";

export const dynamic =
  "force-dynamic";

/* ==========================================
   Helpers
========================================== */

function isValidMonth(
  value: string,
) {
  return /^\d{4}-\d{2}$/.test(
    value,
  );
}

function getMonthDateRange(
  month: string,
) {
  const [
    year,
    monthNumber,
  ] =
    month
      .split("-")
      .map(
        Number,
      );

  const start =
    new Date(
      Date.UTC(
        year,
        monthNumber - 1,
        1,
      ),
    );

  const end =
    new Date(
      Date.UTC(
        year,
        monthNumber,
        0,
      ),
    );

  const days =
    end.getUTCDate();

  const dates:
    string[] = [];

  for (
    let day = 1;
    day <= days;
    day += 1
  ) {
    dates.push(
      [
        year,
        String(
          monthNumber,
        ).padStart(
          2,
          "0",
        ),
        String(
          day,
        ).padStart(
          2,
          "0",
        ),
      ].join("-"),
    );
  }

  return dates;
}

async function isDateAlreadyComplete(
  date:
    string,
) {
  const supabase =
    createAdminClient();

  const start =
    `${date}T00:00:00.000Z`;

  const nextDate =
    new Date(
      `${date}T00:00:00.000Z`,
    );

  nextDate.setUTCDate(
    nextDate.getUTCDate() +
      1,
  );

  const end =
    nextDate.toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "mlb_match_history",
      )
      .select(
        `
          game_pk,
          home_moneyline,
          away_moneyline,
          home_spread,
          away_spread,
          total_line
        `,
      )
      .gte(
        "match_date",
        start,
      )
      .lt(
        "match_date",
        end,
      );

  if (
    error
  ) {
    throw new Error(
      `檢查 ${date} 歷史盤口失敗：${error.message}`,
    );
  }

  const rows =
    data ??
    [];

  if (
    rows.length ===
    0
  ) {
    return {
      complete:
        true,

      reason:
        "NO_GAMES",

      rows:
        0,
    };
  }

  const completeRows =
    rows.filter(
      (row) =>
        row.home_moneyline !==
          null &&
        row.away_moneyline !==
          null &&
        row.home_spread !==
          null &&
        row.away_spread !==
          null &&
        row.total_line !==
          null,
    );

  return {
    complete:
      completeRows.length ===
      rows.length,

    reason:
      completeRows.length ===
      rows.length
        ? "COMPLETE"
        : "INCOMPLETE",

    rows:
      rows.length,

    completeRows:
      completeRows.length,
  };
}

/* ==========================================
   GET

   安全預覽：
   /api/mlb/history-odds-sync-month
     ?month=2026-07

   真正執行：
   /api/mlb/history-odds-sync-month
     ?month=2026-07
     &confirm=1

   可限制最多同步幾天：
   /api/mlb/history-odds-sync-month
     ?month=2026-07
     &confirm=1
     &limit=5
========================================== */

export async function GET(
  request:
    NextRequest,
) {
  try {
    const {
      searchParams,
    } =
      request.nextUrl;

    const month =
      searchParams.get(
        "month",
      );

    const confirm =
      searchParams.get(
        "confirm",
      ) === "1";

    const limitText =
      searchParams.get(
        "limit",
      );

    const limit =
      limitText
        ? Math.max(
            1,
            Math.min(
              31,
              Number(
                limitText,
              ),
            ),
          )
        : null;

    if (
      !month ||
      !isValidMonth(
        month,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "請提供 month=YYYY-MM，例如 ?month=2026-07",
        },
        {
          status:
            400,
        },
      );
    }

    const dates =
      getMonthDateRange(
        month,
      );

    /*
     * ========================================
     * STEP 1
     * 預先檢查哪些日期已經完整
     * ========================================
     */

    const preview:
      Array<{
        date:
          string;

        status:
          string;

        rows:
          number;

        completeRows?:
          number;
      }> = [];

    const pendingDates:
      string[] = [];

    for (
      const date
      of dates
    ) {
      const status =
        await isDateAlreadyComplete(
          date,
        );

      preview.push({
        date,

        status:
          status.reason,

        rows:
          status.rows,

        completeRows:
          status.completeRows,
      });

      if (
        !status.complete
      ) {
        pendingDates.push(
          date,
        );
      }
    }

    const effectiveDates =
      limit
        ? pendingDates.slice(
            0,
            limit,
          )
        : pendingDates;

    /*
     * ========================================
     * STEP 2
     * 沒 confirm=1 只做安全預覽
     * ========================================
     */

    if (
      !confirm
    ) {
      return NextResponse.json({
        success:
          true,

        preview:
          true,

        message:
          "這是安全預覽，尚未呼叫 Historical Odds API。確認後加上 &confirm=1。",

        month,

        totalDates:
          dates.length,

        alreadyComplete:
          dates.length -
          pendingDates.length,

        pending:
          pendingDates.length,

        limit,

        willSync:
          effectiveDates.length,

        estimatedMaxCredits:
          effectiveDates.length *
          30,

        dates:
          preview,
      });
    }

    /*
     * ========================================
     * STEP 3
     * 真正同步
     * ========================================
     */

    console.log(
      "======================================",
    );

    console.log(
      `📅 MLB Historical Odds Month Sync：${month}`,
    );

    console.log(
      `🧾 待同步：${effectiveDates.length} 天`,
    );

    let syncedDates =
      0;

    let failedDates =
      0;

    let totalMatched =
      0;

    let totalUpdated =
      0;

    let totalSkipped =
      0;

    let totalCost =
      0;

    let remaining:
      string | null =
      null;

    const results:
      Array<{
        date:
          string;

        success:
          boolean;

        matched?:
          number;

        updated?:
          number;

        skipped?:
          number;

        cost?:
          number;

        remaining?:
          string | null;

        error?:
          string;
      }> = [];

    for (
      const date
      of effectiveDates
    ) {
      try {
        console.log(
          `▶️ 同步 ${date}`,
        );

        const result =
          await syncMlbHistoricalOddsForDate(
            date,
          );

        const cost =
          Number(
            result.quota.last ??
              0,
          );

        syncedDates +=
          1;

        totalMatched +=
          result.matched;

        totalUpdated +=
          result.updated;

        totalSkipped +=
          result.skipped;

        if (
          Number.isFinite(
            cost,
          )
        ) {
          totalCost +=
            cost;
        }

        remaining =
          result.quota
            .remaining;

        results.push({
          date,

          success:
            true,

          matched:
            result.matched,

          updated:
            result.updated,

          skipped:
            result.skipped,

          cost:
            Number.isFinite(
              cost,
            )
              ? cost
              : 0,

          remaining:
            result.quota
              .remaining,
        });
      } catch (
        error
      ) {
        failedDates +=
          1;

        const message =
          error instanceof
          Error
            ? error.message
            : String(
                error,
              );

        console.error(
          `❌ ${date} 同步失敗：`,
          message,
        );

        results.push({
          date,

          success:
            false,

          error:
            message,
        });
      }
    }

    console.log(
      "======================================",
    );

    console.log(
      "🎉 MLB Historical Odds Month Sync 完成",
    );

    console.log(
      `📅 月份：${month}`,
    );

    console.log(
      `✅ 成功日期：${syncedDates}`,
    );

    console.log(
      `❌ 失敗日期：${failedDates}`,
    );

    console.log(
      `🔗 Matched：${totalMatched}`,
    );

    console.log(
      `💾 Updated：${totalUpdated}`,
    );

    console.log(
      `⏭️ Skipped：${totalSkipped}`,
    );

    console.log(
      `💳 Total Cost：${totalCost}`,
    );

    console.log(
      `💳 Remaining：${remaining ?? "unknown"}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        failedDates ===
        0,

      preview:
        false,

      message:
        "MLB 整月歷史盤口同步完成",

      month,

      totalDates:
        dates.length,

      alreadyComplete:
        dates.length -
        pendingDates.length,

      requestedSyncDates:
        effectiveDates.length,

      syncedDates,

      failedDates,

      totalMatched,

      totalUpdated,

      totalSkipped,

      totalCost,

      remaining,

      results,
    });
  } catch (
    error
  ) {
    console.error(
      "❌ MLB Historical Odds Month Sync Error：",
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