import {
  createClient,
} from "@supabase/supabase-js";

import type {
  FootballFormStats,
} from "../api/footballForm";

/* ==========================================
   Football Form Cache

   快取有效時間：
   6 小時
========================================== */

const CACHE_MAX_AGE_MINUTES =
  360;

/* ==========================================
   Supabase
========================================== */

function getSupabaseClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    throw new Error(
      "Supabase 環境變數尚未設定",
    );
  }

  return createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    },
  );
}

/* ==========================================
   Database Row
========================================== */

type FootballTeamFormRow = {
  team_id:
    number;

  team_name:
    string;

  matches_played:
    number;

  wins:
    number;

  draws:
    number;

  losses:
    number;

  goals_for:
    number;

  goals_against:
    number;

  average_goals_for:
    number | string;

  average_goals_against:
    number | string;

  goal_difference:
    number;

  form_points:
    number;

  form_score:
    number;

  recent_matches:
    FootballFormStats["recentMatches"];

  updated_at:
    string;

  created_at:
    string;
};

/* ==========================================
   DB Row → FootballFormStats
========================================== */

function mapRowToFormStats(
  row:
    FootballTeamFormRow,
): FootballFormStats {
  return {
    teamId:
      row.team_id,

    teamName:
      row.team_name,

    matchesPlayed:
      row.matches_played,

    wins:
      row.wins,

    draws:
      row.draws,

    losses:
      row.losses,

    goalsFor:
      row.goals_for,

    goalsAgainst:
      row.goals_against,

    averageGoalsFor:
      Number(
        row.average_goals_for,
      ),

    averageGoalsAgainst:
      Number(
        row.average_goals_against,
      ),

    goalDifference:
      row.goal_difference,

    formPoints:
      row.form_points,

    formScore:
      row.form_score,

    recentMatches:
      Array.isArray(
        row.recent_matches,
      )
        ? row.recent_matches
        : [],
  };
}

/* ==========================================
   計算快取年齡
========================================== */

function getCacheAgeMinutes(
  updatedAt:
    string,
) {
  const timestamp =
    new Date(
      updatedAt,
    ).getTime();

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return Infinity;
  }

  return (
    Date.now() -
    timestamp
  ) /
    1000 /
    60;
}

/* ==========================================
   讀取 Team Form Cache

   freshOnly = true：
   超過 6 小時直接當沒有資料
========================================== */

export async function getFootballFormCache(
  teamId:
    number,
  freshOnly =
    true,
): Promise<FootballFormStats | null> {
  try {
    const supabase =
      getSupabaseClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "football_team_form",
        )
        .select(
          "*",
        )
        .eq(
          "team_id",
          teamId,
        )
        .maybeSingle();

    if (error) {
      console.error(
        `⚽ football_team_form 讀取失敗 team=${teamId}`,
        error,
      );

      return null;
    }

    if (!data) {
      return null;
    }

    const row =
      data as FootballTeamFormRow;

    const ageMinutes =
      getCacheAgeMinutes(
        row.updated_at,
      );

    if (
      freshOnly &&
      ageMinutes >
        CACHE_MAX_AGE_MINUTES
    ) {
      console.log(
        `⚽ ${row.team_name} Form 快取已過期 (${Math.floor(
          ageMinutes,
        )} 分鐘)`,
      );

      return null;
    }

    return mapRowToFormStats(
      row,
    );
  } catch (error) {
    console.error(
      "getFootballFormCache 發生錯誤：",
      error,
    );

    return null;
  }
}

/* ==========================================
   儲存 / 更新 Team Form Cache
========================================== */

