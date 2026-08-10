import { createAdminClient } from "../../../../lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      gamePk,
      homeTeam,
      awayTeam,
      prediction,
      confidence,
    } = body;

    if (
      !gamePk ||
      !homeTeam ||
      !awayTeam ||
      !prediction
    ) {
      return Response.json(
        {
          success: false,
          error: "缺少必要欄位",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = createAdminClient();

    const {
      data,
      error,
    } = await supabase
      .from("prediction_history")
      .upsert(
        {
          game_pk: String(gamePk),
          sport: "MLB",
          home_team: homeTeam,
          away_team: awayTeam,
          prediction,
          confidence:
            typeof confidence === "number"
              ? confidence
              : Number(confidence) || 0,
          result: "pending",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "game_pk",
        },
      )
      .select();

    if (error) {
      console.error(
        "prediction_history API upsert error:",
        error,
      );

      return Response.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        {
          status: 500,
        },
      );
    }

    console.log(
      "prediction_history API upsert success:",
      data,
    );

    return Response.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "prediction_history API server error:",
      error,
    );

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Server error",
      },
      {
        status: 500,
      },
    );
  }
}