export type PitcherSeasonStats = {
  era: string;
  whip: string;
  strikeOuts: number;
  walks: number;
  inningsPitched: string;
  wins: number;
  losses: number;
};

type MlbPitcherStatsResponse = {
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
      };
    }>;
  }>;
};

export async function getPitcherSeasonStats(
  pitcherId?: number,
): Promise<PitcherSeasonStats | null> {
  if (!pitcherId) {
    return null;
  }

  const currentSeason = new Date().getFullYear();

  const url =
    `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats` +
    `?stats=season&group=pitching&season=${currentSeason}`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      throw new Error(`投手資料取得失敗：${response.status}`);
    }

    const data = (await response.json()) as MlbPitcherStatsResponse;
    const stat = data.stats?.[0]?.splits?.[0]?.stat;

    if (!stat) {
      return null;
    }

    return {
      era: stat.era ?? "-",
      whip: stat.whip ?? "-",
      strikeOuts: stat.strikeOuts ?? 0,
      walks: stat.baseOnBalls ?? 0,
      inningsPitched: stat.inningsPitched ?? "-",
      wins: stat.wins ?? 0,
      losses: stat.losses ?? 0,
    };
  } catch (error) {
    console.error("取得投手數據失敗：", error);
    return null;
  }
}