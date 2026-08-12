import {
  NextResponse,
} from "next/server";

import {
  settleFootballPredictions,
} from "../../../../lib/prediction/settleFootballPredictions";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    console.log(
      "======================================",
    );

    console.log(
      "⚽ 開始執行足球預測自動結算",
    );

    const result =
      await settleFootballPredictions();

    console.log(
      "⚽ 足球預測自動結算完成",
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success: true,

      ...result,
    });
  } catch (error) {
    console.error(
      "❌ 足球預測結算失敗：",
      error,
    );

    return NextResponse.json(
      {
        success: false,

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