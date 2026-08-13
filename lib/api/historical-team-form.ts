export type HistoricalTeamFormStats = {
  wins: number;
  losses: number;
  winRate: number;

  runsFor: number;
  runsAgainst: number;
  runDifference: number;

  streak: string;

  gamesCount: number;

  cutoffDate: string;
  startDate: string;
  endDate: string;
};

type ScheduleGame = {
  gameDate: string;

  status: {
    abstractGameState: string;
    detailedState: string;
  };

  teams: {
    away: {
      team: {
        id: number;
      };

      score?: number;
      isWinner?: boolean;
    };

    home: {
      team: {
        id: number;
      };

      score?: number;
      isWinner?: boolean;
    };
  };
};

type ScheduleResponse = {
  dates?: Array<{
    games: ScheduleGame[];
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

function formatApiDate(
  date: Date,
): string {
  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getUTCDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function subtractDays(
  dateString: string,
  days: number,
) {
  const date =
    new Date(
      `${dateString}T12:00:00Z`,
    );

  date.setUTCDate(
    date.getUTCDate() -
      days,
  );

  return formatApiDate(
    date,
  );
}

/* ==========================================
   連勝 / 連敗
========================================== */

function calculateStreak(
  results:
    Array<"W" | "L">,
): string {
  if (
    results.length === 0
  ) {
    return "-";
  }

  const latestResult =
    results[0];

  let count = 0;

  for (
    const result
    of results
  ) {
    if (
      result !==
      latestResult
    ) {
      break;
    }

    count += 1;
  }

  return `${latestResult}${count}`;
}

/* ==========================================
   歷史近期狀態

   cutoffDate = 比賽日期

   例如：
   比賽日 2026-07-10

   查詢範圍：
   2026-05-31 ~ 2026-07-09

   最後只取最近 10 場已完賽。
========================================== */

export async function getTeamRecentFormBeforeDate(
  teamId: number,
  cutoffDate: string,
): Promise<
  HistoricalTeamFormStats | null
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
      `Historical Team Form 日期格式錯誤：${cutoffDate}`,
    );

    return null;
  }

  /*
   * 開賽前一天
   */
  const endDate =
    subtractDays(
      cutoffDate,
      1,
    );

  /*
   * 多抓 40 天，
   * 再從中挑最近 10 場。
   */
  const startDate =
    subtractDays(
      cutoffDate,
      40,
    );

  const params =
    new URLSearchParams({
      sportId:
        "1",

      teamId:
        String(
          teamId,
        ),

      startDate,

      endDate,
    });

  const url =
    `https://statsapi.mlb.com/api/v1/schedule?${params.toString()}`;

  try {
    const response =
      await fetch(
        url,
        {
          next: {
            revalidate:
              86400,
          },
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `Historical Team Form 取得失敗：${response.status}`,
      );
    }

    const data =
      (await response.json()) as ScheduleResponse;

    const completedGames =
      data.dates
        ?.flatMap(
          (date) =>
            date.games,
        )
        .filter(
          (game) =>
            game.status
              .abstractGameState ===
            "Final",
        )
        .sort(
          (
            a,
            b,
          ) =>
            new Date(
              b.gameDate,
            ).getTime() -
            new Date(
              a.gameDate,
            ).getTime(),
        )
        .slice(
          0,
          10,
        ) ??
      [];

    if (
      completedGames.length ===
      0
    ) {
      return null;
    }

    let wins = 0;
    let losses = 0;

    let runsFor = 0;
    let runsAgainst = 0;

    const results:
      Array<
        "W" | "L"
      > = [];

    for (
      const game
      of completedGames
    ) {
      const isAway =
        game.teams.away
          .team.id ===
        teamId;

      const teamData =
        isAway
          ? game.teams.away
          : game.teams.home;

      const opponentData =
        isAway
          ? game.teams.home
          : game.teams.away;

      const teamScore =
        teamData.score ??
        0;

      const opponentScore =
        opponentData.score ??
        0;

      runsFor +=
        teamScore;

      runsAgainst +=
        opponentScore;

      if (
        teamScore >
        opponentScore
      ) {
        wins += 1;

        results.push(
          "W",
        );
      } else {
        losses +=
          1;

        results.push(
          "L",
        );
      }
    }

    const gamesCount =
      wins +
      losses;

    return {
      wins,

      losses,

      gamesCount,

      winRate:
        gamesCount > 0
          ? Number(
              (
                (
                  wins /
                  gamesCount
                ) *
                100
              ).toFixed(
                1,
              ),
            )
          : 0,

      runsFor,

      runsAgainst,

      runDifference:
        runsFor -
        runsAgainst,

      streak:
        calculateStreak(
          results,
        ),

      cutoffDate,

      startDate,

      endDate,
    };
  } catch (
    error
  ) {
    console.error(
      `取得 Historical Team Form ${teamId} 失敗：`,
      error,
    );

    return null;
  }
}