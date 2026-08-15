import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const LEAGUE = "法甲";
const SEASON = "2025/26";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } =
      await supabase
        .from("football_match_history")
        .select(`
          id,
          league,
          season,
          status,
          home_odds,
          draw_odds,
          away_odds,
          market_home_prob,
          market_draw_prob,
          market_away_prob,
          home_form_score,
          away_form_score,
          home_attack_score,
          away_attack_score,
          home_defense_score,
          away_defense_score,
          xsi_home_prob,
          xsi_draw_prob,
          xsi_away_prob
        `)
        .eq("league", LEAGUE)
        .eq("season", SEASON);

    if (error) {
      throw new Error(
        `讀取法甲資料失敗：${error.message}`,
      );
    }

    const rows = data ?? [];

    const finished =
      rows.filter(
        (row) =>
          row.status === "finished",
      );

    const withOdds =
      finished.filter(
        (row) =>
          row.home_odds !== null &&
          row.draw_odds !== null &&
          row.away_odds !== null,
      );

    const withMarket =
      finished.filter(
        (row) =>
          row.market_home_prob !== null &&
          row.market_draw_prob !== null &&
          row.market_away_prob !== null,
      );

    const withForm =
      finished.filter(
        (row) =>
          row.home_form_score !== null &&
          row.away_form_score !== null,
      );

    const withAttack =
      finished.filter(
        (row) =>
          row.home_attack_score !== null &&
          row.away_attack_score !== null,
      );

    const withDefense =
      finished.filter(
        (row) =>
          row.home_defense_score !== null &&
          row.away_defense_score !== null,
      );

    const withXsi =
      finished.filter(
        (row) =>
          row.xsi_home_prob !== null &&
          row.xsi_draw_prob !== null &&
          row.xsi_away_prob !== null,
      );

    const walkForwardReady =
      finished.filter(
        (row) =>
          row.market_home_prob !== null &&
          row.market_draw_prob !== null &&
          row.market_away_prob !== null &&
          row.home_form_score !== null &&
          row.away_form_score !== null &&
          row.home_attack_score !== null &&
          row.away_attack_score !== null &&
          row.home_defense_score !== null &&
          row.away_defense_score !== null,
      );

    return NextResponse.json({
      success: true,
      league: LEAGUE,
      season: SEASON,

      summary: {
        totalRows:
          rows.length,

        finished:
          finished.length,

        withOdds:
          withOdds.length,

        withMarketProbability:
          withMarket.length,

        withForm:
          withForm.length,

        withAttack:
          withAttack.length,

        withDefense:
          withDefense.length,

        withXsi:
          withXsi.length,

        walkForwardReady:
          walkForwardReady.length,
      },

      missing: {
        marketProbability:
          finished.length -
          withMarket.length,

        form:
          finished.length -
          withForm.length,

        attack:
          finished.length -
          withAttack.length,

        defense:
          finished.length -
          withDefense.length,

        xsi:
          finished.length -
          withXsi.length,
      },

      message:
        "法甲資料完整度檢查完成。",
    });
  } catch (error) {
    console.error(
      "❌ Ligue 1 Data Check Error：",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
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