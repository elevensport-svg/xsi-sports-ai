export type TeamBattingStats = {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  runs: number;
  homeRuns: number;
};

export async function getTeamBattingStats(
  teamId: number,
): Promise<TeamBattingStats | null> {
  try {
    const res =
      await fetch(
        `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?stats=season&group=hitting`,
        {
          next: {
            revalidate: 3600,
          },
        },
      );

    if (!res.ok) {
      return null;
    }

    const data =
      await res.json();

    const stat =
      data.stats?.[0]
        ?.splits?.[0]
        ?.stat;

    if (!stat) {
      return null;
    }

    return {
      avg:
        Number(
          stat.avg,
        ),

      obp:
        Number(
          stat.obp,
        ),

      slg:
        Number(
          stat.slg,
        ),

      ops:
        Number(
          stat.ops,
        ),

      runs:
        stat.runs,

      homeRuns:
        stat.homeRuns,
    };
  } catch {
    return null;
  }
}