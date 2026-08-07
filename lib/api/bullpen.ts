export type BullpenStats = {
  era: number;
  whip: number;
  inningsPitched: number;
  strikeOuts: number;
  walks: number;
  saves: number;
  blownSaves: number;
};

type MlbBullpenResponse = {
  stats?: Array<{
    splits?: Array<{
      stat?: {
        era?: string;
        whip?: string;
        inningsPitched?: string;
        strikeOuts?: number;
        baseOnBalls?: number;
        saves?: number;
        blownSaves?: number;
      };
    }>;
  }>;
};

function toNumber(
  value: string | number | undefined,
  fallback = 0,
): number {
  const result = Number(value);

  return Number.isFinite(result) ? result : fallback;
}

function getTaiwanSeason(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei",
      year: "numeric",
    }).format(new Date()),
  );
}

export async function getBullpenStats(
  teamId: number,
): Promise<BullpenStats | null> {
  const params = new URLSearchParams({
    stats: "season",
    group: "pitching",
    season: String(getTaiwanSeason()),
    sitCodes: "rp",
  });

  const url =
    `https://statsapi.mlb.com/api/v1/teams/${teamId}/stats?` +
    params.toString();

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      throw new Error(
        `取得牛棚資料失敗：${response.status}`,
      );
    }

    const data = (await response.json()) as MlbBullpenResponse;
    const stats = data.stats?.[0]?.splits?.[0]?.stat;

    if (!stats) {
      return null;
    }

    return {
      era: toNumber(stats.era),
      whip: toNumber(stats.whip),
      inningsPitched: toNumber(stats.inningsPitched),
      strikeOuts: stats.strikeOuts ?? 0,
      walks: stats.baseOnBalls ?? 0,
      saves: stats.saves ?? 0,
      blownSaves: stats.blownSaves ?? 0,
    };
  } catch (error) {
    console.error(
      `取得球隊 ${teamId} 牛棚資料失敗：`,
      error,
    );

    return null;
  }
}