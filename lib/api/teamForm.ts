export type TeamFormStats = {
  wins: number;
  losses: number;
  winRate: number;
  runsFor: number;
  runsAgainst: number;
  runDifference: number;
  streak: string;
  gamesCount: number;
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

function formatApiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateStreak(
  results: Array<"W" | "L">,
): string {
  if (results.length === 0) {
    return "-";
  }

  const latestResult = results[0];

  let count = 0;

  for (const result of results) {
    if (result !== latestResult) {
      break;
    }

    count += 1;
  }

  return `${latestResult}${count}`;
}

export async function getTeamRecentForm(
  teamId: number,
): Promise<TeamFormStats | null> {
  const endDate = new Date();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 40);

  const params = new URLSearchParams({
    sportId: "1",
    teamId: String(teamId),
    startDate: formatApiDate(startDate),
    endDate: formatApiDate(endDate),
  });

  const url =
    `https://statsapi.mlb.com/api/v1/schedule?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      throw new Error(`近期戰績取得失敗：${response.status}`);
    }

    const data = (await response.json()) as ScheduleResponse;

    const completedGames =
      data.dates
        ?.flatMap((date) => date.games)
        .filter((game) => {
          return game.status.abstractGameState === "Final";
        })
        .sort((a, b) => {
          return (
            new Date(b.gameDate).getTime() -
            new Date(a.gameDate).getTime()
          );
        })
        .slice(0, 10) ?? [];

    if (completedGames.length === 0) {
      return null;
    }

    let wins = 0;
    let losses = 0;
    let runsFor = 0;
    let runsAgainst = 0;

    const results: Array<"W" | "L"> = [];

    for (const game of completedGames) {
      const isAway = game.teams.away.team.id === teamId;

      const teamData = isAway
        ? game.teams.away
        : game.teams.home;

      const opponentData = isAway
        ? game.teams.home
        : game.teams.away;

      const teamScore = teamData.score ?? 0;
      const opponentScore = opponentData.score ?? 0;

      runsFor += teamScore;
      runsAgainst += opponentScore;

      if (teamScore > opponentScore) {
        wins += 1;
        results.push("W");
      } else {
        losses += 1;
        results.push("L");
      }
    }

    const gamesCount = wins + losses;

    return {
      wins,
      losses,
      gamesCount,
      winRate:
        gamesCount > 0
          ? Number(((wins / gamesCount) * 100).toFixed(1))
          : 0,
      runsFor,
      runsAgainst,
      runDifference: runsFor - runsAgainst,
      streak: calculateStreak(results),
    };
  } catch (error) {
    console.error("取得球隊近期狀態失敗：", error);
    return null;
  }
}