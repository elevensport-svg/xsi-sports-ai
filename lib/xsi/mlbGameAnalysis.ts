import type { MlbScheduleGame } from "../api/mlb";

import { getPitcherSeasonStats } from "../api/pitcher";
import { getTeamRecentForm } from "../api/teamForm";
import { getTeamRecentGames } from "../api/recent-games";
import { getHeadToHeadGames } from "../api/head-to-head";
import { getBullpenStats } from "../api/bullpen";
import { getTeamBattingStats } from "../api/batting";
import { getMlbMarketData } from "../api/market";

import { calculatePitcherScore } from "./pitcher";
import { calculateFormScore } from "./recent";
import { calculateH2HScore } from "./h2h";
import { calculateBullpenScore } from "./bullpen";
import { calculateBattingScore } from "./batting";
import { calculateMarketScore } from "./market";
import { calculateWinProbability } from "./win-probability";
import { calculateXsiEngine } from "./engine";
import { calculateBetAdvisor } from "./betAdvisor";

import {
  getMlbTeamName,
} from "../teams/mlb";

/* ==========================================
   MLB 單場 XSI 共用分析
========================================== */

export async function calculateMlbGameAnalysis(
  game: MlbScheduleGame,
) {
  const awayTeamId =
    game.teams.away.team.id;

  const homeTeamId =
    game.teams.home.team.id;

  const awayTeamName =
    getMlbTeamName(
      awayTeamId,
    );

  const homeTeamName =
    getMlbTeamName(
      homeTeamId,
    );

  const awayPitcher =
    game.teams.away
      .probablePitcher;

  const homePitcher =
    game.teams.home
      .probablePitcher;

  /* ==========================================
     1. 投手
  ========================================== */

  const [
    awayPitcherStats,
    homePitcherStats,
  ] = await Promise.all([
    getPitcherSeasonStats(
      awayPitcher?.id,
    ),

    getPitcherSeasonStats(
      homePitcher?.id,
    ),
  ]);

  const awayPitcherScore =
    calculatePitcherScore(
      awayPitcherStats,
    );

  const homePitcherScore =
    calculatePitcherScore(
      homePitcherStats,
    );

  /* ==========================================
     2. 近期狀態
  ========================================== */

  const [
    awayFormStats,
    homeFormStats,
  ] = await Promise.all([
    getTeamRecentForm(
      awayTeamId,
    ),

    getTeamRecentForm(
      homeTeamId,
    ),
  ]);

  const awayFormScore =
    calculateFormScore(
      awayFormStats,
    );

  const homeFormScore =
    calculateFormScore(
      homeFormStats,
    );

  /* ==========================================
     3. 近期比賽
  ========================================== */

  const [
    awayRecentGames,
    homeRecentGames,
  ] = await Promise.all([
    getTeamRecentGames(
      awayTeamId,
    ),

    getTeamRecentGames(
      homeTeamId,
    ),
  ]);

  /* ==========================================
     4. 歷史交手
  ========================================== */

  const headToHeadGames =
    await getHeadToHeadGames(
      awayTeamId,
      homeTeamId,
    );

  const headToHead =
    calculateH2HScore(
      headToHeadGames,
    );

  /* ==========================================
     5. 牛棚
  ========================================== */

  const [
    awayBullpenStats,
    homeBullpenStats,
  ] = await Promise.all([
    getBullpenStats(
      awayTeamId,
    ),

    getBullpenStats(
      homeTeamId,
    ),
  ]);

  const awayBullpenScore =
    calculateBullpenScore(
      awayBullpenStats,
    );

  const homeBullpenScore =
    calculateBullpenScore(
      homeBullpenStats,
    );

  /* ==========================================
     6. 打線
  ========================================== */

  const [
    awayBattingStats,
    homeBattingStats,
  ] = await Promise.all([
    getTeamBattingStats(
      awayTeamId,
    ),

    getTeamBattingStats(
      homeTeamId,
    ),
  ]);

  const awayBattingScore =
    calculateBattingScore(
      awayBattingStats,
    );

  const homeBattingScore =
    calculateBattingScore(
      homeBattingStats,
    );

  /* ==========================================
     7. 市場盤口
  ========================================== */

  let marketData:
    | Awaited<
        ReturnType<
          typeof getMlbMarketData
        >
      >
    | null = null;

  let marketScore:
    ReturnType<
      typeof calculateMarketScore
    >;

  try {
    marketData =
      await getMlbMarketData(
        game.teams.away
          .team.name,
        game.teams.home
          .team.name,
      );

    marketScore =
      calculateMarketScore(
        marketData,
      );
  } catch (error) {
    console.error(
      "Odds API / marketData 取得或計算失敗，改用中性市場分數:",
      error,
    );

    marketData = null;

    marketScore = {
      away: {
        score: 50,
        grade: "N/A",
        reasons: [
          "盤口資料暫時無法取得，使用中性分數",
        ],
      },

      home: {
        score: 50,
        grade: "N/A",
        reasons: [
          "盤口資料暫時無法取得，使用中性分數",
        ],
      },
    } as ReturnType<
      typeof calculateMarketScore
    >;
  }

  /* ==========================================
     8. XSI 勝率
  ========================================== */

  const winProbability =
    calculateWinProbability(
      {
        pitch:
          awayPitcherScore
            .score ?? 50,

        batting:
          awayBattingScore
            .score ?? 50,

        bullpen:
          awayBullpenScore
            .score ?? 50,

        form:
          awayFormScore
            .score ?? 50,

        market:
          marketScore
            .away.score ?? 50,

        h2h:
          headToHead
            .teamAScore ?? 50,
      },

      {
        pitch:
          homePitcherScore
            .score ?? 50,

        batting:
          homeBattingScore
            .score ?? 50,

        bullpen:
          homeBullpenScore
            .score ?? 50,

        form:
          homeFormScore
            .score ?? 50,

        market:
          marketScore
            .home.score ?? 50,

        h2h:
          headToHead
            .teamBScore ?? 50,
      },
    );

  /* ==========================================
     9. XSI Engine
  ========================================== */

  const awayXsi =
    calculateXsiEngine({
      pitch:
        awayPitcherScore
          .score,

      bat:
        awayBattingScore
          .score,

      bullpen:
        awayBullpenScore
          .score,

      form:
        awayFormScore
          .score,

      market:
        marketScore
          .away.score,
    });

  const homeXsi =
    calculateXsiEngine({
      pitch:
        homePitcherScore
          .score,

      bat:
        homeBattingScore
          .score,

      bullpen:
        homeBullpenScore
          .score,

      form:
        homeFormScore
          .score,

      market:
        marketScore
          .home.score,
    });

  /* ==========================================
     10. 統一模型方向

     重要：
     最終推薦球隊一律由 Win Probability 決定。

     原本使用 XSI total 選隊，可能造成：
     勝率模型看好 A 隊，
     Bet Advisor 卻推薦 B 隊。

     現在改成：
     Win Probability
     ↓
     selectedTeamName
     ↓
     Value Score
     ↓
     Bet Advisor

     若勝率剛好完全相同，
     才使用 XSI total 作為 tie-break。
  ========================================== */

  const awayWinProbability =
    winProbability
      .awayWinProbability;

  const homeWinProbability =
    winProbability
      .homeWinProbability;

  const leadingTeam:
    | "away"
    | "home" =
    awayWinProbability ===
    homeWinProbability
      ? awayXsi.total >=
        homeXsi.total
        ? "away"
        : "home"
      : awayWinProbability >
          homeWinProbability
        ? "away"
        : "home";

  const selectedTeamName =
    leadingTeam === "away"
      ? awayTeamName
      : homeTeamName;

  const selectedXsi =
    leadingTeam === "away"
      ? awayXsi
      : homeXsi;

  /*
   * XSI 差距保留作為資訊指標，
   * 但不再拿它決定推薦哪一隊。
   */
  const xsiDifference =
    Math.abs(
      awayXsi.total -
        homeXsi.total,
    );

  const selectedWinProbability =
    leadingTeam === "away"
      ? awayWinProbability
      : homeWinProbability;

  /*
   * 真正用於投注方向強弱的差距。
   * 因為推薦方向是 Win Probability 決定，
   * 所以推薦強度也必須使用同一套方向來源。
   */
  const winProbabilityDifference =
    Math.abs(
      awayWinProbability -
        homeWinProbability,
    );

  /* ==========================================
     11. Value Score

     Value Score 仍保留：
     50% XSI 綜合評分
     50% 勝率模型

     但兩者現在都針對同一支 selectedTeam。
  ========================================== */

  const valueScoreNumber =
    Math.round(
      selectedXsi.total *
        0.5 +
        selectedWinProbability *
          0.5,
    );

  const valueScore = {
    score:
      valueScoreNumber,

    grade:
      valueScoreNumber >= 90
        ? "A+"
        : valueScoreNumber >= 80
          ? "A"
          : valueScoreNumber >= 70
            ? "B"
            : valueScoreNumber >= 60
              ? "C"
              : "D",
  };

  /* ==========================================
     12. 選擇模型方向球隊的資料

     所有 Bet Advisor 輸入
     都跟著 Win Probability 選出的球隊。
  ========================================== */

  const selectedPitchScore =
    leadingTeam === "away"
      ? awayPitcherScore.score
      : homePitcherScore.score;

  const selectedBattingScore =
    leadingTeam === "away"
      ? awayBattingScore.score
      : homeBattingScore.score;

  const selectedBullpenScore =
    leadingTeam === "away"
      ? awayBullpenScore.score
      : homeBullpenScore.score;

  const selectedFormScore =
    leadingTeam === "away"
      ? awayFormScore.score
      : homeFormScore.score;

  const selectedMarketScore =
    leadingTeam === "away"
      ? marketScore.away.score
      : marketScore.home.score;

  const selectedSpread =
    leadingTeam === "away"
      ? marketData
          ?.consensus
          .awaySpread ??
        null
      : marketData
          ?.consensus
          .homeSpread ??
        null;

  console.log(`📈 MLB ${game.gamePk} 盤口診斷`, {
    matchup: `${awayTeamName} VS ${homeTeamName}`,
    selectedTeam: selectedTeamName,
    awaySpread: marketData?.consensus.awaySpread ?? null,
    homeSpread: marketData?.consensus.homeSpread ?? null,
    selectedSpread,
    marketAvailable: marketData !== null,
  });

  /* ==========================================
     13. 基礎 Bet Advisor
  ========================================== */

  const baseBetAdvisor =
    calculateBetAdvisor({
      pitch:
        selectedPitchScore,

      batting:
        selectedBattingScore,

      bullpen:
        selectedBullpenScore,

      form:
        selectedFormScore,

      market:
        selectedMarketScore,

      spread:
        selectedSpread,
    });

  /* ==========================================
     14. 投注玩法重新校正

     選隊仍由 Win Probability 決定。
     Run Line 只負責決定獨贏 / 讓分 / 受讓。
     不使用 EV 改變選隊，也不隨機分配玩法。
  ========================================== */

  let recommendation:
    | "獨贏"
    | "讓分"
    | "受讓 +1.5" =
    "獨贏";

  const advisorReasons = [
    ...baseBetAdvisor.reasons,
  ];

  const hasRealSpread =
    selectedSpread !== null &&
    Number.isFinite(Number(selectedSpread));

  const normalizedSpread =
    hasRealSpread
      ? Number(selectedSpread)
      : null;

  // XSI 看好的球隊本身是市場受讓方：
  // 只要有真實正盤，就優先使用 +1.5 保護。
  if (
    normalizedSpread !== null &&
    normalizedSpread > 0
  ) {
    recommendation = "受讓 +1.5";

    advisorReasons.push(
      `${selectedTeamName} 為市場受讓方（Run Line +${normalizedSpread}），XSI 仍選為領先方向，優先使用 +1.5 保護`,
    );
  }

  // XSI 看好的球隊是市場讓分方：
  // 勝率 >= 58%，且勝率差 >= 8% 或 XSI 差 >= 5，才走 -1.5。
  else if (
    normalizedSpread !== null &&
    normalizedSpread < 0 &&
    selectedWinProbability >= 58 &&
    (
      winProbabilityDifference >= 8 ||
      xsiDifference >= 5
    )
  ) {
    recommendation = "讓分";

    advisorReasons.push(
      `${selectedTeamName} 為市場讓分方（Run Line ${normalizedSpread}），模型勝率 ${selectedWinProbability.toFixed(1)}% 且優勢足夠，評估讓分 -1.5`,
    );
  }

  // 有負盤，但模型優勢還不夠承擔 -1.5。
  else if (
    normalizedSpread !== null &&
    normalizedSpread < 0
  ) {
    recommendation = "獨贏";

    advisorReasons.push(
      `${selectedTeamName} 雖為市場讓分方，但目前模型優勢不足以承擔 -1.5，保留獨贏`,
    );
  }

  // Spread = 0，沒有明確讓受方向。
  else if (normalizedSpread === 0) {
    recommendation = "獨贏";

    advisorReasons.push(
      `${selectedTeamName} 目前 Run Line 無明確讓受方向，保留獨贏`,
    );
  }

  // 沒有 Run Line 時不偽造受讓。
  // 只有模型非常強勢才允許評估 -1.5。
  else if (
    selectedWinProbability >= 68 &&
    winProbabilityDifference >= 20 &&
    selectedXsi.total >= 70 &&
    xsiDifference >= 10
  ) {
    recommendation = "讓分";

    advisorReasons.push(
      `${selectedTeamName} 暫無可用 Run Line，但模型勝率 ${selectedWinProbability.toFixed(1)}% 且 XSI 優勢明顯，以強勢 -1.5 方向評估`,
    );
  }

  else {
    recommendation = "獨贏";

    advisorReasons.push(
      `${selectedTeamName} 模型勝率 ${selectedWinProbability.toFixed(1)}%，目前缺乏足夠讓分依據，保留獨贏`,
    );
  }

  console.log(`🎯 MLB ${game.gamePk} 最終玩法`, {
    selectedTeam: selectedTeamName,
    winProbability: Number(selectedWinProbability.toFixed(1)),
    winProbabilityDifference: Number(winProbabilityDifference.toFixed(1)),
    xsiScore: selectedXsi.total,
    xsiDifference: Number(xsiDifference.toFixed(1)),
    selectedSpread: normalizedSpread,
    recommendation,
  });

  /* ==========================================
     15. 信心度重新校正

     信心分數與玩法難度分開處理：

     受讓 +1.5：
     有保護，微幅加分。

     讓分 -1.5：
     過盤條件較嚴格，略微降分。

     獨贏：
     不額外調整。
  ========================================== */

  let confidenceBoost = 0;

  if (
    winProbabilityDifference >=
    25
  ) {
    confidenceBoost = 8;
  } else if (
    winProbabilityDifference >=
    15
  ) {
    confidenceBoost = 5;
  } else if (
    winProbabilityDifference >=
    8
  ) {
    confidenceBoost = 2;
  } else if (
    winProbabilityDifference <
    4
  ) {
    confidenceBoost = -5;
  }

  let marketTypeAdjustment =
    0;

  if (
    recommendation ===
    "受讓 +1.5"
  ) {
    marketTypeAdjustment =
      2;
  } else if (
    recommendation ===
    "讓分"
  ) {
    marketTypeAdjustment =
      -4;
  }

  const adjustedConfidence =
    Math.max(
      50,
      Math.min(
        95,
        Math.round(
          baseBetAdvisor.confidence +
            confidenceBoost +
            marketTypeAdjustment,
        ),
      ),
    );

  const betAdvisor = {
    ...baseBetAdvisor,

    recommendation,

    confidence:
      adjustedConfidence,

    score:
      adjustedConfidence,

    reasons:
      advisorReasons,

    risk:
      adjustedConfidence >= 85
        ? "低風險"
        : adjustedConfidence >= 70
          ? "中等風險"
          : "高風險",
  };

  /* ==========================================
     16. 排序資料
  ========================================== */

  const maxWinProbability =
    Math.max(
      winProbability
        .awayWinProbability,
      winProbability
        .homeWinProbability,
    );

  /* ==========================================
     Return
  ========================================== */

  return {
    game,

    awayTeamId,
    homeTeamId,

    awayTeamName,
    homeTeamName,

    awayPitcher,
    homePitcher,

    awayPitcherStats,
    homePitcherStats,

    awayPitcherScore,
    homePitcherScore,

    awayBattingStats,
    homeBattingStats,

    awayBattingScore,
    homeBattingScore,

    awayBullpenStats,
    homeBullpenStats,

    awayBullpenScore,
    homeBullpenScore,

    awayFormStats,
    homeFormStats,

    awayFormScore,
    homeFormScore,

    awayRecentGames,
    homeRecentGames,

    headToHeadGames,
    headToHead,

    marketData,
    marketScore,

    winProbability,

    awayXsi,
    homeXsi,

    valueScore,

    betAdvisor,

    /* 額外提供模型方向 */
    selectedTeamName,
    xsiDifference,
    winProbabilityDifference,

    /* 列表排序使用 */
    summary: {
      leadingTeam,

      leadingTeamName:
        selectedTeamName,

      leadingXsiScore:
        selectedXsi.total,

      xsiDifference,

      winProbabilityDifference,

      confidence:
        betAdvisor.confidence,

      valueScore:
        valueScore.score,

      maxWinProbability,
    },
  };
}

export type MlbGameAnalysis =
  Awaited<
    ReturnType<
      typeof calculateMlbGameAnalysis
    >
  >;