import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "../../../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

const API_KEY =
  process.env.ODDS_API_KEY;

const BASE_URL =
  "https://api.the-odds-api.com/v4";

const SPORT_KEY =
  "baseball_mlb";

const REGIONS =
  "us";

const MARKETS =
  "h2h,spreads,totals";

type HistoricalOutcome = {
  name: string;
  price: number;
  point?: number;
};

type HistoricalMarket = {
  key: string;
  last_update: string;
  outcomes: HistoricalOutcome[];
};

type HistoricalBookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: HistoricalMarket[];
};

type HistoricalOddsGame = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: HistoricalBookmaker[];
};

type HistoricalOddsResponse = {
  timestamp: string;
  previous_timestamp: string | null;
  next_timestamp: string | null;
  data: HistoricalOddsGame[];
};

type HistoryRow = {
  game_pk: string;
  match_date: string;
  home_team: string;
  away_team: string;

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

  total_line:
    | number
    | null;
};

/* ==========================================
   隊名正規化
========================================== */

function normalizeTeamName(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    )
    .trim();
}

/* ==========================================
   平均
========================================== */

function average(
  values: number[],
): number | null {
  if (
    values.length ===
    0
  ) {
    return null;
  }

  return Number(
    (
      values.reduce(
        (
          sum,
          value,
        ) =>
          sum + value,
        0,
      ) /
      values.length
    ).toFixed(
      2,
    ),
  );
}

/* ==========================================
   Market Helper
========================================== */

function getMarket(
  bookmaker:
    HistoricalBookmaker,

  key:
    | "h2h"
    | "spreads"
    | "totals",
) {
  return bookmaker.markets.find(
    (market) =>
      market.key === key,
  );
}

/* ==========================================
   建立歷史盤口共識
========================================== */

function buildConsensus(
  game:
    HistoricalOddsGame,
) {
  const awayMoneylines:
    number[] = [];

  const homeMoneylines:
    number[] = [];

  const awaySpreads:
    number[] = [];

  const homeSpreads:
    number[] = [];

  const totals:
    number[] = [];

  const normalizedAway =
    normalizeTeamName(
      game.away_team,
    );

  const normalizedHome =
    normalizeTeamName(
      game.home_team,
    );

  for (
    const bookmaker
    of game.bookmakers
  ) {
    const h2h =
      getMarket(
        bookmaker,
        "h2h",
      );

    const spreads =
      getMarket(
        bookmaker,
        "spreads",
      );

    const totalMarket =
      getMarket(
        bookmaker,
        "totals",
      );

    const awayMoneyline =
      h2h?.outcomes.find(
        (outcome) =>
          normalizeTeamName(
            outcome.name,
          ) ===
          normalizedAway,
      );

    const homeMoneyline =
      h2h?.outcomes.find(
        (outcome) =>
          normalizeTeamName(
            outcome.name,
          ) ===
          normalizedHome,
      );

    if (
      awayMoneyline &&
      Number.isFinite(
        awayMoneyline.price,
      )
    ) {
      awayMoneylines.push(
        awayMoneyline.price,
      );
    }

    if (
      homeMoneyline &&
      Number.isFinite(
        homeMoneyline.price,
      )
    ) {
      homeMoneylines.push(
        homeMoneyline.price,
      );
    }

    const awaySpread =
      spreads?.outcomes.find(
        (outcome) =>
          normalizeTeamName(
            outcome.name,
          ) ===
          normalizedAway,
      );

    const homeSpread =
      spreads?.outcomes.find(
        (outcome) =>
          normalizeTeamName(
            outcome.name,
          ) ===
          normalizedHome,
      );

    if (
      awaySpread?.point !==
        undefined &&
      Number.isFinite(
        awaySpread.point,
      )
    ) {
      awaySpreads.push(
        awaySpread.point,
      );
    }

    if (
      homeSpread?.point !==
        undefined &&
      Number.isFinite(
        homeSpread.point,
      )
    ) {
      homeSpreads.push(
        homeSpread.point,
      );
    }

    const over =
      totalMarket?.outcomes.find(
        (outcome) =>
          outcome.name
            .toLowerCase() ===
          "over",
      );

    if (
      over?.point !==
        undefined &&
      Number.isFinite(
        over.point,
      )
    ) {
      totals.push(
        over.point,
      );
    }
  }

  return {
    awayMoneyline:
      average(
        awayMoneylines,
      ),

    homeMoneyline:
      average(
        homeMoneylines,
      ),

    awaySpread:
      average(
        awaySpreads,
      ),

    homeSpread:
      average(
        homeSpreads,
      ),

    total:
      average(
        totals,
      ),

    bookmakerCount:
      game.bookmakers.length,

    spreadBookmakerCount:
      game.bookmakers.filter(
        (bookmaker) =>
          (
            getMarket(
              bookmaker,
              "spreads",
            )?.outcomes
              .length ?? 0
          ) > 0,
      ).length,
  };
}

