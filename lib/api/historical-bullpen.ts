export type HistoricalBullpenStats = {
  era: number;
  whip: number;
  inningsPitched: number;
  strikeOuts: number;
  walks: number;
  saves: number;
  blownSaves: number;

  cutoffDate: string;
  startDate: string;
  endDate: string;
};

type MlbHistoricalBullpenResponse = {
  stats?: Array<{
    splits?: Array<{
      stat?: {
        era?: string;
        whip?: string;
        inningsPitched?: string;
        strikeOuts?: number;
        baseOnBalls?: number;
        saves?: number;
        blownSaves?: number;
      };
    }>;
  }>;
};

function toNumber(
  value:
    | string
    | number
    | undefined,
  fallback = 0,
): number {
  const result =
    Number(value);

  return Number.isFinite(
    result,
  )
    ? result
    : fallback;
}

function isValidDateString(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function subtractOneDay(
  dateString: string,
) {
  const date =
    new Date(
      `${dateString}T12:00:00Z`,
    );

  date.setUTCDate(
    date.getUTCDate() - 1,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function getSeasonStartDate(
  season: number,
) {
  return `${season}-03-01`;
}

/* ==========================================
   歷史牛棚資料

   cutoffDate = 比賽日期

   例如：
   2026-07-10

   實際抓：
   2026-03-01
   ~
   2026-07-09

   sitCodes=rp：
   僅保留 Relief Pitcher
========================================== */

export async function getBullpenStatsBeforeDate(
  teamId: number,
  cutoffDate: string,
): Promise<
  HistoricalBullpenStats | null
> {
  if (
    !teamId
  ) {
    return null;
  }

  if (
    !isValidDateString(
      cutoffDate,
    )
  ) {
    console.error(
      `Historical Bullpen 日期格式錯誤：${cutoffDate}`,
    );

    return null;
  }

  const season =
    Number(
      cutoffDate.slice(
        0,
        4,
      ),
    );

  if (
    !Number.isFinite(
      season,
    )
  ) {
    return null;
  }

  const startDate =
    getSeasonStartDate(
      season,
    );

  const endDate =
    subtractOneDay(
      cutoffDate,
    );

  if (
    endDate <
    startDate
  ) {
    return null;
  }

  const params =
    new URLSearchParams({
      stats:
        "byDateRange",

      group:
        "pitching",

      season:
        String(
          season,
        ),

      startDate,

      endDate,

      sitCodes:
        "rp",
    });

  const url =
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?${params.toString()}`;

  try {
    const response =
      await fetch(
        url,
        {
          next: {
            /*
             * 歷史資料固定，
             * 可以長時間 cache。
             */
            revalidate:
              86400,
          },
        },
      );

    if (
      !response.ok
    ) {
      console.error(
        `Historical Bullpen API ${teamId} 錯誤：${response.status}`,
      );

      return null;
    }

    const data =
      (await response.json()) as MlbHistoricalBullpenResponse;

    const stats =
      data.stats?.[0]
        ?.splits?.[0]
        ?.stat;

    if (
      !stats
    ) {
      return null;
    }

    return {
      era:
        toNumber(
          stats.era,
        ),

      whip:
        toNumber(
          stats.whip,
        ),

      inningsPitched:
        toNumber(
          stats.inningsPitched,
        ),

      strikeOuts:
        stats.strikeOuts ??
        0,

      walks:
        stats.baseOnBalls ??
        0,

      saves:
        stats.saves ??
        0,

      blownSaves:
        stats.blownSaves ??
        0,

      cutoffDate,

      startDate,

      endDate,
    };
  } catch (
    error
  ) {
    console.error(
      `取得 Historical Bullpen ${teamId} 失敗：`,
      error,
    );

    return null;
  }
}