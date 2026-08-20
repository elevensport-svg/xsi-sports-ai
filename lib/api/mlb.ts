export type MlbTeamReference = {
  id: number;
  name: string;
};

export type MlbPitcher = {
  id: number;
  fullName: string;
  link?: string;
};

export type MlbScheduleGame = {
  gamePk: number;
  gameDate: string;
  officialDate: string;

  status: {
    abstractGameState: string;
    detailedState: string;
  };

  teams: {
    away: {
      team: MlbTeamReference;
      probablePitcher?: MlbPitcher;
    };

    home: {
      team: MlbTeamReference;
      probablePitcher?: MlbPitcher;
    };
  };

  venue?: {
    id: number;
    name: string;
  };
};

type MlbScheduleResponse = {
  dates?: Array<{
    date: string;
    games: MlbScheduleGame[];
  }>;
};

/*
 * ==========================================
 * Taiwan Date Helpers
 * ==========================================
 */

export function getTaiwanDateString(
  date: Date,
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

function getTaiwanHour(
  date: Date = new Date(),
): number {
  return Number(
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Taipei",
        hour: "2-digit",
        hour12: false,
      },
    ).format(date),
  );
}

/*
 * ==========================================
 * yyyy-mm-dd + days
 *
 * 完全使用 UTC 做純日期運算，
 * 避免 Vercel / Windows timezone 不一致
 * ==========================================
 */
function addDaysToDateString(
  dateString: string,
  days: number,
): string {
  const [
    year,
    month,
    day,
  ] = dateString
    .split("-")
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  date.setUTCDate(
    date.getUTCDate() +
      days,
  );

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() +
        1,
    ).padStart(
      2,
      "0",
    ),
    String(
      date.getUTCDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join("-");
}

/*
 * ==========================================
 * MLB 首頁顯示日期
 *
 * 台灣時間：
 * 00:00 ~ 14:59 → 今天
 * 15:00 ~ 23:59 → 明天
 * ==========================================
 */
export function getMlbDisplayDate(): Date {
  const now =
    new Date();

  const taiwanToday =
    getTaiwanDateString(
      now,
    );

  const taiwanHour =
    getTaiwanHour(now);

  const targetDateText =
    taiwanHour >= 15
      ? addDaysToDateString(
          taiwanToday,
          1,
        )
      : taiwanToday;

  return new Date(
    `${targetDateText}T12:00:00+08:00`,
  );
}

export function isMlbTomorrowSchedule(): boolean {
  return (
    getTaiwanHour() >=
    15
  );
}

/*
 * ==========================================
 * 台灣明天
 * ==========================================
 */
export function getTaiwanTomorrow(): Date {
  const taiwanToday =
    getTaiwanDateString(
      new Date(),
    );

  const tomorrowText =
    addDaysToDateString(
      taiwanToday,
      1,
    );

  return new Date(
    `${tomorrowText}T12:00:00+08:00`,
  );
}

/*
 * ==========================================
 * MLB 時間顯示
 * ==========================================
 */
