export function getMlbDisplayDate(): Date {
  const now = new Date();

  const taiwanDate =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

  const taiwanHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );

  const displayDate =
    new Date(`${taiwanDate}T00:00:00+08:00`);

  // 台灣時間下午 3 點後切換成隔日
  if (taiwanHour >= 15) {
    displayDate.setDate(
      displayDate.getDate() + 1,
    );
  }

  return displayDate;
}

export function isMlbTomorrowSchedule(): boolean {
  const now = new Date();

  const taiwanHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );

  return taiwanHour >= 15;
}

export async function getCurrentMlbSchedule(): Promise<MlbScheduleGame[]> {
  return getMlbGamesByTaiwanDate(
    getMlbDisplayDate(),
  );
}
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

type MlbGameResponse = {
  gamePk?: number;
  gameDate?: string;
  officialDate?: string;

  status?: {
    abstractGameState?: string;
    detailedState?: string;
  };

  teams?: {
    away?: {
      team?: MlbTeamReference;
      probablePitcher?: MlbPitcher;
    };

    home?: {
      team?: MlbTeamReference;
      probablePitcher?: MlbPitcher;
    };
  };

  venue?: {
    id: number;
    name: string;
  };
};

function formatDateForApi(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTaiwanDateString(
  date: Date,
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

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

export function getTaiwanTomorrow(): Date {
  const taiwanToday =
    getTaiwanDateString(
      new Date(),
    );

  const tomorrow =
    new Date(
      `${taiwanToday}T00:00:00+08:00`,
    );

  tomorrow.setDate(
    tomorrow.getDate() + 1,
  );

  return tomorrow;
}

export async function getMlbGamesByTaiwanDate(
  targetDate: Date,
): Promise<MlbScheduleGame[]> {
  const targetDateText =
    getTaiwanDateString(
      targetDate,
    );

  const startDate =
    new Date(targetDate);

  startDate.setDate(
    startDate.getDate() - 1,
  );

  const endDate =
    new Date(targetDate);

  endDate.setDate(
    endDate.getDate() + 1,
  );

  const params =
    new URLSearchParams({
      sportId: "1",

      startDate:
        formatDateForApi(
          startDate,
        ),

      endDate:
        formatDateForApi(
          endDate,
        ),

      hydrate:
        "probablePitcher,team,venue",
    });

  const url =
    `https://statsapi.mlb.com/api/v1/schedule?${params.toString()}`;

  try {
    const response =
      await fetch(
        url,
        {
          next: {
            revalidate: 300,
          },
        },
      );

    if (!response.ok) {
      throw new Error(
        `MLB API 錯誤：${response.status}`,
      );
    }

    const data =
      (await response.json()) as MlbScheduleResponse;

    const allGames =
      data.dates?.flatMap(
        (date) =>
          date.games,
      ) ?? [];

    return allGames.filter(
      (game) => {
        return (
          getTaiwanDateString(
            new Date(
              game.gameDate,
            ),
          ) ===
          targetDateText
        );
      },
    );
  } catch (error) {
    console.error(
      "取得 MLB 賽程失敗：",
      error,
    );

    return [];
  }
}

export async function getTomorrowMlbGames(): Promise<MlbScheduleGame[]> {
  return getMlbGamesByTaiwanDate(
    getTaiwanTomorrow(),
  );
}

/* ==========================================
   直接用 Game PK 取得單場 MLB 賽事
========================================== */

export async function getMlbGameByPk(
  gamePk: string | number,
): Promise<MlbScheduleGame | null> {
  const url =
    `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

  try {
    const response =
      await fetch(
        url,
        {
          next: {
            revalidate: 300,
          },
        },
      );

    if (!response.ok) {
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