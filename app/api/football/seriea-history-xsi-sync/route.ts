import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

const LEAGUE =
  "義甲";

const SEASON =
  "2025/26";

type HistoryRow = {
  id: number;

  external_id: string;

  league: string;

  season: string;

  match_date: string;

  home_team: string;

  away_team: string;

  home_score: number;

  away_score: number;

  home_odds:
    | number
    | null;

  draw_odds:
    | number
    | null;

  away_odds:
    | number
    | null;

  home_form_score:
    | number
    | null;

  away_form_score:
    | number
    | null;

  home_attack_score:
    | number
    | null;

  away_attack_score:
    | number
    | null;

  home_defense_score:
    | number
    | null;

  away_defense_score:
    | number
    | null;

  market_home_prob:
    | number
    | null;

  market_draw_prob:
    | number
    | null;

  market_away_prob:
    | number
    | null;

  xsi_home_prob:
    | number
    | null;

  xsi_draw_prob:
    | number
    | null;

  xsi_away_prob:
    | number
    | null;

  xsi_diff:
    | number
    | null;
};

type TeamPastMatch = {
  date: string;

  goalsFor: number;

  goalsAgainst: number;

  result:
    | "W"
    | "D"
    | "L";
};

type TeamHistoricalForm = {
  matchesPlayed: number;

  wins: number;

  draws: number;

  losses: number;

  averageGoalsFor: number;

  averageGoalsAgainst: number;

  formScore: number;
};

type ThreeWayProbability = {
  home: number;

  draw: number;

  away: number;
};

/* ==========================================
   Utils
========================================== */

function round(
  value: number,
  digits = 1,
) {
  const power =
    10 **
    digits;

  return Math.round(
    value *
      power,
  ) /
    power;
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(
    min,
    Math.min(
      max,
      value,
    ),
  );
}

/* ==========================================
   Odds → 去水市場機率
========================================== */

function impliedProbability(
  odds:
    | number
    | null,
) {
  if (
    odds ===
      null ||
    odds <=
      1
  ) {
    return 0;
  }

  return 1 / odds;
}

function normalizeThreeWayProbabilities({
  homeOdds,
  drawOdds,
  awayOdds,
}: {
  homeOdds:
    | number
    | null;

  drawOdds:
    | number
    | null;

  awayOdds:
    | number
    | null;
}): ThreeWayProbability {
  const home =
    impliedProbability(
      homeOdds,
    );

  const draw =
    impliedProbability(
      drawOdds,
    );

  const away =
    impliedProbability(
      awayOdds,
    );

  const total =
    home +
    draw +
    away;

  if (
    total <=
    0
  ) {
    return {
      home: 33.3,
      draw: 33.4,
      away: 33.3,
    };
  }

  return {
    home:
      round(
        home /
          total *
          100,
      ),

    draw:
      round(
        draw /
          total *
          100,
      ),

    away:
      round(
        away /
          total *
          100,
      ),
  };
}

function normalizeProbabilityScores(
  home: number,
  draw: number,
  away: number,
): ThreeWayProbability {
  const safeHome =
    Math.max(
      1,
      home,
    );

  const safeDraw =
    Math.max(
      1,
      draw,
    );

  const safeAway =
    Math.max(
      1,
      away,
    );

  const total =
    safeHome +
    safeDraw +
    safeAway;

  return {
    home:
      round(
        safeHome /
          total *
          100,
      ),

    draw:
      round(
        safeDraw /
          total *
          100,
      ),

    away:
      round(
        safeAway /
          total *
          100,
      ),
  };
}

/* ==========================================
   歷史 Form

   只使用「目前比賽之前」的同聯賽資料。
   最近最多 10 場。
========================================== */

