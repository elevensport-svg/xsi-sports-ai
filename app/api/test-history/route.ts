import {
  NextResponse,
} from "next/server";

import {
  getMlbGameByPk,
} from "../../../lib/api/mlb";

import {
  calculateMlbGameAnalysis,
} from "../../../lib/xsi/mlbGameAnalysis";

import {
  createAdminClient,
} from "../../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

/*
 * ==========================================
 * GET /api/test-history?gamePk=824970
 *
 * 功能：
 *
 * 1. 取得指定 MLB Game
 * 2. 重新執行 XSI
 * 3. 取得 selectedTeamName
 * 4. 建立完整 prediction
 * 5. UPDATE prediction_history
 * ==========================================
 */

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const gamePk =
      url.searchParams.get(
        "gamePk",
      );

    /*
     * ========================================
     * STEP 1
     * 檢查 Game PK
     * ========================================
     */

    if (!gamePk) {
      return NextResponse.json(
        {
          success: false,
          message:
            "缺少 gamePk，例如：?gamePk=824970",
        },
        {
          status: 400,
        },
      );
    }

    console.log(
      "======================================",
    );

    console.log(
      `🧪 MLB 指定場次重新分析：${gamePk}`,
    );

    /*
     * ========================================
     * STEP 2
     * MLB API 取得單場
     * ========================================
     */

    const game =
      await getMlbGameByPk(
        gamePk,
      );

    if (!game) {
      return NextResponse.json(
        {
          success: false,
          message:
            `找不到 MLB Game：${gamePk}`,
        },
        {
          status: 404,
        },
      );
    }

    console.log(
      `⚾ ${game.teams.away.team.name} VS ${game.teams.home.team.name}`,
    );

    /*
     * ========================================
     * STEP 3
     * 重新執行 XSI
     * ========================================
     */

    const analysis =
      await calculateMlbGameAnalysis(
        game,
      );

    const teamName =
      analysis.selectedTeamName
        ?.trim();

    if (!teamName) {
      throw new Error(
        "XSI 分析沒有 selectedTeamName",
      );
    }

    const recommendation =
      analysis.betAdvisor
        .recommendation
        ?.trim() ?? "";

    /*
     * ========================================
     * STEP 4
     * 建立完整 prediction
     * ========================================
     */

    let prediction:
      string;

    const lowerRecommendation =
      recommendation.toLowerCase();

    if (
      recommendation.includes(
        "受讓",
      ) ||
      lowerRecommendation.includes(
        "run line +",
      )
    ) {
      prediction =
        `${teamName} 受讓 +1.5`;
    } else if (
      recommendation ===
        "讓分" ||
      recommendation.includes(
        "讓分 -",
      ) ||
      lowerRecommendation.includes(
        "run line -",
      )
    ) {
      prediction =
        `${teamName} 讓分 -1.5`;
    } else if (
      recommendation ===
        "獨贏" ||
      lowerRecommendation.includes(
        "moneyline",
      )
    ) {
      prediction =
        `${teamName} 獨贏`;
    } else {
      prediction =
        `${teamName} ${
          recommendation ||
          "獨贏"
        }`;
    }

    const confidence =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            Number(
              analysis
                .betAdvisor
                .confidence ??
                0,
            ),
          ),
        ),
      );

    console.log(
      `🎯 新推薦：${prediction}`,
    );

    console.log(
      `📊 信心：${confidence}%`,
    );

    /*
     * ========================================
     * STEP 5
     * 更新 Supabase
     * ========================================
     */

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from(
        "prediction_history",
      )
      .update({
        home_team:
          analysis.homeTeamName,

        away_team:
          analysis.awayTeamName,

        prediction,

        confidence,
      })
      .eq(
        "game_pk",
        String(
          gamePk,
        ),
      )
      .eq(
        "sport",
        "MLB",
      )
      .select();

    if (error) {
      throw new Error(
        `更新 prediction_history 失敗：${error.message}`,
      );
    }

    /*
     * 找不到資料時不要假裝成功
     */
    if (
      !data ||
      data.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `prediction_history 找不到 MLB ${gamePk}`,

          analysis: {
            teamName,
            recommendation,
            prediction,
            confidence,
          },
        },
        {
          status: 404,
        },
      );
    }

    console.log(
      `✅ MLB ${gamePk} prediction_history 更新完成`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success: true,

      message:
        `MLB ${gamePk} 已重新分析並更新`,

      game: {
        gamePk,

        awayTeam:
          analysis.awayTeamName,

        homeTeam:
          analysis.homeTeamName,
      },

      oldRecommendation:
        recommendation,

      prediction,

      confidence,

      updatedRows:
        data.length,

      data,
    });
  } catch (error) {
    console.error(
      "❌ MLB 指定場次重新分析失敗：",
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