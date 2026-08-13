import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

import {
  calculateHistoricalMlbXsi,
  type HistoricalMlbMatchInput,
} from "../../../../lib/services/mlbHistoricalXsi";

export const dynamic =
  "force-dynamic";

type HistoryRow =
  HistoricalMlbMatchInput & {
    id?: string | number;

    home_score?:
      | number
      | null;

    away_score?:
      | number
      | null;

    home_xsi?:
      | number
      | null;

    away_xsi?:
      | number
      | null;

    xsi_diff?:
      | number
      | null;
  };

/* ==========================================
   GET /api/mlb/history-xsi-sync

   預設：
   month=2026-07
   preview=1

   安全預覽：
   /api/mlb/history-xsi-sync?month=2026-07

   先跑 5 場：
   /api/mlb/history-xsi-sync?month=2026-07&confirm=1&limit=5

   整月：
   /api/mlb/history-xsi-sync?month=2026-07&confirm=1
========================================== */

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const month =
      url.searchParams.get(
        "month",
      ) ??
      "2026-07";

    const confirm =
      url.searchParams.get(
        "confirm",
      ) ===
      "1";

    const force =
      url.searchParams.get(
        "force",
      ) ===
      "1";

    const limitParam =
      Number(
        url.searchParams.get(
          "limit",
        ) ??
          "0",
      );

    const limit =
      Number.isFinite(
        limitParam,
      ) &&
      limitParam > 0
        ? Math.floor(
            limitParam,
          )
        : null;

    if (
      !/^\d{4}-\d{2}$/.test(
        month,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "month 格式錯誤，請使用 YYYY-MM，例如 2026-07",
        },
        {
          status: 400,
        },
      );
    }

    const [
      yearText,
      monthText,
    ] =
      month.split(
        "-",
      );

    const year =
      Number(
        yearText,
      );

    const monthNumber =
      Number(
        monthText,
      );

    const startDate =
      `${yearText}-${monthText}-01`;

    const nextMonthDate =
      new Date(
        Date.UTC(
          year,
          monthNumber,
          1,
        ),
      )
        .toISOString()
        .slice(
          0,
          10,
        );

    const supabase =
      createAdminClient();

    /* ========================================
       STEP 1
       讀取該月份已完賽歷史資料
    ======================================== */

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "mlb_match_history",
        )
        .select(
          `
            id,
            game_pk,
            match_date,
            away_team,
            home_team,
            away_score,
            home_score,
            away_moneyline,
            home_moneyline,
            away_spread,
            home_spread,
            total_line,
            away_xsi,
            home_xsi,
            xsi_diff
          `,
        )
        .gte(
          "match_date",
          startDate,
        )
        .lt(
          "match_date",
          nextMonthDate,
        )
        .not(
          "away_score",
          "is",
          null,
        )
        .not(
          "home_score",
          "is",
          null,
        )
        .order(
          "match_date",
          {
            ascending:
              true,
          },
        );

    if (
      error
    ) {
      throw new Error(
        `讀取 mlb_match_history 失敗：${error.message}`,
      );
    }

    const rows =
      (data ??
        []) as HistoryRow[];

    /* ========================================
       STEP 2
       已完成 / 待處理
    ======================================== */

    const isComplete = (
      row: HistoryRow,
    ) =>
      row.away_xsi !==
        null &&
      row.away_xsi !==
        undefined &&
      row.home_xsi !==
        null &&
      row.home_xsi !==
        undefined &&
      row.xsi_diff !==
        null &&
      row.xsi_diff !==
        undefined;

    const completeRows =
      rows.filter(
        isComplete,
      );

    const pendingRows =
      force
        ? rows
        : rows.filter(
            (
              row,
            ) =>
              !isComplete(
                row,
              ),
          );

    const targetRows =
      limit
        ? pendingRows.slice(
            0,
            limit,
          )
        : pendingRows;

    /* ========================================
       STEP 3
       安全預覽
    ======================================== */

    if (
      !confirm
    ) {
      return NextResponse.json({
        success: true,

        preview: true,

        month,

        total:
          rows.length,

        alreadyComplete:
          completeRows.length,

        pending:
          pendingRows.length,

        willSync:
          targetRows.length,

        force,

        limit,

        message:
          "目前為安全預覽，尚未計算或寫入 XSI。確認後加上 &confirm=1。",

        sample:
          targetRows
            .slice(
              0,
              10,
            )
            .map(
              (
                row,
              ) => ({
                gamePk:
                  row.game_pk,

                date:
                  row.match_date,

                game:
                  `${row.away_team} @ ${row.home_team}`,

                market: {
                  awayMoneyline:
                    row.away_moneyline,

                  homeMoneyline:
                    row.home_moneyline,

                  awaySpread:
                    row.away_spread,

                  homeSpread:
                    row.home_spread,

                  total:
                    row.total_line,
                },
              }),
            ),
      });
    }

    /* ========================================
       STEP 4
       逐場 Historical XSI

       不用 Promise.all 整批轟 MLB API，
       避免一次數百場造成 API 壓力。
    ======================================== */

    let analyzed =
      0;

    let updated =
      0;

    let failed =
      0;

    const errors:
      Array<{
        gamePk: string;
        date: string;
        message: string;
      }> = [];

    const samples:
      Array<{
        gamePk: string;
        game: string;
        awayXsi: number;
        homeXsi: number;
        xsiDiff: number;
        selectedTeam: string;
        recommendation: string;
        confidence: number;
      }> = [];

    for (
      let index = 0;
      index <
      targetRows.length;
      index += 1
    ) {
      const row =
        targetRows[
          index
        ];

      try {
        console.log(
          `🧠 Historical XSI ${index + 1}/${targetRows.length}：${row.away_team} @ ${row.home_team} (${row.match_date})`,
        );

        const result =
          await calculateHistoricalMlbXsi(
            row,
          );

        if (
          !result
        ) {
          failed +=
            1;

          errors.push({
            gamePk:
              String(
                row.game_pk,
              ),

            date:
              row.match_date,

            message:
              "calculateHistoricalMlbXsi 回傳 null",
          });

          continue;
        }

        analyzed +=
          1;

        /* ====================================
           目前先寫入既有 XSI 欄位。

           各模組分數先透過 response 回傳，
           等確認 DB 欄位後再正式落庫，
           避免假設不存在的 column 導致整批失敗。
        ==================================== */

        const {
          data:
            updatedRows,

          error:
            updateError,
        } =
          await supabase
            .from(
              "mlb_match_history",
            )
            .update({
              away_xsi:
                result.awayXsi,

              home_xsi:
                result.homeXsi,

              xsi_diff:
                result.xsiDiff,
            })
            .eq(
              "game_pk",
              String(
                row.game_pk,
              ),
            )
            .select(
              "game_pk",
            );

        if (
          updateError
        ) {
          throw new Error(
            `Supabase UPDATE 失敗：${updateError.message}`,
          );
        }

        if (
          !updatedRows ||
          updatedRows.length ===
            0
        ) {
          throw new Error(
            "Supabase 找不到對應 game_pk，沒有更新任何資料",
          );
        }

        updated +=
          updatedRows.length;

        if (
          samples.length <
          20
        ) {
          samples.push({
            gamePk:
              result.gamePk,

            game:
              `${result.awayTeam} @ ${result.homeTeam}`,

            awayXsi:
              result.awayXsi,

            homeXsi:
              result.homeXsi,

            xsiDiff:
              result.xsiDiff,

            selectedTeam:
              result.selectedTeam,

            recommendation:
              result.recommendation,

            confidence:
              result.confidence,
          });
        }

        console.log(
          `✅ XSI：Away ${result.awayXsi} / Home ${result.homeXsi} / Diff ${result.xsiDiff}`,
        );
      } catch (
        error
      ) {
        failed +=
          1;

        const message =
          error instanceof
          Error
            ? error.message
            : String(
                error,
              );

        errors.push({
          gamePk:
            String(
              row.game_pk,
            ),

          date:
            row.match_date,

          message,
        });

        console.error(
          `❌ Historical XSI ${row.game_pk} 失敗：`,
          error,
        );
      }
    }

    /* ========================================
       STEP 5
       完成
    ======================================== */

    console.log(
      "======================================",
    );

    console.log(
      `🧠 MLB Historical XSI ${month} 完成`,
    );

    console.log(
      `目標：${targetRows.length}`,
    );

    console.log(
      `分析成功：${analyzed}`,
    );

    console.log(
      `DB 更新：${updated}`,
    );

    console.log(
      `失敗：${failed}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        failed ===
        0,

      preview:
        false,

      month,

      force,

      total:
        rows.length,

      alreadyComplete:
        completeRows.length,

      targeted:
        targetRows.length,

      analyzed,

      updated,

      failed,

      remaining:
        Math.max(
          0,
          pendingRows.length -
            targetRows.length +
            failed,
        ),

      errors:
        errors.slice(
          0,
          30,
        ),

      sample:
        samples,
    });
  } catch (
    error
  ) {
    console.error(
      "❌ MLB history-xsi-sync 發生錯誤：",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof
          Error
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

/* ==========================================
   POST
========================================== */

export async function POST(
  request: Request,
) {
  return GET(
    request,
  );
}