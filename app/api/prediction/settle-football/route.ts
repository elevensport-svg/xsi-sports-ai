import {
  NextResponse,
} from "next/server";

import {
  settleFootballPredictions,
} from "@/lib/prediction/settleFootballPredictions";

export const dynamic =
  "force-dynamic";

/* ==========================================
   FOOTBALL SETTLEMENT API

   GET
   /api/prediction/settle-football

   POST
   /api/prediction/settle-football
========================================== */

export async function GET() {
  try {
    console.log(
      "======================================",
    );

    console.log(
      "⚽ FOOTBALL SETTLEMENT API START",
    );

    console.log(
      "======================================",
    );

    const result =
      await settleFootballPredictions();

    return NextResponse.json({
      success:
        true,

      message:
        "足球預測結算完成",

      result,
    });
  } catch (
    error
  ) {
    console.error(
      "❌ FOOTBALL SETTLEMENT API ERROR：",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "足球預測結算失敗",

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

export async function POST() {
  return GET();
}