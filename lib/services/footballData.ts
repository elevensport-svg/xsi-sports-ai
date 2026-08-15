import {
  FOOTBALL_LEAGUES,
  getTomorrowFootballGames,
} from "../api/football";

import {
  deleteExpiredFootballSchedule,
  getCachedFootballSchedule,
  saveFootballSchedule,
} from "./footballSchedule";

import type {
  FootballGame,
} from "../api/football";

const CACHE_DAYS =
  14;

const ODDS_REFRESH_INTERVAL_MS =
  30 *
  60 *
  1000;

let lastOddsRefreshAt =
  0;

function getLeagueCoverage(
  games:
    FootballGame[],
) {
  const counts =
    new Map<
      string,
      number
    >();

  for (
    const league
    of FOOTBALL_LEAGUES
  ) {
    counts.set(
      league.key,
      0,
    );
  }

  for (
    const game
    of games
  ) {
    counts.set(
      game.leagueKey,
      (
        counts.get(
          game.leagueKey,
        ) ?? 0
      ) + 1,
    );
  }

  const missingLeagueKeys =
    FOOTBALL_LEAGUES
      .filter(
        (league) =>
          (
            counts.get(
              league.key,
            ) ?? 0
          ) === 0,
      )
      .map(
        (league) =>
          league.key,
      );

  return {
    counts,
    missingLeagueKeys,
  };
}

function mergeFootballGames(
  cachedGames:
    FootballGame[],

  apiGames:
    FootballGame[],
) {
  return Array.from(
    new Map(
      [
        ...cachedGames,
        ...apiGames,
      ].map(
        (game) => [
          String(
            game.id,
          ),
          game,
        ],
      ),
    ).values(),
  ).sort(
    (
      a,
      b,
    ) =>
      new Date(
        a.commenceTime,
      ).getTime() -
      new Date(
        b.commenceTime,
      ).getTime(),
  );
}

function shouldRefreshOddsApi(
  hasCachedGames:
    boolean,
) {
  if (
    !hasCachedGames
  ) {
    return true;
  }

  if (
    lastOddsRefreshAt ===
    0
  ) {
    lastOddsRefreshAt =
      Date.now();

    return false;
  }

  return (
    Date.now() -
      lastOddsRefreshAt >=
    ODDS_REFRESH_INTERVAL_MS
  );
}

async function generateMissingPredictions() {
  try {
    /*
     * 動態 import 避免 footballData 與 prediction generator
     * 在 module 初始化階段形成循環依賴。
     */
    const {
      generateTomorrowFootballPredictions,
    } =
      await import(
        "@/lib/prediction/generateTomorrowFootballPredictions"
      );

    console.log(
      "🤖 檢查足球新賽事預測...",
    );

    const result =
      await generateTomorrowFootballPredictions({
        force:
          false,
      });

    console.log(
      `🤖 足球自動補預測完成：新增 ${result.inserted}｜失敗 ${result.failed}`,
    );
  } catch (
    error
  ) {
    /*
     * 自動補預測失敗不能影響 /football 正常顯示。
     */
    console.error(
      "足球自動補預測失敗：",
      error,
    );
  }
}

export async function getFootballSchedule(): Promise<
  FootballGame[]
