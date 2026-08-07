export type RecentGameResult = {
  gamePk: number;
  date: string;
  opponentId: number;
  opponentName: string;
  isHome: boolean;
  teamScore: number;
  opponentScore: number;
  result: "W" | "L";
};

export type RecentGamesSummary = {
  games: RecentGameResult[];
  wins: number;
  losses: number;
  averageRunsScored: number;
  averageRunsAllowed: number;
  streak: string;
};

type MlbScheduleResponse = {
  dates?: Array<{
    games?: Array<{
      gamePk: number;
      gameDate: string;
      status: {
        abstractGameState: string;
      };
      teams: {
        away: {
          score?: number;
          team: {
            id: number;
            name: string;
          };
        };
        home: {
          score?: number;
          team: {
            id: number;
            name: string;
          };
        };
      };
    }>;
  }>;
};

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateStreak(
  games: RecentGameResult[],
): string {
  if (games.length === 0) {
    return "-";
  }

  const latestResult = games[0].result;
  let count = 0;

  for (const game of games) {
    if (game.result !== latestResult) {
      break;
    }

    count += 1;
  }

  return `${latestResult}${count}`;
}

export async function getTeamRecentGames(
  teamId: number,
  limit = 10,
): Promise<RecentGamesSummary> {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setDate(startDate.getDate() - 40);

  const params = new URLSearchParams({
    sportId: "1",
    teamId: String(teamId),
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    hydrate: "team",
  });

  const url =
    `https://statsapi.mlb.com/api/v1/schedule?` +
    params.toString();

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      throw new Error(
        `取得近況比賽失敗：${response.status}`,
      );
    }

    const data = (await response.json()) as MlbScheduleResponse;

    const completedGames =
      data.dates
        ?.flatMap((date) => date.games ?? [])
        .filter(
          (game) =>
            game.status.abstractGameState === "Final",
        )
        .sort(
          (a, b) =>
            new Date(b.gameDate).getTime() -
            new Date(a.gameDate).getTime(),
        )
        .slice(0, limit) ?? [];

    const games: RecentGameResult[] =
      completedGames.map((game) => {
        const isHome =
          game.teams.home.team.id === teamId;

        const team = isHome
          ? game.teams.home
          : game.teams.away;

        const opponent = isHome
          ? game.teams.away
          : game.teams.home;

        const teamScore = team.score ?? 0;
        const opponentScore = opponent.score ?? 0;

        return {
          gamePk: game.gamePk,
          date: game.gameDate,
          opponentId: opponent.team.id,
          opponentName: opponent.team.name,
          isHome,
          teamScore,
          opponentScore,
          result:
            teamScore > opponentScore ? "W" : "L",
        };
      });

    const wins = games.filter(
      (game) => game.result === "W",
    ).length;

    const losses = games.length - wins;

    const runsScored = games.reduce(
      (sum, game) => sum + game.teamScore,
      0,
    );

    const runsAllowed = games.reduce(
      (sum, game) => sum + game.opponentScore,
      0,
    );

    return {
      games,
      wins,
      losses,
      averageRunsScored:
        games.length > 0
          ? Number(
              (runsScored / games.length).toFixed(1),
            )
          : 0,
      averageRunsAllowed:
        games.length > 0
          ? Number(
              (runsAllowed / games.length).toFixed(1),
            )
          : 0,
      streak: calculateStreak(games),
    };
  } catch (error) {
    console.error(
      `取得球隊 ${teamId} 近十場比分失敗：`,
      error,
    );

    return {
      games: [],
      wins: 0,
      losses: 0,
      averageRunsScored: 0,
      averageRunsAllowed: 0,
      streak: "-",
    };
  }
}