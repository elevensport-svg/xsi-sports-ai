import { createClient } from "../../../../lib/supabase/server";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const supabase = await createClient();

    const {
      gamePk,
      homeTeam,
      awayTeam,
      prediction,
      confidence,
    } = body;


    const { error } = await supabase
      .from("prediction_history")
      .insert({
        game_pk: gamePk,
        home_team: homeTeam,
        away_team: awayTeam,
        prediction,
        confidence,
        result: "pending",
      });


    if (error) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }


    return Response.json({
      success: true,
    });


  } catch (error) {

    return Response.json(
      {
        success: false,
        error: "Server error",
      },
      {
        status: 500,
      }
    );

  }
}