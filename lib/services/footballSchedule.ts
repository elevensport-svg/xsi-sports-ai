import {
  createAdminClient,
} from "../supabase/admin";

import type {
  FootballGame,
  FootballLeagueKey,
} from "../api/football";

type FootballScheduleRow = {
  id: string;

  league_key:
    FootballLeagueKey;

  league_name: string;

  league_short_name: string;

  commence_time: string;

  home_team: string;

  away_team: string;

  home_win_odds:
    number | null;

  draw_odds:
    number | null;

  away_win_odds:
    number | null;

  home_spread:
    number | null;

  away_spread:
    number | null;

  over_point:
    number | null;

  over_odds:
    number | null;

  under_point:
    number | null;

  under_odds:
    number | null;

  updated_at: string;

  created_at?: string;
};

/* ==========================================
   FootballGame → DB Row
========================================== */

function footballGameToRow(
  game: FootballGame,
) {
  return {
    id:
      game.id,

    league_key:
      game.leagueKey,

    league_name:
      game.leagueName,

    league_short_name:
      game.leagueShortName,

    commence_time:
      game.commenceTime,

    home_team:
      game.homeTeam,

    away_team:
      game.awayTeam,

    home_win_odds:
      game.consensus
        .homeWinOdds,

    draw_odds:
      game.consensus
        .drawOdds,

    away_win_odds:
      game.consensus
        .awayWinOdds,

    home_spread:
      game.consensus
        .homeSpread,

    away_spread:
      game.consensus
        .awaySpread,

    over_point:
      game.consensus
        .overPoint,

    over_odds:
      game.consensus
        .overOdds,

    under_point:
      game.consensus
        .underPoint,

    under_odds:
      game.consensus
        .underOdds,

    updated_at:
      new Date()
        .toISOString(),
  };
}

/* ==========================================
   DB Row → FootballGame
========================================== */

function rowToFootballGame(
  row: FootballScheduleRow,
): FootballGame {
  return {
    id:
      row.id,

    leagueKey:
      row.league_key,

    leagueName:
      row.league_name,

    leagueShortName:
      row.league_short_name,

    commenceTime:
      row.commence_time,

    homeTeam:
      row.home_team,

    awayTeam:
      row.away_team,

    /*
     * DB 快取不保存完整 bookmaker 明細，
     * 頁面與 AI 主要使用 consensus。
     */
    bookmakers:
      [],

    consensus: {
      homeWinOdds:
        row.home_win_odds,

      drawOdds:
        row.draw_odds,

      awayWinOdds:
        row.away_win_odds,

      homeSpread:
        row.home_spread,

      awaySpread:
        row.away_spread,

      overPoint:
        row.over_point,

      overOdds:
        row.over_odds,

      underPoint:
        row.under_point,

      underOdds:
        row.under_odds,
    },
  };
}

/* ==========================================
   寫入 / 更新 football_schedule
========================================== */

export async function saveFootballSchedule(
  games: FootballGame[],
) {
  if (
    games.length ===
    0
  ) {
    return {
      success: true,
      saved: 0,
    };
  }

  const supabase =
    createAdminClient();

  const rows =
    games.map(
      footballGameToRow,
    );

  const {
    error,
  } = await supabase
    .from(
      "football_schedule",
    )
    .upsert(
      rows,
      {
        onConflict:
          "id",
      },
    );

  if (
    error
  ) {
    console.error(
      "football_schedule 寫入失敗:",
      error,
    );

    return {
      success: false,
      saved: 0,
      error:
        error.message,
    };
  }

  console.log(
    `⚽ football_schedule 已儲存 ${rows.length} 場`,
  );

  return {
    success: true,
    saved:
      rows.length,
  };
}

/* ==========================================
   讀取未來 N 天快取
========================================== */

export async function getCachedFootballSchedule(
  days = 14,
): Promise<FootballGame[]> {
  const supabase =
    createAdminClient();

  const now =
    new Date();

  const end =
    new Date(
      now.getTime() +
        days *
          24 *
          60 *
          60 *
          1000,
    );

  const {
    data,
    error,
  } = await supabase
    .from(
      "football_schedule",
    )
    .select(
      `
        id,
        league_key,
        league_name,
        league_short_name,
        commence_time,
        home_team,
        away_team,
        home_win_odds,
        draw_odds,
        away_win_odds,
        home_spread,
        away_spread,
        over_point,
        over_odds,
        under_point,
        under_odds,
        updated_at,
        created_at
      `,
    )
    .gte(
      "commence_time",
      now.toISOString(),
    )
    .lte(
      "commence_time",
      end.toISOString(),
    )
    .order(
      "commence_time",
      {
        ascending:
          true,
      },
    );

  if (
    error
  ) {
    console.error(
      "football_schedule 讀取失敗:",
      error,
    );

    return [];
  }

  return (
    (data ??
      []) as FootballScheduleRow[]
  ).map(
    rowToFootballGame,
  );
}

/* ==========================================
   取得全部目前快取
========================================== */

export async function getAllCachedFootballSchedule(): Promise<
  FootballGame[]
> {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      "football_schedule",
    )
    .select(
      `
        id,
        league_key,
        league_name,
        league_short_name,
        commence_time,
        home_team,
        away_team,
        home_win_odds,
        draw_odds,
        away_win_odds,
        home_spread,
        away_spread,
        over_point,
        over_odds,
        under_point,
        under_odds,
        updated_at,
        created_at
      `,
    )
    .order(
      "commence_time",
      {
        ascending:
          true,
      },
    );

  if (
    error
  ) {
    console.error(
      "讀取全部 football_schedule 失敗:",
      error,
    );

    return [];
  }

  return (
    (data ??
      []) as FootballScheduleRow[]
  ).map(
    rowToFootballGame,
  );
}

/* ==========================================
   清除已過期賽事
========================================== */

export async function deleteExpiredFootballSchedule() {
  const supabase =
    createAdminClient();

  const now =
    new Date()
      .toISOString();

  const {
    error,
  } = await supabase
    .from(
      "football_schedule",
    )
    .delete()
    .lt(
      "commence_time",
      now,
    );

  if (
    error
  ) {
    console.error(
      "清除過期足球賽事失敗:",
      error,
    );

    return false;
  }

  return true;
}