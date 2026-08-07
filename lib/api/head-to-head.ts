export type HeadToHeadGame = {
  gamePk: number;
  date: string;

  awayTeamId: number;
  awayTeamName: string;
  awayScore: number;

  homeTeamId: number;
  homeTeamName: string;
  homeScore: number;

  winnerTeamId: number | null;
};

export type HeadToHeadSummary = {
  games: HeadToHeadGame[];

  teamAWins: number;
  teamBWins: number;

  teamAAverageRuns: number;
  teamBAverageRuns: number;

  latestGame: HeadToHeadGame | null;
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

function emptySummary(): HeadToHeadSummary {
  return {
    games: [],
    teamAWins: 0,
    teamBWins: 0,
    teamAAverageRuns: 0,
    teamBAverageRuns: 0,
    latestGame: null,
  };
}

export async function getHeadToHeadGames(
  teamAId: number,
  teamBId: number,
  limit = 10,
): Promise<HeadToHeadSummary> {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setFullYear(startDate.getFullYear() - 3);

  const params = new URLSearchParams({
    sportId: "1",
    teamId: String(teamAId),
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
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      throw new Error(
        `取得 H2H 資料失敗：${response.status}`,
      );
    }

    const data = (await response.json()) as MlbScheduleResponse;

    const games =
      data.dates
        ?.flatMap((date) => date.games ?? [])
        .filter(
          (game) =>
            game.status.abstractGameState === "Final",
        )
        .filter((game) => {
          const awayId = game.teams.away.team.id;
          const homeId = game.teams.home.team.id;

          return (
            (awayId === teamAId && homeId === teamBId) ||
            (awayId === teamBId && homeId === teamAId)
          );
        })
        .sort(
          (a, b) =>
            new Date(b.gameDate).getTime() -
            new Date(a.gameDate).getTime(),
        )
        .slice(0, limit)
        .map<HeadToHeadGame>((game) => {
          const awayScore = game.teams.away.score ?? 0;
          const homeScore = game.teams.home.score ?? 0;

          const winnerTeamId =
            awayScore === homeScore
              ? null
              : awayScore > homeScore
                ? game.teams.away.team.id
                : game.teams.home.team.id;

          return {
            gamePk: game.gamePk,
            date: game.gameDate,

            awayTeamId: game.teams.away.team.id,
            awayTeamName: game.teams.away.team.name,
            awayScore,

            homeTeamId: game.teams.home.team.id,
            homeTeamName: game.teams.home.team.name,
            homeScore,

            winnerTeamId,
          };
        }) ?? [];

    if (games.length === 0) {
      return emptySummary();
    }

    const teamAWins = games.filter(
      (game) => game.winnerTeamId === teamAId,
    ).length;

    const teamBWins = games.filter(
      (game) => game.winnerTeamId === teamBId,
    ).length;

    const teamARuns = games.reduce((sum, game) => {
      return (
        sum +
        (game.awayTeamId === teamAId
          ? game.awayScore
          : game.homeScore)
      );
    }, 0);

    const teamBRuns = games.reduce((sum, game) => {
      return (
        sum +
        (game.awayTeamId === teamBId
          ? game.awayScore
          : game.homeScore)
      );
    }, 0);

    return {
      games,
      teamAWins,
      teamBWins,

      teamAAverageRuns: Number(
        (teamARuns / games.length).toFixed(1),
      ),

      teamBAverageRuns: Number(
        (teamBRuns / games.length).toFixed(1),
      ),

      latestGame: games[0] ?? null,
    };
  } catch (error) {
    console.error(
      `取得球隊 ${teamAId} 與 ${teamBId} H2H 失敗：`,
      error,
    );

    return emptySummary();
  }
}