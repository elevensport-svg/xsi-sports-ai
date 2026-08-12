import {
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

/* ==========================================
   驗證 CRON_SECRET
========================================== */

function isAuthorized(
  request: Request,
) {
  const cronSecret =
    process.env
      .CRON_SECRET;

  /*
   * 沒設定 CRON_SECRET
   * 直接拒絕執行
   */
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

  const expected =
    `Bearer ${cronSecret}`;

  return (
    authorization ===
    expected
  );
}

/* ==========================================
   取得網站網址
========================================== */

function getBaseUrl(
  request: Request,
) {
  const url =
    new URL(
      request.url,
    );

  return url.origin;
}

/* ==========================================
   呼叫內部 API
========================================== */

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

/* ==========================================
   GET /api/cron/sports-sync
========================================== */

export async function GET(
  request: Request,
) {
  /*
   * ========================================
   * STEP 0
   * 驗證 Cron Secret
   * ========================================
   */

  if (
    !isAuthorized(
      request,
    )
  ) {
    console.warn(
      "⛔ 未授權的 sports-sync 請求",
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
      "🤖 XSI Sports Sync 開始",
    );

    console.log(
      `開始時間：${startedAt}`,
    );

    /*
     * ======================================
     * 1. MLB 盤口同步
     * ======================================
     */

    console.log(
      "⚾ 開始 MLB 盤口同步...",
    );

    const mlbMarket =
      await callInternalApi(
        `${baseUrl}/api/mlb/market-sync`,
      );

    /*
     * ======================================
     * 2. 足球賽程同步
     * ======================================
     */

    console.log(
      "⚽ 開始足球賽程同步...",
    );

    const footballSchedule =
      await callInternalApi(
        `${baseUrl}/api/football/sync`,
      );

    /*
     * ======================================
     * 3. MLB AI 預測
     * ======================================
     */

    console.log(
      "⚾ 開始 MLB AI 預測...",
    );

    const mlbPrediction =
      await callInternalApi(
        `${baseUrl}/api/prediction/generate-tomorrow`,
      );

    /*
     * ======================================
     * 4. 足球 AI 預測
     * ======================================
     */

    console.log(
      "⚽ 開始足球 AI 預測...",
    );

    const footballPrediction =
      await callInternalApi(
        `${baseUrl}/api/prediction/generate-football`,
      );

    /*
     * ======================================
     * 5. 完成
     * ======================================
     */

    const finishedAt =
      new Date()
        .toISOString();

    const allSuccessful =
      mlbMarket.success &&
      footballSchedule.success &&
      mlbPrediction.success &&
      footballPrediction.success;

    console.log(
      "🏁 XSI Sports Sync 完成",
    );

    console.log(
      `完成時間：${finishedAt}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        allSuccessful,

      startedAt,

      finishedAt,

      results: {
        mlbMarket,

        footballSchedule,

        mlbPrediction,

        footballPrediction,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "❌ Sports Sync 發生錯誤：",
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

/* ==========================================
   POST
========================================== */

export async function POST(
  request: Request,
) {
  return GET(
    request,
  );
}