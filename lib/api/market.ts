import {
  getMlbOdds,
  type OddsBookmaker,
  type OddsGame,
  type OddsMarket,
} from "./odds";

export type MarketOutcome = {
  name: string;
  price: number;
  point?: number;
};

export type MarketBookmaker = {
  key: string;
  title: string;
  lastUpdate: string;
  moneyline: MarketOutcome[];
  spreads: MarketOutcome[];
  totals: MarketOutcome[];
};

export type MlbMarketData = {
  eventId: string;
  commenceTime: string;
  awayTeam: string;
  homeTeam: string;
  bookmakers: MarketBookmaker[];
  consensus: {
    awayMoneyline: number | null;
    homeMoneyline: number | null;
    awaySpread: number | null;
    homeSpread: number | null;
    total: number | null;
  };
};

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function getMarket(
  bookmaker: OddsBookmaker,
  key: "h2h" | "spreads" | "totals",
): OddsMarket | undefined {
  return bookmaker.markets.find((market) => market.key === key);
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return Number((total / values.length).toFixed(2));
}

function buildConsensus(
  game: OddsGame,
): MlbMarketData["consensus"] {
  const awayMoneylines: number[] = [];
  const homeMoneylines: number[] = [];
  const awaySpreads: number[] = [];
  const homeSpreads: number[] = [];
  const totals: number[] = [];

  for (const bookmaker of game.bookmakers) {
    const moneyline = getMarket(bookmaker, "h2h");
    const spreads = getMarket(bookmaker, "spreads");
    const totalMarket = getMarket(bookmaker, "totals");

    const awayMoneyline = moneyline?.outcomes.find(
      (outcome) => outcome.name === game.away_team,
    );

    const homeMoneyline = moneyline?.outcomes.find(
      (outcome) => outcome.name === game.home_team,
    );

    if (awayMoneyline) {
      awayMoneylines.push(awayMoneyline.price);
    }

    if (homeMoneyline) {
      homeMoneylines.push(homeMoneyline.price);
    }

    const awaySpread = spreads?.outcomes.find(
      (outcome) => outcome.name === game.away_team,
    );

    const homeSpread = spreads?.outcomes.find(
      (outcome) => outcome.name === game.home_team,
    );

    if (awaySpread?.point !== undefined) {
      awaySpreads.push(awaySpread.point);
    }

    if (homeSpread?.point !== undefined) {
      homeSpreads.push(homeSpread.point);
    }

    const over = totalMarket?.outcomes.find(
      (outcome) => outcome.name.toLowerCase() === "over",
    );

    if (over?.point !== undefined) {
      totals.push(over.point);
    }
  }

  return {
    awayMoneyline: average(awayMoneylines),
    homeMoneyline: average(homeMoneylines),
    awaySpread: average(awaySpreads),
    homeSpread: average(homeSpreads),
    total: average(totals),
  };
}

function mapBookmaker(
  bookmaker: OddsBookmaker,
): MarketBookmaker {
  return {
    key: bookmaker.key,
    title: bookmaker.title,
    lastUpdate: bookmaker.last_update,
    moneyline: getMarket(bookmaker, "h2h")?.outcomes ?? [],
    spreads: getMarket(bookmaker, "spreads")?.outcomes ?? [],
    totals: getMarket(bookmaker, "totals")?.outcomes ?? [],
  };
}

export async function getMlbMarketData(
  awayTeamName: string,
  homeTeamName: string,
): Promise<MlbMarketData | null> {
  try {
    const games = await getMlbOdds();
    const normalizedAway = normalizeTeamName(awayTeamName);
    const normalizedHome = normalizeTeamName(homeTeamName);

    const matchedGame = games.find((game) => {
      return (
        normalizeTeamName(game.away_team) === normalizedAway &&
        normalizeTeamName(game.home_team) === normalizedHome
      );
    });

    if (!matchedGame) {
      console.warn(
        `找不到盤口賽事：${awayTeamName} vs ${homeTeamName}`,
      );

      return null;
    }

    return {
      eventId: matchedGame.id,
      commenceTime: matchedGame.commence_time,
      awayTeam: matchedGame.away_team,
      homeTeam: matchedGame.home_team,
      bookmakers: matchedGame.bookmakers.map(mapBookmaker),
      consensus: buildConsensus(matchedGame),
    };
  } catch (error) {
    console.error("取得 MLB 盤口資料失敗：", error);
    return null;
  }
}