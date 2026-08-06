import GameCard from "./GameCard";

type MlbGame = {
  gamePk: number;
  gameDate: string;
  status: {
    detailedState: string;
  };
  teams: {
    away: {
      team: {
        name: string;
      };
    };
    home: {
      team: {
        name: string;
      };
    };
  };
};

type MlbScheduleResponse = {
  dates?: Array<{
    games: MlbGame[];
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTaiwanTomorrow() {
  const now = new Date();

  const taiwanTodayText = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const tomorrow = new Date(`${taiwanTodayText}T00:00:00+08:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return tomorrow;
}

function formatTaiwanTime(gameDate: string) {
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

async function getTomorrowGames(): Promise<MlbGame[]> {
  const tomorrow = getTaiwanTomorrow();
  const targetDate = formatDate(tomorrow);

  // 多抓前後一天，再依台灣時間過濾，避免美國與台灣日期不同。
  const startDate = new Date(tomorrow);
  startDate.setDate(startDate.getDate() - 1);

  const endDate = new Date(tomorrow);
  endDate.setDate(endDate.getDate() + 1);

  const url =
    "https://statsapi.mlb.com/api/v1/schedule" +
    `?sportId=1` +
    `&startDate=${formatDate(startDate)}` +
    `&endDate=${formatDate(endDate)}`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      throw new Error(`MLB API 回傳錯誤：${response.status}`);
    }

    const data = (await response.json()) as MlbScheduleResponse;

    const games = data.dates?.flatMap((date) => date.games) ?? [];

    return games.filter((game) => {
      return formatDate(new Date(game.gameDate)) === targetDate;
    });
  } catch (error) {
    console.error("取得 MLB 賽程失敗：", error);
    return [];
  }
}

export default async function MlbTomorrowGames() {
  const games = await getTomorrowGames();

  if (games.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-8">
        <p className="font-bold text-yellow-400">
          目前查不到明日 MLB 賽程
        </p>

        <p className="mt-2 text-sm text-zinc-400">
          可能是休兵日、賽程尚未更新，或 MLB API 暫時無法連線。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-3">
      {games.map((game) => (
        <GameCard
          key={game.gamePk}
          league="MLB"
          awayTeam={game.teams.away.team.name}
          homeTeam={game.teams.home.team.name}
          time={formatTaiwanTime(game.gameDate)}
          status={game.status.detailedState}
        />
      ))}
    </div>
  );
}