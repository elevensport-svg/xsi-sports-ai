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
     10. 判斷 XSI 領先球隊
  ========================================== */

  const leadingTeam =
    awayXsi.total >=
    homeXsi.total
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

  const xsiDifference =
    Math.abs(
      awayXsi.total -
        homeXsi.total,
    );

  const selectedWinProbability =
    leadingTeam === "away"
      ? winProbability
          .awayWinProbability
      : winProbability
          .homeWinProbability;

  /* ==========================================
     11. Value Score

     改成使用模型真正看好的球隊，
     不再固定使用客隊。
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
     12. 選擇領先球隊的資料
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
     14. XSI 差距決定投注類型

     不再使用：
     分數低 = 受讓

     改成：
     XSI 差距 + 真實盤口
  ========================================== */

  let recommendation:
    | "獨贏"
    | "讓分"
    | "受讓 +1.5" =
    "獨贏";

  const advisorReasons = [
    ...baseBetAdvisor.reasons,
  ];

  /*
   * XSI 差距 >= 15
   * 強勢優勢
   */
  if (
    xsiDifference >= 15
  ) {
    if (
      selectedSpread !==
        null &&
      selectedSpread <= -1
    ) {
      recommendation =
        "讓分";

      advisorReasons.push(
        `XSI 領先 ${xsiDifference.toFixed(
          1,
        )} 分，模型優勢明顯，具備讓分條件`,
      );
    } else {
      recommendation =
        "獨贏";

      advisorReasons.push(
        `XSI 領先 ${xsiDifference.toFixed(
          1,
        )} 分，模型明顯看好 ${selectedTeamName}`,
      );
    }
  }

  /*
   * XSI 差距 8～14.9
   * 明顯優勢，以獨贏為主
   */
  else if (
    xsiDifference >= 8
  ) {
    recommendation =
      "獨贏";

    advisorReasons.push(
      `XSI 領先 ${xsiDifference.toFixed(
        1,
      )} 分，建議以獨贏降低讓分風險`,
    );
  }

  /*
   * XSI 差距 4～7.9
   * 小幅優勢
   *
   * 只有模型看好的球隊本身
   * 確實拿到 +1 / +1.5 才考慮受讓
   */
  else if (
    xsiDifference >= 4
  ) {
    if (
      selectedSpread !==
        null &&
      selectedSpread >= 1
    ) {
      recommendation =
        "受讓 +1.5";

      advisorReasons.push(
        `XSI 小幅領先 ${xsiDifference.toFixed(
          1,
        )} 分，同時取得受讓保護`,
      );
    } else {
      recommendation =
        "獨贏";

      advisorReasons.push(
        `XSI 小幅領先 ${xsiDifference.toFixed(
          1,
        )} 分，暫以獨贏方向評估`,
      );
    }
  }

  /*
   * XSI 差距 < 4
   * 雙方非常接近
   *
   * 不再自動推薦受讓
   */
  else {
    recommendation =
      "獨贏";

    advisorReasons.push(
      `XSI 僅相差 ${xsiDifference.toFixed(
        1,
      )} 分，雙方實力接近，投注優勢有限`,
    );
  }

  /* ==========================================
     15. 信心度重新校正

     除了球隊自身分數，
     加入雙方 XSI 差距。
  ========================================== */

  let confidenceBoost = 0;

  if (
    xsiDifference >= 15
  ) {
    confidenceBoost = 8;
  } else if (
    xsiDifference >= 10
  ) {
    confidenceBoost = 5;
  } else if (
    xsiDifference >= 6
  ) {
    confidenceBoost = 2;
  } else if (
    xsiDifference < 4
  ) {
    confidenceBoost = -5;
  }

  const adjustedConfidence =
    Math.max(
      50,
      Math.min(
        95,
        Math.round(
          baseBetAdvisor.confidence +
            confidenceBoost,
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

    /* 列表排序使用 */
    summary: {
      leadingTeam,

      leadingTeamName:
        selectedTeamName,

      leadingXsiScore:
        selectedXsi.total,

      xsiDifference,

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