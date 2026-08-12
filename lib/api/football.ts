export type FootballLeagueKey =
  | "soccer_epl"
  | "soccer_spain_la_liga"
  | "soccer_italy_serie_a"
  | "soccer_germany_bundesliga"
  | "soccer_france_ligue_one"
  | "soccer_uefa_champs_league"
  | "soccer_uefa_europa_league";

export type FootballLeague = {
  key: FootballLeagueKey;
  name: string;
  shortName: string;
};

export const FOOTBALL_LEAGUES: FootballLeague[] = [
  {
    key: "soccer_epl",
    name: "英格蘭超級聯賽",
    shortName: "英超",
  },
  {
    key: "soccer_spain_la_liga",
    name: "西班牙甲級聯賽",
    shortName: "西甲",
  },
  {
    key: "soccer_italy_serie_a",
    name: "義大利甲級聯賽",
    shortName: "義甲",
  },
  {
    key: "soccer_germany_bundesliga",
    name: "德國甲級聯賽",
    shortName: "德甲",
  },
  {
    key: "soccer_france_ligue_one",
    name: "法國甲級聯賽",
    shortName: "法甲",
  },
  {
    key: "soccer_uefa_champs_league",
    name: "歐洲冠軍聯賽",
    shortName: "歐冠",
  },
  {
    key: "soccer_uefa_europa_league",
    name: "歐洲聯賽",
    shortName: "歐霸",
  },
];

export type FootballOutcome = {
  name: string;
  price: number;
  point?: number;
};

export type FootballMarket = {
  key:
    | "h2h"
    | "spreads"
    | "totals";

  last_update?: string;

  outcomes: FootballOutcome[];
};

export type FootballBookmaker = {
  key: string;
  title: string;
  last_update?: string;
  markets: FootballMarket[];
};

export type FootballOddsEvent = {
  id: string;

  sport_key:
    FootballLeagueKey;

  sport_title: string;

  commence_time: string;

  home_team: string;

  away_team: string;

  bookmakers: FootballBookmaker[];
};

export type FootballConsensus = {
  homeWinOdds:
    number | null;

  drawOdds:
    number | null;

  awayWinOdds:
    number | null;

  homeSpread:
    number | null;

  awaySpread:
    number | null;

  overPoint:
    number | null;

  overOdds:
    number | null;

  underPoint:
    number | null;

  underOdds:
    number | null;
};

export type FootballGame = {
  id: string;

  leagueKey:
    FootballLeagueKey;

  leagueName: string;

  leagueShortName: string;

  commenceTime: string;

  homeTeam: string;

  awayTeam: string;

  bookmakers:
    FootballBookmaker[];

  consensus:
    FootballConsensus;
};

type OddsApiError = {
  message?: string;
  error_code?: string;
};

function getOddsApiKey() {
  const apiKey =
    process.env.ODDS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "找不到 ODDS_API_KEY，請確認 .env.local",
    );
  }

  return apiKey;
}

function getLeagueInfo(
  key:
    FootballLeagueKey,
) {
  return (
    FOOTBALL_LEAGUES.find(
      (league) =>
        league.key === key,
    ) ?? {
      key,
      name: key,
      shortName: key,
    }
  );
}

function average(
  values: number[],
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  const total =
    values.reduce(
      (
        sum,
        value,
      ) =>
        sum + value,
      0,
    );

  return Number(
    (
      total /
      values.length
    ).toFixed(3),
  );
}

function mostCommonPoint(
  values: number[],
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  const counts =
    new Map<
      number,
      number
    >();

  for (
    const value
    of values
  ) {
    counts.set(
      value,
      (
        counts.get(
          value,
        ) ?? 0
      ) + 1,
    );
  }

  let selected:
    number | null =
    null;

  let highestCount =
    0;

  for (
    const [
      value,
      count,
    ] of counts
  ) {
    if (
      count >
      highestCount
    ) {
      selected =
        value;

      highestCount =
        count;
    }
  }

  return selected;
}

function buildConsensus(
  event:
    FootballOddsEvent,
): FootballConsensus {
  const homeWinOdds:
    number[] = [];

  const drawOdds:
    number[] = [];

  const awayWinOdds:
    number[] = [];

  const homeSpreads:
    number[] = [];

  const awaySpreads:
    number[] = [];

  const overPoints:
    number[] = [];

  const underPoints:
    number[] = [];

  const overOdds:
    number[] = [];

  const underOdds:
    number[] = [];

  for (
    const bookmaker
    of event.bookmakers ??
      []
  ) {
    for (
      const market
      of bookmaker.markets ??
        []
    ) {
      if (
        market.key ===
        "h2h"
      ) {
        for (
          const outcome
          of market.outcomes ??
            []
        ) {
          const name =
            outcome.name
              .trim()
              .toLowerCase();

          if (
            outcome.name ===
            event.home_team
          ) {
            homeWinOdds.push(
              outcome.price,
            );

            continue;
          }

          if (
            outcome.name ===
            event.away_team
          ) {
            awayWinOdds.push(
              outcome.price,
            );

            continue;
          }

          if (
            name ===
              "draw" ||
            name ===
              "tie"
          ) {
            drawOdds.push(
              outcome.price,
            );
          }
        }
      }

      if (
        market.key ===
        "spreads"
      ) {
        for (
          const outcome
          of market.outcomes ??
            []
        ) {
          if (
            typeof outcome.point !==
            "number"
          ) {
            continue;
          }

          if (
            outcome.name ===
            event.home_team
          ) {
            homeSpreads.push(
              outcome.point,
            );

            continue;
          }

          if (
            outcome.name ===
            event.away_team
          ) {
            awaySpreads.push(
              outcome.point,
            );
          }
        }
      }

      if (
        market.key ===
        "totals"
      ) {
        for (
          const outcome
          of market.outcomes ??
            []
        ) {
          if (
            typeof outcome.point !==
            "number"
          ) {
            continue;
          }

          const name =
            outcome.name
              .trim()
              .toLowerCase();

          if (
            name ===
            "over"
          ) {
            overPoints.push(
              outcome.point,
            );

            overOdds.push(
              outcome.price,
            );

            continue;
          }

          if (
            name ===
            "under"
          ) {
            underPoints.push(
              outcome.point,
            );

            underOdds.push(
              outcome.price,
            );
          }
        }
      }
    }
  }

  return {
    homeWinOdds:
      average(
        homeWinOdds,
      ),

    drawOdds:
      average(
        drawOdds,
      ),

    awayWinOdds:
      average(
        awayWinOdds,
      ),

    homeSpread:
      mostCommonPoint(
        homeSpreads,
      ),

    awaySpread:
      mostCommonPoint(
        awaySpreads,
      ),

    overPoint:
      mostCommonPoint(
        overPoints,
      ),

    overOdds:
      average(
        overOdds,
      ),

    underPoint:
      mostCommonPoint(
        underPoints,
      ),

    underOdds:
      average(
        underOdds,
      ),
  };
}

