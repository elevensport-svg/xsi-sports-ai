import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

/* ==========================================
   Types
========================================== */

type MlbHistoryGame = {
  gamePk: number;
  gameDate: string;

  status?: {
    abstractGameState?: string;
    detailedState?: string;
  };

  teams: {
    away: {
      score?: number;

      team: {
        id: number;
        name: string;
      };
    };

    home: {
      score?: number;

      team: {
        id: number;
        name: string;
      };
    };
  };
};

type MlbScheduleResponse = {
  dates?: Array<{
    date: string;
    games?: MlbHistoryGame[];
  }>;
};

/* ==========================================
   YYYY-MM-DD 驗證
========================================== */

function isValidDateString(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

/* ==========================================
   預設日期

   預設抓最近 30 天
========================================== */

function getDefaultDateRange() {
  const end =
    new Date();

  /*
   * 避免今天尚未完賽，
   * 預設抓到昨天。
   */
  end.setUTCDate(
    end.getUTCDate() - 1,
  );

  const start =
    new Date(end);

  start.setUTCDate(
    start.getUTCDate() - 29,
  );

  return {
    startDate:
      start
        .toISOString()
        .slice(0, 10),

    endDate:
      end
        .toISOString()
        .slice(0, 10),
  };
}

/* ==========================================
   判斷是否完賽
========================================== */

function isFinishedGame(
  game: MlbHistoryGame,
) {
  const abstractState =
    game.status
      ?.abstractGameState
      ?.toLowerCase() ??
    "";

  const detailedState =
    game.status
      ?.detailedState
      ?.toLowerCase() ??
    "";

  if (
    abstractState ===
    "final"
  ) {
    return true;
  }

  if (
    detailedState.includes(
      "final",
    ) ||
    detailedState.includes(
      "completed",
    ) ||
    detailedState.includes(
      "game over",
    )
  ) {
    return true;
  }

  return false;
}

/* ==========================================
   MLB Schedule API
========================================== */

async function fetchMlbHistory(
  startDate: string,
  endDate: string,
): Promise<MlbHistoryGame[]> {
  const params =
    new URLSearchParams({
      sportId: "1",

      startDate,

      endDate,

      hydrate:
        "team",
    });

  const url =
    `https://statsapi.mlb.com/api/v1/schedule?${params.toString()}`;

  console.log(
    "======================================",
  );

  console.log(
    "⚾ MLB History Sync",
  );

  console.log(
    `📅 ${startDate} ~ ${endDate}`,
  );

  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      },
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `MLB Schedule API 錯誤：${response.status}`,
    );
  }

  const data =
    (await response.json()) as MlbScheduleResponse;

  const games =
    data.dates?.flatMap(
      (date) =>
        date.games ?? [],
    ) ?? [];

  console.log(
    `⚾ MLB API 原始場數：${games.length}`,
  );

  return games;
}

/* ==========================================
   建立 History Row
========================================== */

function buildHistoryRow(
  game: MlbHistoryGame,
) {
  const awayScore =
    Number(
      game.teams.away
        .score,
    );

  const homeScore =
    Number(
      game.teams.home
        .score,
    );

  if (
    !Number.isFinite(
      awayScore,
    ) ||
    !Number.isFinite(
      homeScore,
    )
  ) {
    return null;
  }

  const awayTeam =
    game.teams.away
      .team.name;

  const homeTeam =
    game.teams.home
      .team.name;

  /*
   * run_margin：
   *
   * 正數 = 主隊贏幾分
   * 負數 = 客隊贏幾分
   *
   * 例如：
   * 主 6 : 客 2
   * run_margin = +4
   *
   * 主 2 : 客 5
   * run_margin = -3
   */
  const runMargin =
    homeScore -
    awayScore;

  let winner:
    string | null =
      null;

  if (
    homeScore >
    awayScore
  ) {
    winner =
      homeTeam;
  } else if (
    awayScore >
    homeScore
  ) {
    winner =
      awayTeam;
  }

  return {
    game_pk:
      String(
        game.gamePk,
      ),

    match_date:
      game.gameDate,

    home_team:
      homeTeam,

    away_team:
      awayTeam,

    home_score:
      homeScore,

    away_score:
      awayScore,

    game_status:
      "final",

    winner,

    run_margin:
      runMargin,

    updated_at:
      new Date()
        .toISOString(),
  };
}

/* ==========================================
   GET

   預設：
   /api/mlb/history-sync

   指定區間：
   /api/mlb/history-sync
     ?startDate=2026-07-01
     &endDate=2026-07-31
========================================== */

