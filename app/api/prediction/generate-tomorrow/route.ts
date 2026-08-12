import {
  NextResponse,
} from "next/server";

import {
  generateTomorrowMlbPredictions,
} from "../../../../lib/prediction/generateTomorrowMlbPredictions";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const result =
      await generateTomorrowMlbPredictions();

    return NextResponse.json({
      success: true,
      message:
        "MLB 明日預測產生完成",
      result,
    });
  } catch (error) {
    console.error(
      "MLB 明日預測 API 失敗:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "MLB 明日預測產生失敗",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST() {
  return GET();
}