function buildTeamPastMatches(
  rows:
    HistoryRow[],
) {
  const map =
    new Map<
      string,
      TeamPastMatch[]
    >();

  function pushMatch(
    team: string,
    item:
      TeamPastMatch,
  ) {
    const list =
      map.get(
        team,
      ) ??
      [];

    list.push(
      item,
    );

    map.set(
      team,
      list,
    );
  }

  for (
    const row
    of rows
  ) {
    const homeResult:
      TeamPastMatch["result"] =
      row.home_score >
      row.away_score
        ? "W"
        : row.home_score <
            row.away_score
          ? "L"
          : "D";

    const awayResult:
      TeamPastMatch["result"] =
      row.away_score >
      row.home_score
        ? "W"
        : row.away_score <
            row.home_score
          ? "L"
          : "D";

    pushMatch(
      row.home_team,
      {
        date:
          row.match_date,

        goalsFor:
          row.home_score,

        goalsAgainst:
          row.away_score,

        result:
          homeResult,
      },
    );

    pushMatch(
      row.away_team,
      {
        date:
          row.match_date,

        goalsFor:
          row.away_score,

        goalsAgainst:
          row.home_score,

        result:
          awayResult,
      },
    );
  }

  return map;
}

function calculateHistoricalForm(
  pastMatches:
    TeamPastMatch[],
  cutoffDate:
    string,
): TeamHistoricalForm {
  const recent =
    pastMatches
      .filter(
        (match) =>
          new Date(
            match.date,
          ).getTime() <
          new Date(
            cutoffDate,
          ).getTime(),
      )
      .sort(
        (
          a,
          b,
        ) =>
          new Date(
            b.date,
          ).getTime() -
          new Date(
            a.date,
          ).getTime(),
      )
      .slice(
        0,
        10,
      );

  if (
    recent.length ===
    0
  ) {
    return {
      matchesPlayed:
        0,

      wins:
        0,

      draws:
        0,

      losses:
        0,

      averageGoalsFor:
        0,

      averageGoalsAgainst:
        0,

      formScore:
        50,
    };
  }

  let wins =
    0;

  let draws =
    0;

  let losses =
    0;

  let goalsFor =
    0;

  let goalsAgainst =
    0;

  for (
    const match
    of recent
  ) {
    goalsFor +=
      match.goalsFor;

    goalsAgainst +=
      match.goalsAgainst;

    if (
      match.result ===
      "W"
    ) {
      wins +=
        1;
    } else if (
      match.result ===
      "D"
    ) {
      draws +=
        1;
    } else {
      losses +=
        1;
    }
  }

  const matchesPlayed =
    recent.length;

  const points =
    wins *
      3 +
    draws;

  const maxPoints =
    matchesPlayed *
    3;

  const pointsRate =
    maxPoints >
    0
      ? points /
        maxPoints
      : 0;

  const averageGoalsFor =
    goalsFor /
    matchesPlayed;

  const averageGoalsAgainst =
    goalsAgainst /
    matchesPlayed;

  const goalDifferencePerMatch =
    averageGoalsFor -
    averageGoalsAgainst;

  /*
   * Form Score:
   * - 積分效率為主
   * - 場均淨勝球小幅修正
   * - 夾在 20 ~ 90
   */
  const formScore =
    clamp(
      25 +
        pointsRate *
          55 +
        goalDifferencePerMatch *
          10,
      20,
      90,
    );

  return {
    matchesPlayed,

    wins,

    draws,

    losses,

    averageGoalsFor:
      round(
        averageGoalsFor,
        2,
      ),

    averageGoalsAgainst:
      round(
        averageGoalsAgainst,
        2,
      ),

    formScore:
      round(
        formScore,
      ),
  };
}

/* ==========================================
   Attack / Defense

   與目前 footballGameAnalysis.ts 一致
========================================== */

function calculateAttackScore(
  averageGoalsFor: number,
) {
  return clamp(
    20 +
      averageGoalsFor *
        30,
    20,
    95,
  );
}

function calculateDefenseScore(
  averageGoalsAgainst: number,
) {
  return clamp(
    90 -
      averageGoalsAgainst *
        30,
    20,
    95,
  );
}

/* ==========================================
   Historical Serie A XSI Probability V2

   沿用同一套 Historical XSI V2 做「基準回測」：
   formWeight = 0
   attackWeight = 0
   defenseWeight = 0.12
   homeEdge = 3

   目的不是直接把這組參數當義甲最佳參數，
   而是先建立義甲歷史 XSI baseline，
   後面再用義甲 380 場調參。
========================================== */

