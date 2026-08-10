import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("prediction_history")
      .insert({
        game_pk: `admin-test-${Date.now()}`,
        sport: "MLB",
        home_team: "Admin測試主隊",
        away_team: "Admin測試客隊",
        prediction: "測試預測",
        confidence: 99,
        result: "pending",
      })
      .select();

    if (error) {
      console.error("TEST HISTORY ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          error,
        },
        { status: 500 },
      );
    }

    console.log("TEST HISTORY SUCCESS:", data);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("TEST HISTORY EXCEPTION:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    );
  }
}