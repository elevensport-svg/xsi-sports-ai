import {
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

const CACHE_DAYS = 14;

/* ==========================================
   足球統一資料入口

   1. 先讀 Supabase
   2. 有資料直接使用
   3. 沒資料才呼叫 Odds API
   4. API 成功後寫入 Supabase
========================================== */

export async function getFootballSchedule(): Promise<
  FootballGame[]
> {
  /*
   * 先清掉已經開賽的舊資料
   */
  try {
    await deleteExpiredFootballSchedule();
  } catch (error) {
    console.error(
      "清除過期足球快取失敗：",
      error,
    );
  }

  /*
   * ========================================
   * STEP 1
   * 先讀 Supabase
   * ========================================
   */

  try {
    const cachedGames =
      await getCachedFootballSchedule(
        CACHE_DAYS,
      );

    if (
      cachedGames.length >
      0
    ) {
      console.log(
        `⚽ 使用 Supabase 足球快取：${cachedGames.length} 場`,
      );

      return cachedGames;
    }
  } catch (error) {
    console.error(
      "讀取足球快取失敗：",
      error,
    );
  }

  /*
   * ========================================
   * STEP 2
   * Supabase 沒資料
   *
   * 才呼叫 Odds API
   * ========================================
   */

  console.log(
    "⚽ football_schedule 無資料，開始呼叫 Odds API...",
  );

  let apiGames:
    FootballGame[] = [];

  try {
    apiGames =
      await getTomorrowFootballGames();
  } catch (error) {
    console.error(
      "Odds API 足球賽程取得失敗：",
      error,
    );

    return [];
  }

  /*
   * API 也是空的
   *
   * 例如：
   * OUT_OF_USAGE_CREDITS
   */
  if (
    apiGames.length ===
    0
  ) {
    console.warn(
      "⚠️ Odds API 沒有取得足球賽程。",
    );

    return [];
  }

  /*
   * ========================================
   * STEP 3
   * API 成功
   *
   * 寫進 football_schedule
   * ========================================
   */

  try {
    const result =
      await saveFootballSchedule(
        apiGames,
      );

    if (
      result.success
    ) {
      console.log(
        `⚽ 足球快取更新完成：${result.saved} 場`,
      );
    } else {
      console.error(
        "足球快取更新失敗：",
        result.error,
      );
    }
  } catch (error) {
    /*
     * 就算 Supabase 寫入失敗，
     * 這一次 API 已經拿到資料，
     * 頁面仍然可以正常顯示。
     */
    console.error(
      "football_schedule 儲存失敗：",
      error,
    );
  }

  return apiGames;
}