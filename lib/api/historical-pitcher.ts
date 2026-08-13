export type HistoricalPitcherStats = {
  era: string;
  whip: string;

  strikeOuts: number;
  walks: number;

  inningsPitched: string;

  wins: number;
  losses: number;

  gamesPlayed: number;
  gamesStarted: number;

  hits: number;
  runs: number;
  earnedRuns: number;

  homeRuns: number;

  strikeOutWalkRatio:
    number;

  cutoffDate:
    string;

  startDate:
    string;

  endDate:
    string;
};

type MlbHistoricalPitcherStatsResponse = {
  stats?: Array<{
    splits?: Array<{
      stat?: {
        era?: string;
        whip?: string;

        strikeOuts?: number;
        baseOnBalls?: number;

        inningsPitched?: string;

        wins?: number;
        losses?: number;

        gamesPlayed?: number;
        gamesStarted?: number;

        hits?: number;
        runs?: number;
        earnedRuns?: number;

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

/* ==========================================
   MLB 球季開始日期

   歷史回測用。

   這裡故意從 3/01 開始抓，
   確保包含開季前後所有正式賽資料。

   MLB Stats API 最終只會回傳
   該球員實際存在的正式統計。
========================================== */

function getSeasonStartDate(
  season: number,
) {
  return `${season}-03-01`;
}

/* ==========================================
   數字工具
========================================== */

function safeNumber(
  value: unknown,
) {
  const number =
    Number(
      value,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}

/* ==========================================
   歷史投手資料

   重要：

   cutoffDate = 比賽日期

   例如：
   比賽 2026-07-10

   實際統計範圍：
   2026-03-01
   ~
   2026-07-09

   絕對不包含 7/10 當場比賽，
   避免 Look-Ahead Bias。
========================================== */

export async function getPitcherStatsBeforeDate(
  pitcherId:
    | number
    | undefined,

  cutoffDate:
    string,
): Promise<
  HistoricalPitcherStats | null
> {
  /*
   * ========================================
   * STEP 1
   * 檢查 pitcher
   * ========================================
   */

  if (
    !pitcherId
  ) {
    return null;
  }

  /*
   * ========================================
   * STEP 2
   * 檢查日期
   * ========================================
   */

  if (
    !isValidDateString(
      cutoffDate,
    )
  ) {
    console.error(
      `Historical Pitcher 日期格式錯誤：${cutoffDate}`,
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

  /*
   * 比賽前一天
   */
  const endDate =
    subtractOneDay(
      cutoffDate,
    );

  const startDate =
    getSeasonStartDate(
      season,
    );

  /*
   * 如果 cutoff 太早，
   * 還沒有任何可用數據。
   */
  if (
    endDate <
    startDate
  ) {
    return null;
  }

  /*
   * ========================================
   * STEP 3
   * MLB Stats API
   *
   * byDateRange：
   * 只取指定歷史區間。
   * ========================================
   */

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
    });

  const url =
    `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats?${params.toString()}`;

  try {
    const response =
      await fetch(
        url,
        {
          /*
           * 歷史資料不會改變，
           * 可以長時間 cache。
           */
          next: {
            revalidate:
              86400,
          },
        },
      );

    if (
      !response.ok
    ) {
      console.error(
        `Historical Pitcher API ${pitcherId} 錯誤：${response.status}`,
      );

      return null;
    }

    const data =
      (await response.json()) as MlbHistoricalPitcherStatsResponse;

    const stat =
      data.stats?.[0]
        ?.splits?.[0]
        ?.stat;

    /*
     * ========================================
     * 沒有歷史資料
     *
     * 例如：
     * 新秀當時尚未登板
     * ========================================
     */

    if (
      !stat
    ) {
      return null;
    }

    const strikeOuts =
      safeNumber(
        stat.strikeOuts,
      );

    const walks =
      safeNumber(
        stat.baseOnBalls,
      );

    const strikeOutWalkRatio =
      walks > 0
        ? Number(
            (
              strikeOuts /
              walks
            ).toFixed(
              2,
            ),
          )
        : strikeOuts;

    /*
     * ========================================
     * STEP 4
     * 回傳歷史時間點資料
     * ========================================
     */

    return {
      era:
        stat.era ??
        "-",

      whip:
        stat.whip ??
        "-",

      strikeOuts,

      walks,

      inningsPitched:
        stat.inningsPitched ??
        "-",

      wins:
        safeNumber(
          stat.wins,
        ),

      losses:
        safeNumber(
          stat.losses,
        ),

      gamesPlayed:
        safeNumber(
          stat.gamesPlayed,
        ),

      gamesStarted:
        safeNumber(
          stat.gamesStarted,
        ),

      hits:
        safeNumber(
          stat.hits,
        ),

      runs:
        safeNumber(
          stat.runs,
        ),

      earnedRuns:
        safeNumber(
          stat.earnedRuns,
        ),

      homeRuns:
        safeNumber(
          stat.homeRuns,
        ),

      strikeOutWalkRatio,

      cutoffDate,

      startDate,

      endDate,
    };
  } catch (
    error
  ) {
    console.error(
      `取得 Historical Pitcher ${pitcherId} 失敗：`,
      error,
    );

    return null;
  }
}