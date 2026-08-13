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
  result: string | null;
  away_score: number | null;
  home_score: number | null;
};

type MlbLiveFeed = {
  gameData?: {
    status?: {
      abstractGameState?: string;
      detailedState?: string;
    };
  };

  liveData?: {
    linescore?: {
      teams?: {
        away?: {
          runs?: number;
        };

        home?: {
          runs?: number;
        };
      };
    };
  };
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

function isFinishedGame(
  feed: MlbLiveFeed,
) {
  const abstractState =
    normalize(
      feed.gameData
        ?.status
        ?.abstractGameState,
    );

  const detailedState =
    normalize(
      feed.gameData
        ?.status
        ?.detailedState,
    );

  return (
    abstractState === "final" ||
    detailedState === "final" ||
    detailedState ===
      "game over" ||
    detailedState ===
      "completed early"
  );
}

function getFinalScore(
  feed: MlbLiveFeed,
) {
  const awayRuns =
    Number(
      feed.liveData
        ?.linescore
        ?.teams
        ?.away
        ?.runs,
    );

  const homeRuns =
    Number(
      feed.liveData
        ?.linescore
        ?.teams
        ?.home
        ?.runs,
    );

  if (
    !Number.isFinite(
      awayRuns,
    ) ||
    !Number.isFinite(
      homeRuns,
    )
  ) {
    return null;
  }

  return {
    awayRuns,
    homeRuns,
  };
}

async function getMlbGameFeed(
  gamePk: string,
): Promise<MlbLiveFeed | null> {
  const url =
    `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

  try {
    const response =
      await fetch(
        url,
        {
          cache: "no-store",
        },
      );

    if (
      !response.ok
    ) {
      console.error(
        `MLB ${gamePk} API 錯誤：`,
        response.status,
      );

      return null;
    }

    return (
      (await response.json()) as MlbLiveFeed
    );
  } catch (error) {
    console.error(
      `MLB ${gamePk} 讀取失敗：`,
      error,
    );

    return null;
  }
}

export async function GET() {
  try {
    const supabase =
      createAdminClient();

    /*
     * ========================================
     * 1. 抓已結算 MLB
     * 且比分還沒補齊的紀錄
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
          result,
          away_score,
          home_score
        `,
      )
      .eq(
        "sport",
        "MLB",
      )
      .neq(
        "result",
        "pending",
      );

    if (error) {
      throw new Error(
        `讀取 prediction_history 失敗：${error.message}`,
      );
    }

    const rows =
      (data ??
        []) as HistoryRow[];

    const targets =
      rows.filter(
        (row) =>
          row.away_score ===
            null ||
          row.home_score ===
            null,
      );

    let updated =
      0;

    let skipped =
      0;

    let failed =
      0;

    const errors: Array<{
      gamePk: string;
      message: string;
    }> = [];

    /*
     * ========================================
     * 2. 逐場抓 MLB 最終比分
     * ========================================
     */
    for (
      const row
      of targets
    ) {
      const gamePk =
        String(
          row.game_pk ?? "",
        ).trim();

      if (
        !/^\d+$/.test(
          gamePk,
        )
      ) {
        skipped += 1;
        continue;
      }

      try {
        const feed =
          await getMlbGameFeed(
            gamePk,
          );

        if (!feed) {
          failed += 1;

          errors.push({
            gamePk,
            message:
              "無法取得 MLB 比賽資料",
          });

          continue;
        }

        if (
          !isFinishedGame(
            feed,
          )
        ) {
          skipped += 1;
          continue;
        }

        const finalScore =
          getFinalScore(
            feed,
          );

        if (
          !finalScore
        ) {
          failed += 1;

          errors.push({
            gamePk,
            message:
              "無法取得最終比分",
          });

          continue;
        }

        /*
         * ====================================
         * 3. 回填比分
         * ====================================
         */
        const {
          error:
            updateError,
        } = await supabase
          .from(
            "prediction_history",
          )
          .update({
            away_score:
              finalScore.awayRuns,

            home_score:
              finalScore.homeRuns,
          })
          .eq(
            "id",
            row.id,
          );

        if (
          updateError
        ) {
          throw updateError;
        }

        updated += 1;

        console.log(
          `✅ MLB ${gamePk} 比分回填：${finalScore.awayRuns}-${finalScore.homeRuns}`,
        );
      } catch (error) {
        failed += 1;

        const message =
          error instanceof Error
            ? error.message
            : String(
                error,
              );

        errors.push({
          gamePk,
          message,
        });

        console.error(
          `❌ MLB ${gamePk} 比分回填失敗：`,
          error,
        );
      }
    }

    return NextResponse.json({
      success: true,

      totalSettled:
        rows.length,

      missingScore:
        targets.length,

      updated,

      skipped,

      failed,

      errors,
    });
  } catch (error) {
    console.error(
      "❌ MLB 歷史比分回填失敗：",
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