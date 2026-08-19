import {
  NextResponse,
} from "next/server";

import {
  settleMlbPredictions,
} from "@/lib/prediction/settleMlbPredictions";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

/* ==========================================
   MLB SETTLEMENT CRON

   GET
   /api/cron/mlb-settlement

   流程：
   prediction_history MLB pending
   → 查 MLB 正式完賽結果
   → win / loss / push
========================================== */

function isAuthorized(
  request: Request,
) {
  const cronSecret =
    process.env
      .CRON_SECRET;

  if (
    !cronSecret
  ) {
    console.error(
      "❌ CRON_SECRET 尚未設定",
    );

    return false;
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  return (
    authorization ===
    `Bearer ${cronSecret}`
  );
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
      "⛔ 未授權的 mlb-settlement 請求",
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
    console.log(
      "======================================",
    );

    console.log(
      "⚾ MLB SETTLEMENT CRON START",
    );

    console.log(
      `開始時間：${startedAt}`,
    );

    const settlement =
      await settleMlbPredictions();

    const finishedAt =
      new Date()
        .toISOString();

    console.log(
      "⚾ MLB SETTLEMENT CRON COMPLETE",
    );

    console.log(
      `完成時間：${finishedAt}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        true,

      startedAt,

      finishedAt,

      settlement,
    });
  } catch (
    error
  ) {
    console.error(
      "❌ MLB Settlement Cron Error：",
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