import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  generateTomorrowFootballPredictions,
} from "../../../../lib/prediction/generateTomorrowFootballPredictions";

export const dynamic =
  "force-dynamic";

/* ==========================================
   XSI Football Prediction API

   Normal：
   /api/prediction/generate-football

   Force Refresh：
   /api/prediction/generate-football?force=true
========================================== */

export async function GET(
  request: NextRequest,
) {
  try {
    /* ======================================
       STEP 1
       Force Mode
    ====================================== */

    const forceParam =
      request.nextUrl.searchParams
        .get(
          "force",
        )
        ?.toLowerCase();

    const force =
      forceParam ===
        "true" ||
      forceParam ===
        "1";

    console.log(
      "======================================",
    );

    console.log(
      "⚽ XSI Football Prediction API",
    );

    console.log(
      `🔄 Force Refresh：${force ? "YES" : "NO"}`,
    );

    console.log(
      "======================================",
    );

    /* ======================================
       STEP 2
       Generate Predictions
    ====================================== */

    const result =
      await generateTomorrowFootballPredictions({
        force,
      });

    /* ======================================
       STEP 3
       Response
    ====================================== */

    return NextResponse.json({
      success:
        true,

      message:
        force
          ? "足球預測強制重新產生完成"
          : "明日足球預測產生完成",

      force,

      result,
    });
  } catch (
    error
  ) {
    console.error(
      "明日足球預測 API 失敗:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "明日足球預測產生失敗",

        error:
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

   跟 GET 使用相同流程。

   POST /api/prediction/generate-football
   POST /api/prediction/generate-football?force=true
========================================== */

export async function POST(
  request: NextRequest,
) {
  return GET(
    request,
  );
}