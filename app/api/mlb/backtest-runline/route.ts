import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

type HistoryRow = {
  game_pk: string;
  match_date: string;

  home_team: string;
  away_team: string;

  home_score: number;
  away_score: number;

  run_margin:
    | number
    | null;

  home_moneyline:
    | number
    | null;

  away_moneyline:
    | number
    | null;

  home_spread:
    | number
    | null;

  away_spread:
    | number
    | null;

  home_xsi:
    | number
    | null;

  away_xsi:
    | number
    | null;

  xsi_diff:
    | number
    | null;
};

type Side =
  | "home"
  | "away";

type BetType =
  | "favorite_-1.5"
  | "underdog_+1.5";

type BacktestCandidate = {
  betType:
    BetType;

  side:
    Side;

  minXsiDiff:
    number;

  moneylineMin:
    number | null;

  moneylineMax:
    number | null;

  requireXsiLeader:
    boolean;
};

type BacktestResult = {
  betType:
    BetType;

  side:
    Side;

  minXsiDiff:
    number;

  moneylineMin:
    number | null;

  moneylineMax:
    number | null;

  requireXsiLeader:
    boolean;

  games:
    number;

  wins:
    number;

  losses:
    number;

  winRate:
    number;
};

/* ==========================================
   American Odds Helper
========================================== */

function isWithinMoneylineRange(
  odds:
    | number
    | null,

  min:
    | number
    | null,

  max:
    | number
    | null,
) {
  if (
    odds ===
    null
  ) {
    return false;
  }

  if (
    min !==
      null &&
    odds < min
  ) {
    return false;
  }

  if (
    max !==
      null &&
    odds > max
  ) {
    return false;
  }

  return true;
}

/* ==========================================
   判斷 XSI Leader
========================================== */

function isXsiLeader(
  row:
    HistoryRow,

  side:
    Side,
) {
  if (
    row.home_xsi ===
      null ||
    row.away_xsi ===
      null
  ) {
    return false;
  }

  if (
    row.home_xsi ===
    row.away_xsi
  ) {
    return true;
  }

  if (
    side ===
    "home"
  ) {
    return (
      row.home_xsi >
      row.away_xsi
    );
  }

  return (
    row.away_xsi >
    row.home_xsi
  );
}

/* ==========================================
   Run Line Result
========================================== */

function didCoverRunLine(
  row:
    HistoryRow,

  side:
    Side,

  spread:
    number,
) {
  const homeScore =
    Number(
      row.home_score,
    );

  const awayScore =
    Number(
      row.away_score,
    );

  if (
    !Number.isFinite(
      homeScore,
    ) ||
    !Number.isFinite(
      awayScore,
    )
  ) {
    return false;
  }

  if (
    side ===
    "home"
  ) {
    return (
      homeScore +
        spread >
      awayScore
    );
  }

  return (
    awayScore +
      spread >
    homeScore
  );
}

/* ==========================================
   建立候選條件
========================================== */

function buildCandidates() {
  const minXsiDiffs = [
    0,
    2,
    3,
    5,
    7,
    10,
    12,
    15,
  ];

  const favoriteMoneylineRanges:
    Array<
      [
        number | null,
        number | null,
      ]
    > = [
      [null, -101],
      [-300, -101],
      [-250, -120],
      [-220, -130],
      [-200, -140],
      [-180, -150],
      [-160, -101],
    ];

  const underdogMoneylineRanges:
    Array<
      [
        number | null,
        number | null,
      ]
    > = [
      [100, null],
      [100, 140],
      [110, 160],
      [120, 180],
      [130, 200],
      [150, 250],
      [180, null],
    ];

  const candidates:
    BacktestCandidate[] = [];

  for (
    const minXsiDiff
    of minXsiDiffs
  ) {
    for (
      const [
        moneylineMin,
        moneylineMax,
      ]
      of favoriteMoneylineRanges
    ) {
      for (
        const side
        of [
          "home",
          "away",
        ] as Side[]
      ) {
        for (
          const requireXsiLeader
          of [
            true,
            false,
          ]
        ) {
          candidates.push({
            betType:
              "favorite_-1.5",

            side,

            minXsiDiff,

            moneylineMin,

            moneylineMax,

            requireXsiLeader,
          });
        }
      }
    }

    for (
      const [
        moneylineMin,
        moneylineMax,
      ]
      of underdogMoneylineRanges
    ) {
      for (
        const side
        of [
          "home",
          "away",
        ] as Side[]
      ) {
        for (
          const requireXsiLeader
          of [
            true,
            false,
          ]
        ) {
          candidates.push({
            betType:
              "underdog_+1.5",

            side,

            minXsiDiff,

            moneylineMin,

            moneylineMax,

            requireXsiLeader,
          });
        }
      }
    }
  }

  return candidates;
}

/* ==========================================
   回測單一 Candidate
========================================== */