export async function saveFootballFormCache(
  stats:
    FootballFormStats,
) {
  if (
    stats.teamId ===
    null
  ) {
    return {
      success:
        false,

      error:
        "teamId 為 null，無法寫入 football_team_form",
    };
  }

  try {
    const supabase =
      getSupabaseClient();

    const now =
      new Date()
        .toISOString();

    const {
      error,
    } =
      await supabase
        .from(
          "football_team_form",
        )
        .upsert(
          {
            team_id:
              stats.teamId,

            team_name:
              stats.teamName,

            matches_played:
              stats.matchesPlayed,

            wins:
              stats.wins,

            draws:
              stats.draws,

            losses:
              stats.losses,

            goals_for:
              stats.goalsFor,

            goals_against:
              stats.goalsAgainst,

            average_goals_for:
              stats.averageGoalsFor,

            average_goals_against:
              stats.averageGoalsAgainst,

            goal_difference:
              stats.goalDifference,

            form_points:
              stats.formPoints,

            form_score:
              stats.formScore,

            recent_matches:
              stats.recentMatches,

            updated_at:
              now,
          },
          {
            onConflict:
              "team_id",
          },
        );

    if (error) {
      console.error(
        `⚽ ${stats.teamName} Form 快取寫入失敗`,
        error,
      );

      return {
        success:
          false,

        error:
          error.message,
      };
    }

    console.log(
      `💾 ${stats.teamName} Form 已寫入 Supabase`,
    );

    return {
      success:
        true,

      error:
        null,
    };
  } catch (error) {
    console.error(
      "saveFootballFormCache 發生錯誤：",
      error,
    );

    return {
      success:
        false,

      error:
        error instanceof
        Error
          ? error.message
          : String(
              error,
            ),
    };
  }
}

/* ==========================================
   批次儲存
========================================== */

export async function saveFootballFormCaches(
  statsList:
    FootballFormStats[],
) {
  const valid =
    statsList.filter(
      (
        stats,
      ) =>
        stats.teamId !==
        null,
    );

  if (
    valid.length ===
    0
  ) {
    return {
      success:
        true,

      saved:
        0,

      error:
        null,
    };
  }

  try {
    const supabase =
      getSupabaseClient();

    const now =
      new Date()
        .toISOString();

    const rows =
      valid.map(
        (
          stats,
        ) => ({
          team_id:
            stats.teamId,

          team_name:
            stats.teamName,

          matches_played:
            stats.matchesPlayed,

          wins:
            stats.wins,

          draws:
            stats.draws,

          losses:
            stats.losses,

          goals_for:
            stats.goalsFor,

          goals_against:
            stats.goalsAgainst,

          average_goals_for:
            stats.averageGoalsFor,

          average_goals_against:
            stats.averageGoalsAgainst,

          goal_difference:
            stats.goalDifference,

          form_points:
            stats.formPoints,

          form_score:
            stats.formScore,

          recent_matches:
            stats.recentMatches,

          updated_at:
            now,
        }),
      );

    const {
      error,
    } =
      await supabase
        .from(
          "football_team_form",
        )
        .upsert(
          rows,
          {
            onConflict:
              "team_id",
          },
        );

    if (error) {
      console.error(
        "⚽ football_team_form 批次寫入失敗：",
        error,
      );

      return {
        success:
          false,

        saved:
          0,

        error:
          error.message,
      };
    }

    console.log(
      `💾 football_team_form 批次儲存 ${rows.length} 隊`,
    );

    return {
      success:
        true,

      saved:
        rows.length,

      error:
        null,
    };
  } catch (error) {
    console.error(
      "saveFootballFormCaches 發生錯誤：",
      error,
    );

    return {
      success:
        false,

      saved:
        0,

      error:
        error instanceof
        Error
          ? error.message
          : String(
              error,
            ),
    };
  }
}

/* ==========================================
   取得最後更新時間
========================================== */

export async function getFootballFormCacheLastUpdated(
  teamId:
    number,
): Promise<string | null> {
  try {
    const supabase =
      getSupabaseClient();

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "football_team_form",
        )
        .select(
          "updated_at",
        )
        .eq(
          "team_id",
          teamId,
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      return null;
    }

    return (
      data.updated_at ??
      null
    );
  } catch {
    return null;
  }
}

/* ==========================================
   刪除過舊快取

   這裡設定 7 天，
   不是 6 小時。

   6 小時 = 是否重新抓 API
   7 天 = DB 清理
========================================== */

export async function deleteOldFootballFormCache() {
  try {
    const supabase =
      getSupabaseClient();

    const cutoff =
      new Date(
        Date.now() -
          7 *
            24 *
            60 *
            60 *
            1000,
      ).toISOString();

    const {
      error,
    } =
      await supabase
        .from(
          "football_team_form",
        )
        .delete()
        .lt(
          "updated_at",
          cutoff,
        );

    if (error) {
      console.error(
        "⚽ football_team_form 清理失敗：",
        error,
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "deleteOldFootballFormCache 發生錯誤：",
      error,
    );

    return false;
  }
}