> {
  /*
   * ==========================================
   * STEP 1
   * 清除過期賽程
   * ==========================================
   */

  try {
    await deleteExpiredFootballSchedule();
  } catch (
    error
  ) {
    console.error(
      "清除過期足球快取失敗：",
      error,
    );
  }

  /*
   * ==========================================
   * STEP 2
   * 先讀 Supabase
   * ==========================================
   */

  let cachedGames:
    FootballGame[] =
      [];

  try {
    cachedGames =
      await getCachedFootballSchedule(
        CACHE_DAYS,
      );

    console.log(
      `⚽ Supabase 足球快取：${cachedGames.length} 場`,
    );
  } catch (
    error
  ) {
    console.error(
      "讀取足球快取失敗：",
      error,
    );
  }

  const coverage =
    getLeagueCoverage(
      cachedGames,
    );

  if (
    cachedGames.length >
    0
  ) {
    console.log(
      "⚽ 足球快取聯賽覆蓋：",
      FOOTBALL_LEAGUES.map(
        (league) => ({
          league:
            league.shortName,

          key:
            league.key,

          games:
            coverage.counts.get(
              league.key,
            ) ?? 0,
        }),
      ),
    );
  }

  /*
   * ==========================================
   * STEP 3
   * 30 分鐘內直接使用 Supabase
   * ==========================================
   */

  const refreshOdds =
    shouldRefreshOddsApi(
      cachedGames.length >
        0,
    );

  if (
    cachedGames.length >
      0 &&
    !refreshOdds
  ) {
    console.log(
      "✅ 使用 Supabase 足球快取，不重新呼叫 Odds API。",
    );

    if (
      coverage.missingLeagueKeys
        .length >
      0
    ) {
      console.log(
        "ℹ️ 目前 0 場聯賽：",
        coverage.missingLeagueKeys,
      );
    }

    return cachedGames;
  }

  /*
   * ==========================================
   * STEP 4
   * 快取過期才同步 Odds API
   * ==========================================
   */

  if (
    cachedGames.length ===
    0
  ) {
    console.log(
      "⚽ football_schedule 無資料，準備呼叫 Odds API...",
    );
  } else {
    console.log(
      "🔄 足球賽程快取已達更新時間，重新同步 Odds API...",
    );
  }

  let apiGames:
    FootballGame[] =
      [];

  try {
    apiGames =
      await getTomorrowFootballGames();

    lastOddsRefreshAt =
      Date.now();
  } catch (
    error
  ) {
    console.error(
      "Odds API 足球賽程取得失敗：",
      error,
    );

    return cachedGames;
  }

  if (
    apiGames.length ===
    0
  ) {
    console.warn(
      "⚠️ Odds API 沒有取得足球賽程，改用 Supabase 既有快取。",
    );

    return cachedGames;
  }

  /*
   * ==========================================
   * STEP 5
   * 判斷是否真的出現新賽事
   * ==========================================
   */

  const cachedGameIds =
    new Set(
      cachedGames.map(
        (game) =>
          String(
            game.id,
          ),
      ),
    );

  const newGames =
    apiGames.filter(
      (game) =>
        !cachedGameIds.has(
          String(
            game.id,
          ),
        ),
    );

  const mergedGames =
    mergeFootballGames(
      cachedGames,
      apiGames,
    );

  console.log(
    `🆕 Odds API 新賽事：${newGames.length} 場`,
  );

  /*
   * ==========================================
   * STEP 6
   * 儲存 football_schedule
   * ==========================================
   */

  try {
    const result =
      await saveFootballSchedule(
        mergedGames,
      );

    if (
      result.success
    ) {
      console.log(
        `⚽ 足球七聯賽快取更新完成：${result.saved} 場`,
      );
    } else {
      console.error(
        "足球快取更新失敗：",
        result.error,
      );
    }
  } catch (
    error
  ) {
    console.error(
      "football_schedule 儲存失敗：",
      error,
    );

    /*
     * 賽程沒有成功寫入時，不執行預測 generator，
     * 避免 generator 讀到舊 schedule。
     */
    return mergedGames;
  }

  /*
   * ==========================================
   * STEP 7
   * 有新賽事才自動補 prediction_history
   *
   * force=false：
   * generator 自己會檢查 existing game_pk，
   * 所以只會分析 prediction_history 缺少的賽事。
   * ==========================================
   */

  if (
    newGames.length >
    0
  ) {
    console.log(
      `🤖 發現 ${newGames.length} 場新賽事，開始自動補 AI 預測...`,
    );

    await generateMissingPredictions();
  } else {
    console.log(
      "✅ 本次沒有新賽事，不需要重新產生足球預測。",
    );
  }

  /*
   * ==========================================
   * STEP 8
   * Complete
   * ==========================================
   */

  const finalCoverage =
    getLeagueCoverage(
      mergedGames,
    );

  console.log(
    "======================================",
  );

  console.log(
    "⚽ FOOTBALL SCHEDULE READY",
  );

  console.log(
    `總場數：${mergedGames.length}`,
  );

  for (
    const league
    of FOOTBALL_LEAGUES
  ) {
    console.log(
      `${league.shortName}：${
        finalCoverage.counts.get(
          league.key,
        ) ?? 0
      } 場`,
    );
  }

  if (
    finalCoverage.missingLeagueKeys
      .length >
    0
  ) {
    console.log(
      "ℹ️ 目前沒有賽事的聯賽：",
      finalCoverage.missingLeagueKeys,
    );
  }

  console.log(
    "======================================",
  );

  return mergedGames;
}