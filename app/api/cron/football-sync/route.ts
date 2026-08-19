import {
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

/* ==========================================
   FOOTBALL SYNC CRON

   流程：
   1. 足球賽程同步
   2. 足球 AI 預測

   GET
   /api/cron/football-sync
========================================== */

function isAuthorized(
  request: Request,
) {
  const cronSecret =
    process.env
      .CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "❌ CRON_SECRET 尚未設定",
    );

    return false;
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (!authorization) {
    return false;
  }

  return (
    authorization ===
    `Bearer ${cronSecret}`
  );
}

function getBaseUrl(
  request: Request,
) {
  const url =
    new URL(
      request.url,
    );

  return url.origin;
}

async function callInternalApi(
  url: string,
) {
  try {
    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          cache:
            "no-store",
        },
      );

    const text =
      await response.text();

    let data:
      unknown;

    try {
      data =
        JSON.parse(
          text,
        );
    } catch {
      data = {
        raw:
          text,
      };
    }

    return {
      success:
        response.ok,

      status:
        response.status,

      data,
    };
  } catch (
    error
  ) {
    return {
      success:
        false,

      status:
        500,

      data: {
        error:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
    };
  }
}

export async function GET(
  request: Request,
) {
  if (
    !isAuthorized(
      request,
    )
  ) {
    console.warn(
      "⛔ 未授權的 football-sync 請求",
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unauthorized",
      },
      {
        status:
          401,
      },
    );
  }

  const startedAt =
    new Date()
      .toISOString();

  try {
    const baseUrl =
      getBaseUrl(
        request,
      );

    console.log(
      "======================================",
    );

    console.log(
      "⚽ XSI Football Sync 開始",
    );

    console.log(
      `開始時間：${startedAt}`,
    );

    /* ======================================
       STEP 1
       足球賽程同步
    ====================================== */

    console.log(
      "⚽ 開始足球賽程同步...",
    );

    const footballSchedule =
      await callInternalApi(
        `${baseUrl}/api/football/sync`,
      );

    if (
      !footballSchedule.success
    ) {
      console.error(
        "❌ 足球賽程同步失敗：",
        footballSchedule,
      );
    }

    /* ======================================
       STEP 2
       足球 AI 預測

       即使賽程同步失敗，
       仍嘗試使用現有快取產生預測。
    ====================================== */

    console.log(
      "🤖 開始足球 AI 預測...",
    );

    const footballPrediction =
      await callInternalApi(
        `${baseUrl}/api/prediction/generate-football`,
      );

    if (
      !footballPrediction.success
    ) {
      console.error(
        "❌ 足球 AI 預測失敗：",
        footballPrediction,
      );
    }

    const finishedAt =
      new Date()
        .toISOString();

    /*
     * 預測成功視為主要任務成功。
     * 賽程同步即使暫時失敗，
     * generator 仍可能使用 Supabase 快取。
     */
    const success =
      footballPrediction.success;

    console.log(
      "🏁 XSI Football Sync 完成",
    );

    console.log(
      `完成時間：${finishedAt}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success,

      startedAt,

      finishedAt,

      results: {
        footballSchedule,
        footballPrediction,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "❌ Football Sync Cron Error：",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        startedAt,

        error:
          error instanceof Error
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

export async function POST(
  request: Request,
) {
  return GET(
    request,
  );
}