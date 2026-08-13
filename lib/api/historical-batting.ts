export type HistoricalTeamBattingStats = {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  runs: number;
  homeRuns: number;

  cutoffDate: string;
  startDate: string;
  endDate: string;
};

type MlbHistoricalBattingResponse = {
  stats?: Array<{
    splits?: Array<{
      stat?: {
        avg?: string | number;
        obp?: string | number;
        slg?: string | number;
        ops?: string | number;
        runs?: number;
        homeRuns?: number;
      };
    }>;
  }>;
};

/* ==========================================
   日期工具
========================================== */

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
    .slice(
      0,
      10,
    );
}

function getSeasonStartDate(
  season: number,
) {
  return `${season}-03-01`;
}

/* ==========================================
   數值工具
========================================== */

function safeNumber(
  value: unknown,
) {
  const parsed =
    Number(
      value,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

/* ==========================================
   歷史球隊打擊數據

   cutoffDate = 比賽日期

   例如：
   比賽 2026-07-10

   實際抓取：
   2026-03-01
   ~
   2026-07-09

   不包含比賽當日與未來資料
========================================== */

export async function getTeamBattingStatsBeforeDate(
  teamId: number,
  cutoffDate: string,
): Promise<
  HistoricalTeamBattingStats | null
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
      `Historical Batting 日期格式錯誤：${cutoffDate}`,
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

  /* ========================================
     MLB Stats API

     byDateRange：
     只取得指定日期範圍內的累積打擊資料
  ======================================== */

  const params =
    new URLSearchParams({
      stats:
        "byDateRange",

      group:
        "hitting",

      season:
        String(
          season,
        ),

      startDate,

      endDate,
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
             * 歷史資料基本固定，
             * 可長時間快取
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
        `Historical Batting API ${teamId} 錯誤：${response.status}`,
      );

      return null;
    }

    const data =
      (await response.json()) as MlbHistoricalBattingResponse;

    const stat =
      data.stats?.[0]
        ?.splits?.[0]
        ?.stat;

    if (
      !stat
    ) {
      return null;
    }

    return {
      avg:
        safeNumber(
          stat.avg,
        ),

      obp:
        safeNumber(
          stat.obp,
        ),

      slg:
        safeNumber(
          stat.slg,
        ),

      ops:
        safeNumber(
          stat.ops,
        ),

      runs:
        safeNumber(
          stat.runs,
        ),

      homeRuns:
        safeNumber(
          stat.homeRuns,
        ),

      cutoffDate,

      startDate,

      endDate,
    };
  } catch (
    error
  ) {
    console.error(
      `取得 Historical Batting ${teamId} 失敗：`,
      error,
    );

    return null;
  }
}