/* ==========================================
   日期 Helpers
========================================== */

function isValidDateString(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function isValidIsoTimestamp(
  value: string,
) {
  const timestamp =
    new Date(
      value,
    ).getTime();

  return Number.isFinite(
    timestamp,
  );
}

function getDateKey(
  value: string,
) {
  return value.slice(
    0,
    10,
  );
}

function toHistoricalIsoTimestamp(
  value: string,
) {
  const date =
    new Date(
      value,
    );

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    throw new Error(
      "無效的 Historical Odds timestamp",
    );
  }

  /*
   * The Odds API historical date 使用：
   * YYYY-MM-DDTHH:mm:ssZ
   *
   * 不帶 milliseconds。
   */
  return date
    .toISOString()
    .replace(
      /\.\d{3}Z$/,
      "Z",
    );
}

/* ==========================================
   Historical Odds API
========================================== */

async function fetchHistoricalOdds(
  snapshot:
    string,
) {
  if (!API_KEY) {
    throw new Error(
      "找不到 ODDS_API_KEY",
    );
  }

  const params =
    new URLSearchParams({
      apiKey:
        API_KEY,

      regions:
        REGIONS,

      markets:
        MARKETS,

      oddsFormat:
        "american",

      date:
        snapshot,
    });

  const url =
    `${BASE_URL}/historical/sports/${SPORT_KEY}/odds?${params.toString()}`;

  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      },
    );

  const remaining =
    response.headers.get(
      "x-requests-remaining",
    );

  const used =
    response.headers.get(
      "x-requests-used",
    );

  const last =
    response.headers.get(
      "x-requests-last",
    );

  if (
    !response.ok
  ) {
    let apiMessage =
      "";

    try {
      const body =
        await response.json();

      apiMessage =
        body?.message ??
        body?.error_code ??
        "";
    } catch {
      // ignore
    }

    throw new Error(
      `Historical Odds API ${response.status}${
        apiMessage
          ? `：${apiMessage}`
          : ""
      }`,
    );
  }

  const data =
    (await response.json()) as HistoricalOddsResponse;

  return {
    response:
      data,

    quota: {
      remaining,
      used,
      last,
    },
  };
}

