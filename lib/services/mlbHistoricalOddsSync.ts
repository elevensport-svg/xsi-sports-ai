import {
  createAdminClient,
} from "../supabase/admin";

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
  home_moneyline: number | null;
  away_moneyline: number | null;
  home_spread: number | null;
  away_spread: number | null;
  total_line: number | null;
};

export type MlbHistoricalOddsSyncResult = {
  success: true;
  targetDate: string;
  requestedSnapshot: string;
  actualSnapshot: string;
  previousSnapshot: string | null;
  nextSnapshot: string | null;
  historyRows: number;
  oddsGames: number;
  matched: number;
  updated: number;
  skipped: number;
  quota: {
    remaining: string | null;
    used: string | null;
    last: string | null;
  };
  diagnostics: Array<{
    gamePk: string;
    matchup: string;
    matched: boolean;
    commenceTime?: string;
    awayMoneyline?: number | null;
    homeMoneyline?: number | null;
    awaySpread?: number | null;
    homeSpread?: number | null;
    total?: number | null;
    bookmakerCount?: number;
    spreadBookmakerCount?: number;
    reason?: string;
  }>;
};

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

function average(
  values: number[],
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  return Number(
    (
      values.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) / values.length
    ).toFixed(2),
  );
}

function getMarket(
  bookmaker: HistoricalBookmaker,
  key: "h2h" | "spreads" | "totals",
) {
  return bookmaker.markets.find(
    (market) =>
      market.key === key,
  );
}

function buildConsensus(
  game: HistoricalOddsGame,
) {
  const awayMoneylines: number[] = [];
  const homeMoneylines: number[] = [];
  const awaySpreads: number[] = [];
  const homeSpreads: number[] = [];
  const totals: number[] = [];

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
          ) === normalizedAway,
      );

    const homeMoneyline =
      h2h?.outcomes.find(
        (outcome) =>
          normalizeTeamName(
            outcome.name,
          ) === normalizedHome,
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
          ) === normalizedAway,
      );

    const homeSpread =
      spreads?.outcomes.find(
        (outcome) =>
          normalizeTeamName(
            outcome.name,
          ) === normalizedHome,
      );

    if (
      awaySpread?.point !== undefined &&
      Number.isFinite(
        awaySpread.point,
      )
    ) {
      awaySpreads.push(
        awaySpread.point,
      );
    }

    if (
      homeSpread?.point !== undefined &&
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
          outcome.name.toLowerCase() ===
          "over",
      );

    if (
      over?.point !== undefined &&
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
            )?.outcomes.length ??
            0
          ) > 0,
      ).length,
  };
}

function isValidDateString(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function toHistoricalIsoTimestamp(
  value: string,
) {
  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    throw new Error(
      "無效的 Historical Odds timestamp",
    );
  }

  return date
    .toISOString()
    .replace(
      /\.\d{3}Z$/,
      "Z",
    );
}

async function fetchHistoricalOdds(
  snapshot: string,
) {
  if (!API_KEY) {
    throw new Error(
      "找不到 ODDS_API_KEY",
    );
  }

  const params =
    new URLSearchParams({
      apiKey: API_KEY,
      regions: REGIONS,
      markets: MARKETS,
      oddsFormat: "american",
      date: snapshot,
    });

  const url =
    `${BASE_URL}/historical/sports/${SPORT_KEY}/odds?${params.toString()}`;

  const response =
    await fetch(
      url,
      {
        cache: "no-store",
      },
    );

  const quota = {
    remaining:
      response.headers.get(
        "x-requests-remaining",
      ),

    used:
      response.headers.get(
        "x-requests-used",
      ),

    last:
      response.headers.get(
        "x-requests-last",
      ),
  };

  if (!response.ok) {
    let apiMessage = "";
    let rawBody: unknown = null;

    try {
      rawBody =
        await response.json();

      console.error(
        "❌ Historical Odds API 完整錯誤：",
        rawBody,
      );

      if (
        rawBody &&
        typeof rawBody === "object"
      ) {
        const body =
          rawBody as {
            message?: string;
            error_code?: string;
          };

        apiMessage =
          body.message ??
          body.error_code ??
          "";
      }
    } catch (
      parseError
    ) {
      console.error(
        "❌ Historical Odds API 錯誤內容解析失敗：",
        parseError,
      );
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
    response: data,
    quota,
  };
}

/*
 * ==========================================
 * 同步 MLB 單日歷史盤口
 *
 * 已驗證流程：
 * Historical Odds
 * → 主客隊配對
 * → consensus
 * → mlb_match_history
 *
 * 預設 snapshot = 當日 12:00:00Z
 * ==========================================
 */

export async function syncMlbHistoricalOddsForDate(
  targetDate: string,
  customSnapshot?: string,
): Promise<MlbHistoricalOddsSyncResult> {
  if (
    !isValidDateString(
      targetDate,
    )
  ) {
    throw new Error(
      `日期格式錯誤：${targetDate}`,
    );
  }

  const snapshot =
    customSnapshot
      ? toHistoricalIsoTimestamp(
          customSnapshot,
        )
      : `${targetDate}T12:00:00Z`;

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

  const supabase =
    createAdminClient();

  const start =
    `${targetDate}T00:00:00.000Z`;

  const nextDate =
    new Date(
      `${targetDate}T00:00:00.000Z`,
    );

  nextDate.setUTCDate(
    nextDate.getUTCDate() + 1,
  );

  const end =
    nextDate.toISOString();

  const {
    data: historyData,
    error: historyError,
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
          ascending: true,
        },
      );

  if (historyError) {
    throw new Error(
      `讀取 mlb_match_history 失敗：${historyError.message}`,
    );
  }

  const historyRows =
    (
      historyData ?? []
    ) as HistoryRow[];

  /*
   * 這裡故意不因為某幾場已有盤口就跳過 API。
   * 「整天是否已完成」由之後的 month route 判斷。
   * 單日 service 的責任只有：
   * 呼叫一次 snapshot 並同步該日。
   */

  const {
    response: historical,
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

  let matched = 0;
  let updated = 0;
  let skipped = 0;

  const diagnostics:
    MlbHistoricalOddsSyncResult["diagnostics"] =
      [];

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
          ) === normalizedAway &&
          normalizeTeamName(
            game.home_team,
          ) === normalizedHome,
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

          return diffHours <= 18;
        },
      ) ??
      candidates[0];

    if (!oddsGame) {
      skipped += 1;

      diagnostics.push({
        gamePk: row.game_pk,
        matchup:
          `${row.away_team} vs ${row.home_team}`,
        matched: false,
        reason:
          "SNAPSHOT_NOT_FOUND",
      });

      continue;
    }

    matched += 1;

    const consensus =
      buildConsensus(
        oddsGame,
      );

    const hasAnyOdds =
      consensus.awayMoneyline !== null ||
      consensus.homeMoneyline !== null ||
      consensus.awaySpread !== null ||
      consensus.homeSpread !== null ||
      consensus.total !== null;

    if (!hasAnyOdds) {
      skipped += 1;

      diagnostics.push({
        gamePk: row.game_pk,
        matchup:
          `${row.away_team} vs ${row.home_team}`,
        matched: true,
        commenceTime:
          oddsGame.commence_time,
        reason:
          "MATCHED_BUT_NO_MARKET_DATA",
      });

      continue;
    }

    const {
      error: updateError,
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

    if (updateError) {
      throw new Error(
        `MLB ${row.game_pk} 更新歷史盤口失敗：${updateError.message}`,
      );
    }

    updated += 1;

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

  return {
    success: true,

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
  };
}