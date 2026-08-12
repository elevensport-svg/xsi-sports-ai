import {
  NextResponse,
} from "next/server";

import {
  getCachedFootballSchedule,
} from "../../../../lib/services/footballSchedule";

import {
  calculateFootballGameAnalysis,
} from "../../../../lib/xsi/footballGameAnalysis";

export const dynamic =
  "force-dynamic";

/* ==========================================
   GET /api/prediction/test-football

   可選：
   ?gameId=xxxx

   沒有 gameId：
   自動拿 football_schedule 第一場
========================================== */

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const gameId =
      url.searchParams.get(
        "gameId",
      );

    /*
     * ========================================
     * STEP 1
     * 只讀 Supabase football_schedule
     *
     * 不碰 Odds API
     * ========================================
     */

    const games =
      await getCachedFootballSchedule(
        14,
      );

    if (
      games.length ===
      0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "football_schedule 沒有可測試的賽事",
        },
        {
          status:
            404,
        },
      );
    }

    /*
     * ========================================
     * STEP 2
     * 選一場
     * ========================================
     */

    const game =
      gameId
        ? games.find(
            (item) =>
              String(
                item.id,
              ) ===
              gameId,
          )
        : games[0];

    if (!game) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            `找不到指定足球賽事：${gameId}`,
        },
        {
          status:
            404,
        },
      );
    }

    console.log(
      "======================================",
    );

    console.log(
      "🧪 XSI Football 單場測試",
    );

    console.log(
      `${game.awayTeam} VS ${game.homeTeam}`,
    );

    console.log(
      `Game ID：${game.id}`,
    );

    console.log(
      "======================================",
    );

    /*
     * ========================================
     * STEP 3
     * 執行新版 XSI
     *
     * 這裡會經過：
     *
     * footballFormService
     * ↓
     * football_team_form
     * ↓
     * API-Football（只有沒快取才呼叫）
     * ========================================
     */

    const analysis =
      await calculateFootballGameAnalysis(
        game,
      );

    /*
     * ========================================
     * STEP 4
     * 回傳測試結果
     * ========================================
     */

    return NextResponse.json({
      success:
        true,

      game: {
        id:
          game.id,

        league:
          game.leagueShortName,

        commenceTime:
          game.commenceTime,

        awayTeam:
          game.awayTeam,

        homeTeam:
          game.homeTeam,
      },

      recommendation:
        analysis.recommendation,

      xsiProbability:
        analysis.probabilities,

      form:
        analysis.form,

      market:
        analysis.market,
    });
  } catch (error) {
    console.error(
      "❌ Football 單場 XSI 測試失敗：",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
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