/* ==========================================
   GET

   安全預覽：
   /api/mlb/history-odds-sync?date=2026-07-01

   真正呼叫 Historical Odds API：
   /api/mlb/history-odds-sync?date=2026-07-01&confirm=1

   指定精確 snapshot：
   /api/mlb/history-odds-sync
     ?snapshot=2026-07-01T12:00:00Z
     &confirm=1

   注意：
   historical h2h + spreads + totals
   us region
   一次成功回傳 3 個市場時，
   Historical Odds API 額度成本通常為 30 credits。
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

    const date =
      searchParams.get(
        "date",
      );

    const customSnapshot =
      searchParams.get(
        "snapshot",
      );

    const confirm =
      searchParams.get(
        "confirm",
      ) === "1";

    /*
     * ========================================
     * STEP 1
     * 決定 snapshot
     * ========================================
     */

    let snapshot:
      string;

    let targetDate:
      string;

    if (
      customSnapshot
    ) {
      if (
        !isValidIsoTimestamp(
          customSnapshot,
        )
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "snapshot 必須是有效 ISO8601，例如 2026-07-01T12:00:00Z",
          },
          {
            status:
              400,
          },
        );
      }

      snapshot =
        toHistoricalIsoTimestamp(
          customSnapshot,
        );

      targetDate =
        getDateKey(
          snapshot,
        );
    } else {
      if (
        !date ||
        !isValidDateString(
          date,
        )
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "請提供 date=YYYY-MM-DD，例如 ?date=2026-07-01",
          },
          {
            status:
              400,
          },
        );
      }

      targetDate =
        date;

      /*
       * 小範圍測試先固定使用 12:00 UTC snapshot。
       * 後續確認資料品質後，
       * 再決定整月同步要採用幾個每日 snapshot。
       */
      snapshot =
        `${date}T12:00:00Z`;
    }

    /*
     * ========================================
     * STEP 2
     * 沒 confirm=1 時只做安全預覽
     *
     * 避免不小心刷新網址就消耗 Historical Odds credits。
     * ========================================
     */

    if (
      !confirm
    ) {
      return NextResponse.json({
        success:
          true,

        preview:
          true,

        message:
          "這是安全預覽，尚未呼叫 Historical Odds API。確認後加上 &confirm=1。",

        targetDate,

        snapshot,

        sport:
          SPORT_KEY,

        regions:
          REGIONS,

        markets:
          MARKETS,

        estimatedMaxCredits:
          30,

        runUrl:
          `/api/mlb/history-odds-sync?date=${targetDate}&confirm=1`,
      });
    }

    console.log(
      "======================================",
    );

    console.log(
      "📚 MLB Historical Odds Sync",
    );

    console.log(
      `📅 Target：${targetDate}`,
    );

    console.log(
      `🕒 Snapshot：${snapshot}`,
    );

    /*
     * ========================================
     * STEP 3
     * 取得當天 mlb_match_history
     * ========================================
     */

    const supabase =
      createAdminClient();

    const start =
      `${targetDate}T00:00:00.000Z`;

    const nextDate =
      new Date(
        `${targetDate}T00:00:00.000Z`,
      );

    nextDate.setUTCDate(
      nextDate.getUTCDate() +
        1,
    );

    const end =
      nextDate.toISOString();

    const {
      data:
        historyData,
      error:
        historyError,
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
            home_moneyline,
            away_moneyline,
            home_spread,
            away_spread,
            total_line
          `,
        )
        .gte(
          "match_date",
          start,
        )
        .lt(
          "match_date",
          end,
        )
        .order(
          "match_date",
          {
            ascending:
              true,
          },
        );

    if (
      historyError
    ) {
      throw new Error(
        `讀取 mlb_match_history 失敗：${historyError.message}`,
      );
    }

    const historyRows =
      (
        historyData ??
        []
      ) as HistoryRow[];

    /*
     * ========================================
     * STEP 4
     * Historical Odds API
     * ========================================
     */

    const {
      response:
        historical,
      quota,
    } =
      await fetchHistoricalOdds(
        snapshot,
      );

    const oddsGames =
      Array.isArray(
        historical.data,
      )
        ? historical.data
        : [];

    console.log(
      `⚾ History Rows：${historyRows.length}`,
    );

    console.log(
      `💰 Historical Odds Games：${oddsGames.length}`,
    );

    /*
     * ========================================
     * STEP 5
     * 配對
     *
     * 用：
     * away team + home team
     *
     * 並檢查 commence_time 與歷史 match_date
     * 時差不得超過 18 小時。
     * ========================================
     */

    let matched =
      0;

    let updated =
      0;

    let skipped =
      0;

    const diagnostics:
      Array<{
        gamePk:
          string;

        matchup:
          string;

        matched:
          boolean;

        commenceTime?:
          string;

        awayMoneyline?:
          number | null;

        homeMoneyline?:
          number | null;

        awaySpread?:
          number | null;

        homeSpread?:
          number | null;

        total?:
          number | null;

        bookmakerCount?:
          number;

        spreadBookmakerCount?:
          number;

        reason?:
          string;
      }> = [];

    for (
      const row
      of historyRows
    ) {
      const normalizedAway =
        normalizeTeamName(
          row.away_team,
        );

      const normalizedHome =
        normalizeTeamName(
          row.home_team,
        );

      const historyTime =
        new Date(
          row.match_date,
        ).getTime();

      const candidates =
        oddsGames.filter(
          (game) =>
            normalizeTeamName(
              game.away_team,
            ) ===
              normalizedAway &&
            normalizeTeamName(
              game.home_team,
            ) ===
              normalizedHome,
        );

      const oddsGame =
        candidates.find(
          (game) => {
            const oddsTime =
              new Date(
                game.commence_time,
              ).getTime();

            if (
              !Number.isFinite(
                historyTime,
              ) ||
              !Number.isFinite(
                oddsTime,
              )
            ) {
              return true;
            }

            const diffHours =
              Math.abs(
                historyTime -
                  oddsTime,
              ) /
              1000 /
              60 /
              60;

            return (
              diffHours <=
              18
            );
          },
        ) ??
        candidates[0];

      if (
        !oddsGame
      ) {
        skipped +=
          1;

        diagnostics.push({
          gamePk:
            row.game_pk,

          matchup:
            `${row.away_team} vs ${row.home_team}`,

          matched:
            false,

          reason:
            "SNAPSHOT_NOT_FOUND",
        });

        continue;
      }

      matched +=
        1;

      const consensus =
        buildConsensus(
          oddsGame,
        );

      const hasAnyOdds =
        consensus.awayMoneyline !==
          null ||
        consensus.homeMoneyline !==
          null ||
        consensus.awaySpread !==
          null ||
        consensus.homeSpread !==
          null ||
        consensus.total !==
          null;

      if (
        !hasAnyOdds
      ) {
        skipped +=
          1;

        diagnostics.push({
          gamePk:
            row.game_pk,

          matchup:
            `${row.away_team} vs ${row.home_team}`,

          matched:
            true,

          commenceTime:
            oddsGame.commence_time,

          reason:
            "MATCHED_BUT_NO_MARKET_DATA",
        });

        continue;
      }

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "mlb_match_history",
          )
          .update({
            away_moneyline:
              consensus.awayMoneyline,

            home_moneyline:
              consensus.homeMoneyline,

            away_spread:
              consensus.awaySpread,

            home_spread:
              consensus.homeSpread,

            total_line:
              consensus.total,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "game_pk",
            row.game_pk,
          );

      if (
        updateError
      ) {
        throw new Error(
          `MLB ${row.game_pk} 更新歷史盤口失敗：${updateError.message}`,
        );
      }

      updated +=
        1;

      diagnostics.push({
        gamePk:
          row.game_pk,

        matchup:
          `${row.away_team} vs ${row.home_team}`,

        matched:
          true,

        commenceTime:
          oddsGame.commence_time,

        awayMoneyline:
          consensus.awayMoneyline,

        homeMoneyline:
          consensus.homeMoneyline,

        awaySpread:
          consensus.awaySpread,

        homeSpread:
          consensus.homeSpread,

        total:
          consensus.total,

        bookmakerCount:
          consensus.bookmakerCount,

        spreadBookmakerCount:
          consensus.spreadBookmakerCount,
      });
    }

    /*
     * ========================================
     * STEP 6
     * 完成
     * ========================================
     */

    console.log(
      "======================================",
    );

    console.log(
      "🎉 MLB Historical Odds Sync 完成",
    );

    console.log(
      `📅 ${targetDate}`,
    );

    console.log(
      `🕒 API Snapshot：${historical.timestamp}`,
    );

    console.log(
      `📚 History Rows：${historyRows.length}`,
    );

    console.log(
      `🔗 Matched：${matched}`,
    );

    console.log(
      `💾 Updated：${updated}`,
    );

    console.log(
      `⏭️ Skipped：${skipped}`,
    );

    console.log(
      `💳 Last Cost：${quota.last ?? "unknown"}`,
    );

    console.log(
      `💳 Remaining：${quota.remaining ?? "unknown"}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        true,

      preview:
        false,

      message:
        "MLB 歷史盤口同步完成",

      targetDate,

      requestedSnapshot:
        snapshot,

      actualSnapshot:
        historical.timestamp,

      previousSnapshot:
        historical.previous_timestamp,

      nextSnapshot:
        historical.next_timestamp,

      historyRows:
        historyRows.length,

      oddsGames:
        oddsGames.length,

      matched,

      updated,

      skipped,

      quota,

      diagnostics,
    });
  } catch (
    error
  ) {
    console.error(
      "❌ MLB Historical Odds Sync Error：",
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