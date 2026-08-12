import {
  NextResponse,
} from "next/server";

import {
  syncFootballMatchHistory,
} from "../../../../lib/football/sync-match-history";

import {
  settleFootballPredictions,
} from "../../../../lib/prediction/settleFootballPredictions";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const sync =
      await syncFootballMatchHistory();

    const settlement =
      await settleFootballPredictions();

    return NextResponse.json({
      success: true,
      sync,
      settlement,
    });
  } catch (error) {
    console.error(
      "❌ Football Cron Error：",
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