export async function GET(
  request:
    NextRequest,
) {
  try {
    const {
      searchParams,
    } =
      request.nextUrl;

    const defaults =
      getDefaultDateRange();

    const startDate =
      searchParams.get(
        "startDate",
      ) ??
      defaults.startDate;

    const endDate =
      searchParams.get(
        "endDate",
      ) ??
      defaults.endDate;

    /* ========================================
       STEP 1
       日期驗證
    ======================================== */

    if (
      !isValidDateString(
        startDate,
      ) ||
      !isValidDateString(
        endDate,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "日期格式必須為 YYYY-MM-DD",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      startDate >
      endDate
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "startDate 不可晚於 endDate",
        },
        {
          status:
            400,
        },
      );
    }

    /* ========================================
       STEP 2
       抓 MLB 歷史賽程
    ======================================== */

    const games =
      await fetchMlbHistory(
        startDate,
        endDate,
      );

    /* ========================================
       STEP 3
       只保留完賽
    ======================================== */

    const finishedGames =
      games.filter(
        isFinishedGame,
      );

    console.log(
      `✅ 已完賽：${finishedGames.length}`,
    );

    /* ========================================
       STEP 4
       轉成 DB rows
    ======================================== */

    const rawRows =
  finishedGames
    .map(
      buildHistoryRow,
    )
    .filter(
      (
        row,
      ): row is NonNullable<
        typeof row
      > =>
        row !==
        null,
    );

/*
 * ========================================
 * 依 game_pk 去重
 *
 * MLB Schedule API 某些月份可能出現
 * 同一個 game_pk 重複回傳。
 *
 * Supabase ON CONFLICT 在同一次 upsert
 * 不能處理兩筆相同 game_pk，
 * 所以寫入前先去重。
 * ========================================
 */

const uniqueRowsMap =
  new Map<
    string,
    (typeof rawRows)[number]
  >();

for (
  const row
  of rawRows
) {
  uniqueRowsMap.set(
    String(
      row.game_pk,
    ),
    row,
  );
}

const rows =
  Array.from(
    uniqueRowsMap.values(),
  );

const duplicated =
  rawRows.length -
  rows.length;

console.log(
  `🧹 重複 game_pk：${duplicated}`,
);

console.log(
  `💾 去重後可寫入：${rows.length}`,
);
    if (
      rows.length ===
      0
    ) {
      return NextResponse.json({
        success:
          true,

        startDate,

        endDate,

        fetched:
          games.length,

        finished:
          finishedGames.length,

        saved:
          0,

        message:
          "此日期區間沒有可寫入的已完賽 MLB 比賽。",
      });
    }

    /* ========================================
       STEP 5
       Supabase Upsert

       game_pk 已設 unique
       所以重跑不會產生重複資料
    ======================================== */

    const supabase =
      createAdminClient();

    const {
      error,
    } =
      await supabase
        .from(
          "mlb_match_history",
        )
        .upsert(
          rows,
          {
            onConflict:
              "game_pk",
          },
        );

    if (
      error
    ) {
      throw new Error(
        `寫入 mlb_match_history 失敗：${error.message}`,
      );
    }

    /* ========================================
       STEP 6
       完成
    ======================================== */

    console.log(
      "======================================",
    );

    console.log(
      "🎉 MLB 歷史賽果同步完成",
    );

    console.log(
      `📅 ${startDate} ~ ${endDate}`,
    );

    console.log(
      `⚾ API 場數：${games.length}`,
    );

    console.log(
      `🏁 完賽：${finishedGames.length}`,
    );

    console.log(
      `💾 寫入：${rows.length}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        true,

      message:
        "MLB 歷史賽果同步完成",

      startDate,

      endDate,

      fetched:
        games.length,

      finished:
        finishedGames.length,

      saved:
        rows.length,

      sample:
        rows
          .slice(
            -5,
          )
          .map(
            (row) => ({
              gamePk:
                row.game_pk,

              date:
                row.match_date,

              away:
                row.away_team,

              home:
                row.home_team,

              score:
                `${row.away_score}-${row.home_score}`,

              winner:
                row.winner,

              runMargin:
                row.run_margin,
            }),
          ),
    });
  } catch (
    error
  ) {
    console.error(
      "❌ MLB History Sync Error：",
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

/* ==========================================
   POST
========================================== */

export async function POST(
  request:
    NextRequest,
) {
  return GET(
    request,
  );
}