function calculateHistoricalXsiProbabilities({
  market,
  homeFormScore,
  awayFormScore,
  homeDefense,
  awayDefense,
  hasFormData,
}: {
  market:
    ThreeWayProbability;

  homeFormScore:
    number;

  awayFormScore:
    number;

  homeDefense:
    number;

  awayDefense:
    number;

  hasFormData:
    boolean;
}) {
  if (
    !hasFormData
  ) {
    return market;
  }

  const defenseDifference =
    homeDefense -
    awayDefense;

  const defenseAdjustment =
    clamp(
      defenseDifference *
        0.12,
      -8,
      8,
    );

  const homeAdvantage =
    3;

  const totalAdjustment =
    defenseAdjustment +
    homeAdvantage;

  let home =
    market.home +
    totalAdjustment;

  let away =
    market.away -
    totalAdjustment;

  const formGap =
    Math.abs(
      homeFormScore -
      awayFormScore,
    );

  let draw =
    market.draw;

  if (
    formGap <=
    8
  ) {
    draw +=
      4;
  } else if (
    formGap <=
    15
  ) {
    draw +=
      2;
  } else if (
    formGap >=
    35
  ) {
    draw -=
      3;
  }

  home =
    Math.max(
      8,
      home,
    );

  draw =
    Math.max(
      10,
      draw,
    );

  away =
    Math.max(
      8,
      away,
    );

  return normalizeProbabilityScores(
    home,
    draw,
    away,
  );
}

/* ==========================================
   GET

   預覽：
   /api/football/seriea-history-xsi-sync

   先跑 20 場：
   /api/football/seriea-history-xsi-sync?confirm=1&limit=20

   全部：
   /api/football/seriea-history-xsi-sync?confirm=1

   force=1 可重算：
   /api/football/seriea-history-xsi-sync?confirm=1&force=1
========================================== */

