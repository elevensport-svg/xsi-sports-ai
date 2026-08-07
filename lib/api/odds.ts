const API_KEY = process.env.ODDS_API_KEY!;

const BASE_URL = "https://api.the-odds-api.com/v4";

export type OddsMarket = {
  key: string;
  last_update: string;
  outcomes: {
    name: string;
    price: number;
    point?: number;
  }[];
};

export type OddsBookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
};

export type OddsGame = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
};

export async function getMlbOdds() {
  const url =
    `${BASE_URL}/sports/baseball_mlb/odds` +
    `?apiKey=${API_KEY}` +
    `&regions=us` +
    `&markets=h2h,spreads,totals` +
    `&oddsFormat=american`;

  const res = await fetch(url, {
    next: {
      revalidate: 60,
    },
  });

  if (!res.ok) {
    throw new Error(`Odds API Error ${res.status}`);
  }

  return (await res.json()) as OddsGame[];
}