function mapFootballGame(
  event:
    FootballOddsEvent,
): FootballGame {
  const league =
    getLeagueInfo(
      event.sport_key,
    );

  return {
    id:
      event.id,

    leagueKey:
      event.sport_key,

    leagueName:
      league.name,

    leagueShortName:
      league.shortName,

    commenceTime:
      event.commence_time,

    homeTeam:
      event.home_team,

    awayTeam:
      event.away_team,

    bookmakers:
      event.bookmakers ??
      [],

    consensus:
      buildConsensus(
        event,
      ),
  };
}

export function formatTaiwanFootballTime(
  commenceTime: string,
) {
  return new Intl.DateTimeFormat(
    "zh-TW",
    {
      timeZone:
        "Asia/Taipei",

      month:
        "numeric",

      day:
        "numeric",

      weekday:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false,
    },
  ).format(
    new Date(
      commenceTime,
    ),
  );
}

function isGameWithinNextHours(
  commenceTime: string,
  hours: number,
) {
  const gameTime =
    new Date(
      commenceTime,
    ).getTime();

  const now =
    Date.now();

  const end =
    now +
    hours *
      60 *
      60 *
      1000;

  return (
    gameTime >= now &&
    gameTime <= end
  );
}

async function fetchLeagueOdds(
  leagueKey:
    FootballLeagueKey,
): Promise<
  FootballOddsEvent[]
> {
  const apiKey =
    getOddsApiKey();

  const params =
    new URLSearchParams({
      apiKey,

      regions:
        "eu",

      markets:
        "h2h,spreads,totals",

      oddsFormat:
        "decimal",

      dateFormat:
        "iso",
    });

  const url =
    `https://api.the-odds-api.com/v4/sports/${leagueKey}/odds?${params.toString()}`;

  try {
    const response =
  await fetch(
    url,
    {
      next: {
        revalidate: 3600,
      },
    },
  );

    if (
      !response.ok
    ) {
      let apiError:
        OddsApiError | null =
        null;

      try {
        apiError =
          (await response.json()) as OddsApiError;
      } catch {
        apiError =
          null;
      }

      console.error(
        `Football Odds API ${leagueKey} 錯誤：`,
        {
          status:
            response.status,

          code:
            apiError
              ?.error_code,

          message:
            apiError
              ?.message,
        },
      );

      return [];
    }

    const data =
      (await response.json()) as FootballOddsEvent[];

    console.log(
      `⚽ ${leagueKey} API 回傳 ${Array.isArray(data) ? data.length : 0} 場`,
    );

    return Array.isArray(
      data,
    )
      ? data
      : [];
  } catch (error) {
    console.error(
      `Football Odds API ${leagueKey} 取得失敗：`,
      error,
    );

    return [];
  }
}

export async function getFootballGames(): Promise<
  FootballGame[]
> {
  const allGames:
    FootballGame[] = [];

  for (
    const league
    of FOOTBALL_LEAGUES
  ) {
    const events =
      await fetchLeagueOdds(
        league.key,
      );

    for (
      const event
      of events
    ) {
      allGames.push(
        mapFootballGame(
          event,
        ),
      );
    }
  }

  const uniqueGames =
    Array.from(
      new Map(
        allGames.map(
          (game) => [
            game.id,
            game,
          ],
        ),
      ).values(),
    );

  return uniqueGames.sort(
    (
      a,
      b,
    ) =>
      new Date(
        a.commenceTime,
      ).getTime() -
      new Date(
        b.commenceTime,
      ).getTime(),
  );
}

/* ==========================================
   未來 14 天足球賽事

   函式名稱暫時保留：
   getTomorrowFootballGames()

   這樣現有頁面與批次檔
   全部不用改 import。
========================================== */

export async function getTomorrowFootballGames(): Promise<
  FootballGame[]
> {
  const games =
    await getFootballGames();

  const upcomingGames =
    games.filter(
      (game) =>
        isGameWithinNextHours(
          game.commenceTime,
          336,
        ),
    );

  console.log(
    `⚽ Odds API 共取得 ${games.length} 場`,
  );

  console.log(
    `⚽ 未來 14 天符合條件 ${upcomingGames.length} 場`,
  );

  return upcomingGames;
}

export async function getFootballGameById(
  eventId: string,
): Promise<
  FootballGame | null
> {
  const games =
    await getFootballGames();

  return (
    games.find(
      (game) =>
        game.id ===
        eventId,
    ) ?? null
  );
}