import {
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

/* ==========================================
   MLB SYNC CRON

   Flow:
   1. MLB market-sync
   2. MLB generate-tomorrow

   GET
   /api/cron/mlb-sync
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
      "⛔ 未授權的 mlb-sync 請求",
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
      "⚾ XSI MLB Sync 開始",
    );

    console.log(
      `開始時間：${startedAt}`,
    );

    /* ======================================
       STEP 1
       MLB 盤口同步
    ====================================== */

    console.log(
      "⚾ 開始 MLB 盤口同步...",
    );

    const mlbMarket =
      await callInternalApi(
        `${baseUrl}/api/mlb/market-sync`,
      );

    if (
      !mlbMarket.success
    ) {
      console.error(
        "❌ MLB market-sync 失敗：",
        mlbMarket,
      );
    }

    /* ======================================
       STEP 2
       MLB AI 預測

       即使 market-sync 失敗，
       仍嘗試執行 prediction，
       避免單一 API 失敗拖死整批。
    ====================================== */

    console.log(
      "🤖 開始 MLB AI 預測...",
    );

    const mlbPrediction =
      await callInternalApi(
        `${baseUrl}/api/prediction/generate-tomorrow`,
      );

    if (
      !mlbPrediction.success
    ) {
      console.error(
        "❌ MLB prediction 失敗：",
        mlbPrediction,
      );
    }

    const finishedAt =
      new Date()
        .toISOString();

    const success =
      mlbPrediction.success;

    console.log(
      "🏁 XSI MLB Sync 完成",
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
        mlbMarket,

        mlbPrediction,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "❌ MLB Sync Cron Error：",
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