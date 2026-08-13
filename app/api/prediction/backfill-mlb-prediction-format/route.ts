import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

type HistoryRow = {
  id: string;
  game_pk: string;
  sport: string;
  home_team: string | null;
  away_team: string | null;
  prediction: string | null;
  result: string | null;
  confidence: number | string | null;
};

function normalize(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .toLowerCase();
}

function hasTeamName(
  row: HistoryRow,
) {
  const prediction =
    String(
      row.prediction ?? "",
    ).trim();

  const homeTeam =
    String(
      row.home_team ?? "",
    ).trim();

  const awayTeam =
    String(
      row.away_team ?? "",
    ).trim();

  if (!prediction) {
    return false;
  }

  return (
    Boolean(
      homeTeam &&
        prediction.includes(
          homeTeam,
        ),
    ) ||
    Boolean(
      awayTeam &&
        prediction.includes(
          awayTeam,
        ),
    )
  );
}

function getNormalizedMarketText(
  prediction: string,
) {
  const text =
    prediction.trim();

  const lower =
    text.toLowerCase();

  if (
    text.includes(
      "受讓",
    ) ||
    lower.includes(
      "run line +",
    )
  ) {
    return "受讓 +1.5";
  }

  if (
    text.includes(
      "讓分",
    ) ||
    lower.includes(
      "run line -",
    )
  ) {
    return "讓分 -1.5";
  }

  if (
    text.includes(
      "獨贏",
    ) ||
    lower.includes(
      "moneyline",
    ) ||
    lower.includes(
      "money line",
    )
  ) {
    return "獨贏";
  }

  return text;
}

export async function GET() {
  try {
    const supabase =
      createAdminClient();

    /*
     * ========================================
     * 1. 讀取 MLB 歷史紀錄
     * ========================================
     */
    const {
      data,
      error,
    } = await supabase
      .from(
        "prediction_history",
      )
      .select(
        `
          id,
          game_pk,
          sport,
          home_team,
          away_team,
          prediction,
          result,
          confidence
        `,
      )
      .eq(
        "sport",
        "MLB",
      );

    if (error) {
      throw new Error(
        `讀取 prediction_history 失敗：${error.message}`,
      );
    }

    const rows =
      (data ??
        []) as HistoryRow[];

    let complete =
      0;

    let updated =
      0;

    let skipped =
      0;

    const skippedRows: Array<{
      gamePk: string;
      prediction: string | null;
      reason: string;
    }> = [];

    /*
     * ========================================
     * 2. 逐筆檢查
     * ========================================
     */
    for (
      const row
      of rows
    ) {
      if (
        hasTeamName(
          row,
        )
      ) {
        complete += 1;
        continue;
      }

      const prediction =
        String(
          row.prediction ?? "",
        ).trim();

      const homeTeam =
        String(
          row.home_team ?? "",
        ).trim();

      const awayTeam =
        String(
          row.away_team ?? "",
        ).trim();

      if (
        !prediction ||
        !homeTeam ||
        !awayTeam
      ) {
        skipped += 1;

        skippedRows.push({
          gamePk:
            String(
              row.game_pk,
            ),
          prediction:
            row.prediction,
          reason:
            "缺少 prediction 或球隊名稱",
        });

        continue;
      }

      /*
       * ======================================
       * 關鍵安全規則
       *
       * 如果原始 prediction 只有：
       *
       * 獨贏
       * 讓分
       * 受讓 +1.5
       *
       * 無法知道當時到底推薦主隊還客隊，
       * 所以不能亂補。
       * ======================================
       */
      const normalizedPrediction =
        normalize(
          prediction,
        );

      const ambiguousValues =
        new Set([
          "獨贏",
          "moneyline",
          "money line",

          "讓分",
          "讓分 -1.5",
          "run line -1.5",

          "受讓",
          "受讓 +1.5",
          "run line +1.5",
        ]);

      if (
        ambiguousValues.has(
          normalizedPrediction,
        )
      ) {
        skipped += 1;

        skippedRows.push({
          gamePk:
            String(
              row.game_pk,
            ),

          prediction:
            row.prediction,

          reason:
            "只有玩法，無法確認當時推薦哪支球隊",
        });

        continue;
      }

      /*
       * ======================================
       * 3. 如果舊文字內含英文球隊名或其他資訊，
       *    但沒有目前中文球隊名稱，
       *    只做玩法格式標準化。
       *
       * 不重新推算、不改方向。
       * ======================================
       */
      const marketText =
        getNormalizedMarketText(
          prediction,
        );

      /*
       * 如果完全無法可靠判斷推薦球隊，
       * 一樣不寫。
       */
      if (
        marketText ===
        prediction
      ) {
        skipped += 1;

        skippedRows.push({
          gamePk:
            String(
              row.game_pk,
            ),

          prediction:
            row.prediction,

          reason:
            "無法安全轉換舊 prediction",
        });

        continue;
      }

      /*
       * ======================================
       * 注意：
       * 這裡仍然不猜主客隊。
       *
       * 因為只靠歷史資料沒有足夠資訊，
       * 所以不會寫成：
       * homeTeam + 玩法
       * 或 awayTeam + 玩法
       * ======================================
       */
      skipped += 1;

      skippedRows.push({
        gamePk:
          String(
            row.game_pk,
          ),

        prediction:
          row.prediction,

        reason:
          `可辨識玩法為「${marketText}」，但無法確認推薦球隊`,
      });
    }

    return NextResponse.json({
      success: true,

      total:
        rows.length,

      alreadyComplete:
        complete,

      updated,

      skipped,

      message:
        "安全模式完成：只檢查舊格式，不會猜測歷史推薦球隊。",

      skippedRows,
    });
  } catch (error) {
    console.error(
      "❌ MLB 歷史 prediction 格式檢查失敗：",
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

export async function POST() {
  return GET();
}