export async function GET(
  request:
    Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

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
      limitParam >
        0
        ? Math.floor(
            limitParam,
          )
        : null;

    const supabase =
      createAdminClient();

    /* ========================================
       STEP 1
       讀取完整 Serie A 2025/26 歷史
    ======================================== */

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "football_match_history",
        )
        .select(
          `
            id,
            external_id,
            league,
            season,
            match_date,
            home_team,
            away_team,
            home_score,
            away_score,
            home_odds,
            draw_odds,
            away_odds,
            home_form_score,
            away_form_score,
            home_attack_score,
            away_attack_score,
            home_defense_score,
            away_defense_score,
            market_home_prob,
            market_draw_prob,
            market_away_prob,
            xsi_home_prob,
            xsi_draw_prob,
            xsi_away_prob,
            xsi_diff
          `,
        )
        .eq(
          "league",
          LEAGUE,
        )
        .eq(
          "season",
          SEASON,
        )
        .eq(
          "status",
          "finished",
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
        `讀取 football_match_history 失敗：${error.message}`,
      );
    }

    const rows =
      (
        data ??
        []
      ) as HistoryRow[];

    if (
      rows.length ===
      0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "找不到義甲 2025/26 歷史資料，請先執行 seriea-history-sync。",
        },
        {
          status:
            404,
        },
      );
    }

    const allPastMatches =
      buildTeamPastMatches(
        rows,
      );

    const isComplete = (
      row:
        HistoryRow,
    ) =>
      row.market_home_prob !==
        null &&
      row.market_draw_prob !==
        null &&
      row.market_away_prob !==
        null &&
      row.xsi_home_prob !==
        null &&
      row.xsi_draw_prob !==
        null &&
      row.xsi_away_prob !==
        null &&
      row.xsi_diff !==
        null;

    const alreadyComplete =
      rows.filter(
        isComplete,
      ).length;

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
       STEP 2
       預覽
    ======================================== */

    if (
      !confirm
    ) {
      return NextResponse.json({
        success:
          true,

        preview:
          true,

        league:
          LEAGUE,

        season:
          SEASON,

        total:
          rows.length,

        alreadyComplete,

        pending:
          pendingRows.length,

        willSync:
          targetRows.length,

        limit,

        force,

        message:
          "安全預覽，尚未寫入 Historical XSI。確認後加上 ?confirm=1。",

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
                externalId:
                  row.external_id,

                date:
                  row.match_date,

                game:
                  `${row.away_team} @ ${row.home_team}`,

                odds: {
                  home:
                    row.home_odds,

                  draw:
                    row.draw_odds,

                  away:
                    row.away_odds,
                },
              }),
            ),
      });
    }

    /* ========================================
       STEP 3
       逐場 Historical XSI
    ======================================== */

    let analyzed =
      0;

    let updated =
      0;

    let failed =
      0;

    const errors:
      Array<{
        externalId: string;

        message: string;
      }> = [];

    const sample:
      Array<Record<
        string,
        unknown
      >> = [];

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
        const homePast =
          allPastMatches.get(
            row.home_team,
          ) ??
          [];

        const awayPast =
          allPastMatches.get(
            row.away_team,
          ) ??
          [];

        const homeForm =
          calculateHistoricalForm(
            homePast,
            row.match_date,
          );

        const awayForm =
          calculateHistoricalForm(
            awayPast,
            row.match_date,
          );

        const hasFormData =
          homeForm.matchesPlayed >=
            3 &&
          awayForm.matchesPlayed >=
            3;

        const homeAttack =
          calculateAttackScore(
            homeForm
              .averageGoalsFor,
          );

        const awayAttack =
          calculateAttackScore(
            awayForm
              .averageGoalsFor,
          );

        const homeDefense =
          calculateDefenseScore(
            homeForm
              .averageGoalsAgainst,
          );

        const awayDefense =
          calculateDefenseScore(
            awayForm
              .averageGoalsAgainst,
          );

        const market =
          normalizeThreeWayProbabilities({
            homeOdds:
              row.home_odds,

            drawOdds:
              row.draw_odds,

            awayOdds:
              row.away_odds,
          });

        const xsi =
          calculateHistoricalXsiProbabilities({
            market,

            homeFormScore:
              homeForm.formScore,

            awayFormScore:
              awayForm.formScore,

            homeDefense,

            awayDefense,

            hasFormData,
          });

        const xsiDiff =
          round(
            Math.abs(
              xsi.home -
              xsi.away,
            ),
          );

        const {
          data:
            updatedRows,

          error:
            updateError,
        } =
          await supabase
            .from(
              "football_match_history",
            )
            .update({
              home_form_score:
                homeForm.formScore,

              away_form_score:
                awayForm.formScore,

              home_attack_score:
                round(
                  homeAttack,
                ),

              away_attack_score:
                round(
                  awayAttack,
                ),

              home_defense_score:
                round(
                  homeDefense,
                ),

              away_defense_score:
                round(
                  awayDefense,
                ),

              market_home_prob:
                market.home,

              market_draw_prob:
                market.draw,

              market_away_prob:
                market.away,

              xsi_home_prob:
                xsi.home,

              xsi_draw_prob:
                xsi.draw,

              xsi_away_prob:
                xsi.away,

              xsi_diff:
                xsiDiff,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              row.id,
            )
            .select(
              "id",
            );

        if (
          updateError
        ) {
          throw new Error(
            updateError.message,
          );
        }

        if (
          !updatedRows ||
          updatedRows.length ===
            0
        ) {
          throw new Error(
            "Supabase 沒有更新任何資料",
          );
        }

        analyzed +=
          1;

        updated +=
          updatedRows.length;

        if (
          sample.length <
          20
        ) {
          sample.push({
            externalId:
              row.external_id,

            game:
              `${row.away_team} @ ${row.home_team}`,

            homeForm:
              homeForm.formScore,

            awayForm:
              awayForm.formScore,

            market,

            xsi,

            xsiDiff,

            hasFormData,
          });
        }

        console.log(
          `⚽ Serie A Historical XSI ${index + 1}/${targetRows.length}｜${row.away_team} @ ${row.home_team}｜Market H/D/A ${market.home}/${market.draw}/${market.away}｜XSI ${xsi.home}/${xsi.draw}/${xsi.away}`,
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
          externalId:
            row.external_id,

          message,
        });

        console.error(
          `❌ Serie A Historical XSI ${row.external_id} 失敗：`,
          error,
        );
      }
    }

    console.log(
      "======================================",
    );

    console.log(
      "🇮🇹 Serie A Historical XSI Sync 完成",
    );

    console.log(
      `總場數：${rows.length}`,
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

      league:
        LEAGUE,

      season:
        SEASON,

      total:
        rows.length,

      alreadyComplete,

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

      sample,
    });
  } catch (
    error
  ) {
    console.error(
      "❌ Serie A history-xsi-sync Error：",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
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

export async function POST(
  request:
    Request,
) {
  return GET(
    request,
  );
}