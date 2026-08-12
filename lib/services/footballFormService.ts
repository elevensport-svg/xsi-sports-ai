import {
  getFootballFormStats,
  type FootballFormStats,
} from "../api/footballForm";

import {
  saveFootballFormCache,
} from "./footballFormCache";

import {
  createAdminClient,
} from "../supabase/admin";

/* ==========================================
   Football Form Service

   快取有效時間：
   6 小時
========================================== */

const CACHE_MAX_AGE_HOURS =
  6;

type FootballTeamFormRow = {
  team_id: number;

  team_name: string;

  matches_played: number;

  wins: number;

  draws: number;

  losses: number;

  goals_for: number;

  goals_against: number;

  average_goals_for:
    number | string;

  average_goals_against:
    number | string;

  goal_difference: number;

  form_points: number;

  form_score: number;

  recent_matches:
    FootballFormStats["recentMatches"];

  updated_at: string;
};

/* ==========================================
   隊名正規化

   Odds API 與 API-Football
   偶爾隊名格式不同
========================================== */

function normalizeTeamName(
  name: string,
) {
  return name
    .toLowerCase()
    .replace(
      /football club/g,
      "",
    )
    .replace(
      /\bfc\b/g,
      "",
    )
    .replace(
      /\bafc\b/g,
      "",
    )
    .replace(
      /\bcf\b/g,
      "",
    )
    .replace(
      /\bac\b/g,
      "",
    )
    .replace(
      /[^a-z0-9]/g,
      "",
    )
    .trim();
}

/* ==========================================
   DB Row → FootballFormStats
========================================== */

function rowToFormStats(
  row: FootballTeamFormRow,
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
   快取是否仍有效
========================================== */

function isCacheFresh(
  updatedAt: string,
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
    return false;
  }

  const maxAge =
    CACHE_MAX_AGE_HOURS *
    60 *
    60 *
    1000;

  return (
    Date.now() -
      timestamp <
    maxAge
  );
}

/* ==========================================
   用隊名找 Supabase 快取

   先 exact match，
   找不到再 normalize 比對。
========================================== */

async function findCachedFormByTeamName(
  teamName: string,
): Promise<FootballTeamFormRow | null> {
  const supabase =
    createAdminClient();

  /*
   * STEP 1
   * 完全相同隊名
   */
  const {
    data: exact,
    error: exactError,
  } = await supabase
    .from(
      "football_team_form",
    )
    .select(
      `
        team_id,
        team_name,
        matches_played,
        wins,
        draws,
        losses,
        goals_for,
        goals_against,
        average_goals_for,
        average_goals_against,
        goal_difference,
        form_points,
        form_score,
        recent_matches,
        updated_at
      `,
    )
    .eq(
      "team_name",
      teamName,
    )
    .maybeSingle();

  if (
    exactError
  ) {
    console.error(
      `⚽ 讀取 ${teamName} Form cache 失敗：`,
      exactError,
    );
  }

  if (
    exact
  ) {
    return (
      exact as FootballTeamFormRow
    );
  }

  /*
   * STEP 2
   * 如果名稱格式不同，
   * 讀出目前快取做 normalize 比對。
   */
  const {
    data,
    error,
  } = await supabase
    .from(
      "football_team_form",
    )
    .select(
      `
        team_id,
        team_name,
        matches_played,
        wins,
        draws,
        losses,
        goals_for,
        goals_against,
        average_goals_for,
        average_goals_against,
        goal_difference,
        form_points,
        form_score,
        recent_matches,
        updated_at
      `,
    );

  if (
    error
  ) {
    console.error(
      "⚽ football_team_form 搜尋失敗：",
      error,
    );

    return null;
  }

  const target =
    normalizeTeamName(
      teamName,
    );

  const matched =
    (
      (data ??
        []) as FootballTeamFormRow[]
    ).find(
      (row) =>
        normalizeTeamName(
          row.team_name,
        ) ===
        target,
    );

  return (
    matched ??
    null
  );
}