function testCandidate(
  rows:
    HistoryRow[],

  candidate:
    BacktestCandidate,
): BacktestResult {
  let games = 0;
  let wins = 0;

  for (
    const row
    of rows
  ) {
    const side =
      candidate.side;

    const spread =
      side ===
      "home"
        ? row.home_spread
        : row.away_spread;

    const moneyline =
      side ===
      "home"
        ? row.home_moneyline
        : row.away_moneyline;

    const xsiDiff =
      Number(
        row.xsi_diff ??
          0,
      );

    if (
      !Number.isFinite(
        xsiDiff,
      ) ||
      xsiDiff <
        candidate.minXsiDiff
    ) {
      continue;
    }

    if (
      !isWithinMoneylineRange(
        moneyline,
        candidate.moneylineMin,
        candidate.moneylineMax,
      )
    ) {
      continue;
    }

    if (
      candidate.requireXsiLeader &&
      !isXsiLeader(
        row,
        side,
      )
    ) {
      continue;
    }

    if (
      candidate.betType ===
      "favorite_-1.5"
    ) {
      if (
        spread ===
          null ||
        spread >=
          0
      ) {
        continue;
      }

      /*
       * 只測 -1.5 附近。
       * 歷史 consensus 可能有少量平均後的 -1.45 / -1.36，
       * 因此允許 -1 ~ -2 之間。
       */
      if (
        spread >
          -1 ||
        spread <
          -2
      ) {
        continue;
      }
    }

    if (
      candidate.betType ===
      "underdog_+1.5"
    ) {
      if (
        spread ===
          null ||
        spread <=
          0
      ) {
        continue;
      }

      if (
        spread <
          1 ||
        spread >
          2
      ) {
        continue;
      }
    }

    games +=
      1;

    if (
         spread !== null &&
      didCoverRunLine(
        row,
        side,
        spread,
      )
    ) {
      wins +=
        1;
    }
  }

  const losses =
    games -
    wins;

  const winRate =
    games > 0
      ? Number(
          (
            (
              wins /
              games
            ) *
            100
          ).toFixed(
            1,
          ),
        )
      : 0;

  return {
    ...candidate,

    games,

    wins,

    losses,

    winRate,
  };
}

/* ==========================================
   排序
========================================== */

function rankResults(
  results:
    BacktestResult[],

  minimumGames:
    number,
) {
  return results
    .filter(
      (
        result,
      ) =>
        result.games >=
        minimumGames,
    )
    .sort(
      (
        a,
        b,
      ) => {
        if (
          b.winRate !==
          a.winRate
        ) {
          return (
            b.winRate -
            a.winRate
          );
        }

        return (
          b.games -
          a.games
        );
      },
    );
}

/* ==========================================
   GET

   /api/mlb/backtest-runline?month=2026-07

   可指定最低樣本：
   /api/mlb/backtest-runline?month=2026-07&minGames=20
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

    const month =
      url.searchParams.get(
        "month",
      ) ??
      "2026-07";

    const minGamesParam =
      Number(
        url.searchParams.get(
          "minGames",
        ) ??
          "20",
      );

    const minGames =
      Number.isFinite(
        minGamesParam,
      )
        ? Math.max(
            5,
            Math.floor(
              minGamesParam,
            ),
          )
        : 20;

    if (
      !/^\d{4}-\d{2}$/.test(
        month,
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "month 格式錯誤，請使用 YYYY-MM，例如 2026-07",
        },
        {
          status:
            400,
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

    const nextMonth =
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
            game_pk,
            match_date,
            home_team,
            away_team,
            home_score,
            away_score,
            run_margin,
            home_moneyline,
            away_moneyline,
            home_spread,
            away_spread,
            home_xsi,
            away_xsi,
            xsi_diff
          `,
        )
        .gte(
          "match_date",
          startDate,
        )
        .lt(
          "match_date",
          nextMonth,
        )
        .not(
          "home_score",
          "is",
          null,
        )
        .not(
          "away_score",
          "is",
          null,
        )
        .not(
          "home_xsi",
          "is",
          null,
        )
        .not(
          "away_xsi",
          "is",
          null,
        )
        .not(
          "home_spread",
          "is",
          null,
        )
        .not(
          "away_spread",
          "is",
          null,
        );

    if (
      error
    ) {
      throw new Error(
        `讀取 mlb_match_history 失敗：${error.message}`,
      );
    }

    const rows =
      (
        data ??
        []
      ) as HistoryRow[];

    const candidates =
      buildCandidates();

    const allResults =
      candidates.map(
        (
          candidate,
        ) =>
          testCandidate(
            rows,
            candidate,
          ),
      );

    const favorites =
      rankResults(
        allResults.filter(
          (
            result,
          ) =>
            result.betType ===
            "favorite_-1.5",
        ),
        minGames,
      );

    const underdogs =
      rankResults(
        allResults.filter(
          (
            result,
          ) =>
            result.betType ===
            "underdog_+1.5",
        ),
        minGames,
      );

    const favorites70 =
      favorites.filter(
        (
          result,
        ) =>
          result.winRate >=
          70,
      );

    const underdogs70 =
      underdogs.filter(
        (
          result,
        ) =>
          result.winRate >=
          70,
      );

    return NextResponse.json({
      success:
        true,

      month,

      sampleGames:
        rows.length,

      minimumGames:
        minGames,

      message:
        "Run Line 回測完成。結果只代表此月份歷史樣本，尚未做跨月份 out-of-sample 驗證。",

      summary: {
        favoriteCandidates:
          favorites.length,

        underdogCandidates:
          underdogs.length,

        favorite70Plus:
          favorites70.length,

        underdog70Plus:
          underdogs70.length,
      },

      favoriteMinus15: {
        best:
          favorites.slice(
            0,
            20,
          ),

        above70:
          favorites70.slice(
            0,
            20,
          ),
      },

      underdogPlus15: {
        best:
          underdogs.slice(
            0,
            20,
          ),

        above70:
          underdogs70.slice(
            0,
            20,
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "❌ MLB Run Line Backtest Error：",
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