export function formatTaiwanGameTime(
  gameDate: string,
): string {
  return new Intl.DateTimeFormat(
    "zh-TW",
    {
      timeZone:
        "Asia/Taipei",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(
    new Date(gameDate),
  );
}

/*
 * ==========================================
 * 依台灣日期取得 MLB 賽程
 * ==========================================
 */
export async function getMlbGamesByTaiwanDate(
  targetDate: Date,
): Promise<MlbScheduleGame[]> {
  const targetDateText =
    getTaiwanDateString(
      targetDate,
    );

  /*
   * MLB API 的日期主要依美國官方日期。
   *
   * 台灣日期可能跨到前一個美國日期，
   * 所以一次抓前後各一天。
   */
  const startDate =
    addDaysToDateString(
      targetDateText,
      -1,
    );

  const endDate =
    addDaysToDateString(
      targetDateText,
      1,
    );

  const params =
    new URLSearchParams({
      sportId: "1",

      startDate,

      endDate,

      hydrate:
        "probablePitcher,team,venue",
    });

  const url =
    `https://statsapi.mlb.com/api/v1/schedule?${params.toString()}`;

  try {
    console.log(
      "======================================",
    );

    console.log(
      "⚾ MLB Schedule Query",
    );

    console.log(
      `台灣目標日期：${targetDateText}`,
    );

    console.log(
      `MLB API 查詢：${startDate} ~ ${endDate}`,
    );

    const response =
      await fetch(
        url,
        {
          cache: "no-store",
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `MLB API 錯誤：${response.status}`,
      );
    }

    const data =
      (await response.json()) as MlbScheduleResponse;

    const allGames =
      data.dates?.flatMap(
        (date) =>
          date.games ?? [],
      ) ?? [];

    console.log(
      `MLB API 原始場數：${allGames.length}`,
    );

    const filteredGames =
      allGames.filter(
        (game) => {
          if (
            !game.gameDate
          ) {
            return false;
          }

          const gameTaiwanDate =
            getTaiwanDateString(
              new Date(
                game.gameDate,
              ),
            );

          return (
            gameTaiwanDate ===
            targetDateText
          );
        },
      );

    console.log(
      `台灣 ${targetDateText} 賽事：${filteredGames.length}`,
    );

    console.log(
      "======================================",
    );

    return filteredGames;
  } catch (error) {
    console.error(
      "取得 MLB 賽程失敗：",
      error,
    );

    return [];
  }
}

/*
 * ==========================================
 * 取得目前 MLB 顯示日
 * ==========================================
 */
export async function getCurrentMlbSchedule(): Promise<MlbScheduleGame[]> {
  const displayDate =
    getMlbDisplayDate();

  console.log(
    `⚾ MLB 顯示日期：${getTaiwanDateString(
      displayDate,
    )}`,
  );

  return getMlbGamesByTaiwanDate(
    displayDate,
  );
}

/*
 * ==========================================
 * 明日 MLB
 * ==========================================
 */
export async function getTomorrowMlbGames(): Promise<MlbScheduleGame[]> {
  return getMlbGamesByTaiwanDate(
    getTaiwanTomorrow(),
  );
}

/*
 * ==========================================
 * 直接用 Game PK 取得單場 MLB 賽事
 * ==========================================
 */
export async function getMlbGameByPk(
  gamePk:
    | string
    | number,
): Promise<MlbScheduleGame | null> {
  const url =
    `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

  try {
    const response =
      await fetch(
        url,
        {
          cache: "no-store",
        },
      );

    if (
      !response.ok
    ) {
      console.error(
        "MLB Game API 錯誤：",
        response.status,
      );

      return null;
    }

    const raw =
      await response.json();

    const gameData =
      raw?.gameData;

    if (
      !gameData?.game ||
      !gameData?.teams
    ) {
      return null;
    }

    const awayTeam =
      gameData.teams.away;

    const homeTeam =
      gameData.teams.home;

    const probablePitchers =
      gameData.probablePitchers;

    const result: MlbScheduleGame =
      {
        gamePk:
          Number(
            gameData.game
              .pk ??
              gamePk,
          ),

        gameDate:
          gameData.datetime
            ?.dateTime ??
          "",

        officialDate:
          gameData.datetime
            ?.officialDate ??
          "",

        status: {
          abstractGameState:
            gameData.status
              ?.abstractGameState ??
            "",

          detailedState:
            gameData.status
              ?.detailedState ??
            "",
        },

        teams: {
          away: {
            team: {
              id:
                awayTeam.id,

              name:
                awayTeam.name,
            },

            probablePitcher:
              probablePitchers
                ?.away
                ? {
                    id:
                      probablePitchers
                        .away.id,

                    fullName:
                      probablePitchers
                        .away
                        .fullName,

                    link:
                      probablePitchers
                        .away.link,
                  }
                : undefined,
          },

          home: {
            team: {
              id:
                homeTeam.id,

              name:
                homeTeam.name,
            },

            probablePitcher:
              probablePitchers
                ?.home
                ? {
                    id:
                      probablePitchers
                        .home.id,

                    fullName:
                      probablePitchers
                        .home
                        .fullName,

                    link:
                      probablePitchers
                        .home.link,
                  }
                : undefined,
          },
        },

        venue:
          gameData.venue
            ? {
                id:
                  gameData.venue.id,

                name:
                  gameData.venue.name,
              }
            : undefined,
      };

    return result;
  } catch (error) {
    console.error(
      "取得 MLB 單場比賽失敗：",
      error,
    );

    return null;
  }
}
/*
 * ==========================================
 * MLB 正式完賽比分
 *
 * 給 prediction settlement 使用。
 * 直接依 Game PK 查 MLB 官方 live feed，
 * 只有比賽已正式結束才回傳比分。
 * ==========================================
 */
export type MlbFinalScore = {
  gamePk: number;
  gameDate: string;
  officialDate: string;

  status: {
    abstractGameState: string;
    detailedState: string;
  };

  awayTeam: MlbTeamReference;
  homeTeam: MlbTeamReference;

  awayScore: number;
  homeScore: number;
};

function isMlbFinalStatus(
  abstractGameState: string,
  detailedState: string,
): boolean {
  const abstractState =
    abstractGameState
      .trim()
      .toLowerCase();

  const detailed =
    detailedState
      .trim()
      .toLowerCase();

  if (
    abstractState ===
    "final"
  ) {
    return true;
  }

  return (
    detailed === "final" ||
    detailed === "game over" ||
    detailed.includes(
      "completed early",
    )
  );
}

export async function getMlbFinalScoreByGamePk(
  gamePk:
    | string
    | number,
): Promise<MlbFinalScore | null> {
  const url =
    `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

  try {
    const response =
      await fetch(
        url,
        {
          cache: "no-store",
        },
      );

    if (
      !response.ok
    ) {
      console.error(
        "MLB Final Score API 錯誤：",
        response.status,
      );

      return null;
    }

    const raw =
      await response.json();

    const gameData =
      raw?.gameData;

    const linescore =
      raw?.liveData?.linescore;

    if (
      !gameData?.game ||
      !gameData?.teams ||
      !linescore?.teams
    ) {
      return null;
    }

    const abstractGameState =
      String(
        gameData.status
          ?.abstractGameState ??
          "",
      );

    const detailedState =
      String(
        gameData.status
          ?.detailedState ??
          "",
      );

    if (
      !isMlbFinalStatus(
        abstractGameState,
        detailedState,
      )
    ) {
      return null;
    }

    const awayScore =
      Number(
        linescore.teams
          ?.away?.runs,
      );

    const homeScore =
      Number(
        linescore.teams
          ?.home?.runs,
      );

    if (
      !Number.isFinite(
        awayScore,
      ) ||
      !Number.isFinite(
        homeScore,
      )
    ) {
      return null;
    }

    const awayTeam =
      gameData.teams.away;

    const homeTeam =
      gameData.teams.home;

    return {
      gamePk:
        Number(
          gameData.game.pk ??
            gamePk,
        ),

      gameDate:
        gameData.datetime
          ?.dateTime ??
        "",

      officialDate:
        gameData.datetime
          ?.officialDate ??
        "",

      status: {
        abstractGameState,
        detailedState,
      },

      awayTeam: {
        id:
          Number(
            awayTeam.id,
          ),
        name:
          String(
            awayTeam.name ??
              "",
          ),
      },

      homeTeam: {
        id:
          Number(
            homeTeam.id,
          ),
        name:
          String(
            homeTeam.name ??
              "",
          ),
      },

      awayScore,
      homeScore,
    };
  } catch (error) {
    console.error(
      "取得 MLB 正式完賽比分失敗：",
      error,
    );

    return null;
  }
}