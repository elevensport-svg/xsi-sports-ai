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

function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTaiwanDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatTaiwanGameTime(gameDate: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(gameDate));
}

export function getTaiwanTomorrow(): Date {
  const taiwanToday = getTaiwanDateString(new Date());

  const tomorrow = new Date(`${taiwanToday}T00:00:00+08:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tomorrow;
}

export async function getMlbGamesByTaiwanDate(
  targetDate: Date,
): Promise<MlbScheduleGame[]> {
  const targetDateText = getTaiwanDateString(targetDate);

  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 1);

  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + 1);

  const params = new URLSearchParams({
    sportId: "1",
    startDate: formatDateForApi(startDate),
    endDate: formatDateForApi(endDate),
    hydrate: "probablePitcher,team,venue",
  });

  const url = `https://statsapi.mlb.com/api/v1/schedule?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      throw new Error(`MLB API 錯誤：${response.status}`);
    }

    const data = (await response.json()) as MlbScheduleResponse;

    const allGames = data.dates?.flatMap((date) => date.games) ?? [];

    return allGames.filter((game) => {
      return getTaiwanDateString(new Date(game.gameDate)) === targetDateText;
    });
  } catch (error) {
    console.error("取得 MLB 賽程失敗：", error);
    return [];
  }
}

export async function getTomorrowMlbGames(): Promise<MlbScheduleGame[]> {
  return getMlbGamesByTaiwanDate(getTaiwanTomorrow());
}
