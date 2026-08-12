const API_KEY =
  process.env.ODDS_API_KEY!;

const BASE_URL =
  "https://api.the-odds-api.com/v4";

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

export async function getMlbOdds(): Promise<
  OddsGame[]
> {
  if (!API_KEY) {
    console.error(
      "找不到 ODDS_API_KEY",
    );

    return [];
  }

  const url =
    `${BASE_URL}/sports/baseball_mlb/odds` +
    `?apiKey=${API_KEY}` +
    `&regions=us` +
    `&markets=h2h,spreads,totals` +
    `&oddsFormat=american`;

  try {
    const res =
      await fetch(
        url,
        {
          next: {
            /*
             * 6 小時快取
             *
             * 15 場 MLB 分析共用同一份盤口，
             * 不要每場重新消耗 Odds API。
             */
            revalidate:
              21600,
          },
        },
      );

    if (!res.ok) {
      let message =
        `Odds API Error ${res.status}`;

      try {
        const errorData =
          await res.json();

        if (
          errorData?.message
        ) {
          message =
            `${message}: ${errorData.message}`;
        }
      } catch {
        // JSON 解析失敗就使用原本訊息
      }

      console.error(
        message,
      );

      /*
       * Odds API 掛掉或額度用完，
       * 不讓整個 MLB XSI 中斷。
       */
      return [];
    }

    const data =
      (await res.json()) as OddsGame[];

    console.log(
      `⚾ MLB Odds API 取得 ${data.length} 場`,
    );

    return Array.isArray(
      data,
    )
      ? data
      : [];
  } catch (error) {
    console.error(
      "取得 MLB Odds API 失敗:",
      error,
    );

    return [];
  }
}