/* ==========================================
   空資料

   API 失敗時不讓整個 XSI 掛掉
========================================== */

function createEmptyForm(
  teamName: string,
): FootballFormStats {
  return {
    teamId:
      null,

    teamName,

    matchesPlayed:
      0,

    wins:
      0,

    draws:
      0,

    losses:
      0,

    goalsFor:
      0,

    goalsAgainst:
      0,

    averageGoalsFor:
      0,

    averageGoalsAgainst:
      0,

    goalDifference:
      0,

    formPoints:
      0,

    formScore:
      50,

    recentMatches:
      [],
  };
}

/* ==========================================
   取得單隊 Form

   核心流程：

   1. Supabase
   2. 6 小時內 → 使用快取
   3. 過期 / 沒有 → API-Football
   4. 成功 → 回寫 Supabase
   5. API 失敗 → 使用舊快取
========================================== */

export async function getFootballTeamForm(
  teamName: string,
): Promise<FootballFormStats> {
  /*
   * ========================================
   * STEP 1
   * 先找 Supabase
   * ========================================
   */

  const cached =
    await findCachedFormByTeamName(
      teamName,
    );

  /*
   * ========================================
   * STEP 2
   * 快取仍在 6 小時內
   * 完全不碰 API-Football
   * ========================================
   */

  if (
    cached &&
    isCacheFresh(
      cached.updated_at,
    )
  ) {
    console.log(
      `⚽ ${teamName} 使用 Supabase Form 快取`,
    );

    return rowToFormStats(
      cached,
    );
  }

  /*
   * ========================================
   * STEP 3
   * 沒有快取 / 快取過期
   * 才呼叫 API-Football
   * ========================================
   */

  console.log(
    `🌐 ${teamName} Form 快取不存在或已過期，呼叫 API-Football`,
  );

  try {
    const fresh =
      await getFootballFormStats(
        teamName,
        5,
      );

    /*
     * API 沒找到球隊或沒取得比賽
     */
    if (
      fresh.teamId ===
        null ||
      fresh.matchesPlayed ===
        0
    ) {
      /*
       * 如果之前有舊快取，
       * 寧願使用舊資料，
       * 不讓 XSI 直接失去 Form。
       */
      if (
        cached
      ) {
        console.warn(
          `⚠️ ${teamName} API-Football 無新資料，使用舊 Form 快取`,
        );

        return rowToFormStats(
          cached,
        );
      }

      console.warn(
        `⚠️ ${teamName} 沒有可用 Form 資料`,
      );

      return createEmptyForm(
        teamName,
      );
    }

    /*
     * ======================================
     * STEP 4
     * 寫入 Supabase
     * ======================================
     */

    const saveResult =
      await saveFootballFormCache(
        fresh,
      );

    if (
      !saveResult.success
    ) {
      console.warn(
        `⚠️ ${teamName} Form 已取得，但 Supabase 快取寫入失敗`,
      );
    }

    console.log(
      `✅ ${teamName} Form 更新完成：${fresh.wins}勝 ${fresh.draws}和 ${fresh.losses}敗｜Score ${fresh.formScore}`,
    );

    return fresh;
  } catch (error) {
    console.error(
      `❌ ${teamName} API-Football Form 取得失敗：`,
      error,
    );

    /*
     * API 出問題時，
     * 舊快取仍然可以救援。
     */
    if (
      cached
    ) {
      console.log(
        `♻️ ${teamName} 改用舊 Supabase Form 快取`,
      );

      return rowToFormStats(
        cached,
      );
    }

    return createEmptyForm(
      teamName,
    );
  }
}

/* ==========================================
   一次取得一場比賽雙方 Form

   兩隊平行取得
========================================== */

export async function getFootballGameFormData(
  homeTeam: string,
  awayTeam: string,
) {
  const [
    home,
    away,
  ] =
    await Promise.all([
      getFootballTeamForm(
        homeTeam,
      ),

      getFootballTeamForm(
        awayTeam,
      ),
    ]);

  return {
    home,
    away,
  };
}