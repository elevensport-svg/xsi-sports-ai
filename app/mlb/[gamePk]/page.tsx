import PredictionHistorySaver from "../../../components/analysis/PredictionHistorySaver";
import HistoryWinRateCard from "../../../components/cards/HistoryWinRateCard";
import GameAnalysis from "../../../components/game/GameAnalysis";
import BetAdvisorCard from "../../../components/cards/BetAdvisorCard";
import { calculateBetAdvisor } from "../../../lib/xsi/betAdvisor";

import { getCurrentUserMembership } from "../../../lib/membership";

import ValueScoreCard from "../../../components/cards/ValueScoreCard";

import { calculateH2HScore } from "../../../lib/xsi/h2h";

import { calculateWinProbability } from "../../../lib/xsi/win-probability";

import WinProbabilityCard from "../../../components/cards/WinProbabilityCard";

import { getBullpenStats } from "../../../lib/api/bullpen";

import { calculateBullpenScore } from "../../../lib/xsi/bullpen";

import BullpenCard from "../../../components/cards/BullpenCard";

import { getHeadToHeadGames } from "../../../lib/api/head-to-head";

import H2HCard from "../../../components/cards/H2HCard";

import { getTeamRecentGames } from "../../../lib/api/recent-games";

import RecentGamesCard from "../../../components/cards/RecentGamesCard";

import AIRecommendationCard from "../../../components/cards/AIRecommendationCard";

import { getMlbMarketData } from "../../../lib/api/market";

import { calculateMarketScore } from "../../../lib/xsi/market";

import MarketCard from "../../../components/cards/MarketCard";

import { getTeamBattingStats } from "../../../lib/api/batting";

import { calculateBattingScore } from "../../../lib/xsi/batting";

import { getTeamRecentForm } from "../../../lib/api/teamForm";

import { calculateFormScore } from "../../../lib/xsi/recent";

import { calculateXsiEngine } from "../../../lib/xsi/engine";

import {
  formatTaiwanGameTime,
  getMlbGamesByTaiwanDate,
  getTaiwanTomorrow,
} from "../../../lib/api/mlb";

import {
  getMlbTeamLogo,
  getMlbTeamName,
} from "../../../lib/teams/mlb";

import { getPitcherSeasonStats } from "../../../lib/api/pitcher";

import { calculatePitcherScore } from "../../../lib/xsi/pitcher";

type PageProps = {
  params: Promise<{
    gamePk: string;
  }>;
};

function PitcherScoreCard({
  score,
  grade,
  reasons,
}: {
  score: number;
  grade: string;
  reasons: string[];
}) {
  return (
    <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-400/5 p-4 text-left sm:mt-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-400 sm:text-xs">
            XSI Pitch
          </p>

          <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
            {grade}
          </p>
        </div>

        <p className="shrink-0 text-3xl font-black text-yellow-400 sm:text-4xl">
          {score}
        </p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-yellow-400"
          style={{
            width: `${Math.max(0, Math.min(score, 100))}%`,
          }}
        />
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {reasons.map((reason) => (
            <p
              key={reason}
              className="break-words text-[11px] leading-5 text-zinc-500 sm:text-xs"
            >
              • {reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function GamePage({
  params,
}: PageProps) {
  const { gamePk } = await params;

  console.log("XSI GAME PAGE RUN", gamePk);

  const membership = await getCurrentUserMembership();

  const games = await getMlbGamesByTaiwanDate(
    getTaiwanTomorrow(),
  );

  const game = games.find(
    (item) => String(item.gamePk) === gamePk,
  );

  if (!game) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-zinc-950 px-3 py-6 pb-28 text-white sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <a
            href="/"
            className="inline-block rounded-lg border border-yellow-500/30 px-4 py-2 text-sm font-bold text-yellow-400"
          >
            ← 返回明日賽事
          </a>

          <div className="mt-6 rounded-2xl border border-red-500/30 bg-zinc-900 p-5 sm:mt-8 sm:p-8">
            <h1 className="text-2xl font-bold sm:text-3xl">
              找不到這場比賽
            </h1>

            <p className="mt-3 break-all text-sm text-zinc-400">
              Game ID：{gamePk}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const awayTeamId = game.teams.away.team.id;
  const homeTeamId = game.teams.home.team.id;

  const awayTeamName = getMlbTeamName(awayTeamId);
  const homeTeamName = getMlbTeamName(homeTeamId);

  const awayPitcher = game.teams.away.probablePitcher;
  const homePitcher = game.teams.home.probablePitcher;

  const [
    awayPitcherStats,
    homePitcherStats,
  ] = await Promise.all([
    getPitcherSeasonStats(awayPitcher?.id),
    getPitcherSeasonStats(homePitcher?.id),
  ]);

  const awayPitcherScore =
    calculatePitcherScore(awayPitcherStats);

  const homePitcherScore =
    calculatePitcherScore(homePitcherStats);

  const [
    awayFormStats,
    homeFormStats,
  ] = await Promise.all([
    getTeamRecentForm(awayTeamId),
    getTeamRecentForm(homeTeamId),
  ]);

  const awayFormScore =
    calculateFormScore(awayFormStats);

  const homeFormScore =
    calculateFormScore(homeFormStats);

  const [
    awayRecentGames,
    homeRecentGames,
  ] = await Promise.all([
    getTeamRecentGames(awayTeamId),
    getTeamRecentGames(homeTeamId),
  ]);

  const headToHeadGames =
    await getHeadToHeadGames(
      awayTeamId,
      homeTeamId,
    );

  const headToHead =
    calculateH2HScore(headToHeadGames);

  const [
    awayBullpenStats,
    homeBullpenStats,
  ] = await Promise.all([
    getBullpenStats(awayTeamId),
    getBullpenStats(homeTeamId),
  ]);

  const awayBullpenScore =
    calculateBullpenScore(awayBullpenStats);

  const homeBullpenScore =
    calculateBullpenScore(homeBullpenStats);

  const [
    awayBattingStats,
    homeBattingStats,
  ] = await Promise.all([
    getTeamBattingStats(awayTeamId),
    getTeamBattingStats(homeTeamId),
  ]);

  const awayBattingScore =
    calculateBattingScore(awayBattingStats);

  const homeBattingScore =
    calculateBattingScore(homeBattingStats);

  // ===============================
  // Odds API / Market Data
  // 失敗時不允許中斷整個 XSI 頁面
  // ===============================

  let marketData:
    | Awaited<ReturnType<typeof getMlbMarketData>>
    | null = null;

  let marketScore: ReturnType<typeof calculateMarketScore>;

  try {
    marketData = await getMlbMarketData(
      game.teams.away.team.name,
      game.teams.home.team.name,
    );

    marketScore = calculateMarketScore(marketData);
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
        reasons: ["盤口資料暫時無法取得，使用中性分數"],
      },
      home: {
        score: 50,
        grade: "N/A",
        reasons: ["盤口資料暫時無法取得，使用中性分數"],
      },
    } as ReturnType<typeof calculateMarketScore>;
  }

  // ===============================
  // 原本 XSI 計算流程保留
  // ===============================

  const winProbability =
    calculateWinProbability(
      {
        pitch: awayPitcherScore.score ?? 50,
        batting: awayBattingScore.score ?? 50,
        bullpen: awayBullpenScore.score ?? 50,
        form: awayFormScore.score ?? 50,
        market: marketScore.away.score ?? 50,
        h2h: headToHead.teamAScore ?? 50,
      },
      {
        pitch: homePitcherScore.score ?? 50,
        batting: homeBattingScore.score ?? 50,
        bullpen: homeBullpenScore.score ?? 50,
        form: homeFormScore.score ?? 50,
        market: marketScore.home.score ?? 50,
        h2h: headToHead.teamBScore ?? 50,
      },
    );

  const awayXsi =
    calculateXsiEngine({
      pitch: awayPitcherScore.score,
      bat: awayBattingScore.score,
      bullpen: awayBullpenScore.score,
      form: awayFormScore.score,
      market: marketScore.away.score,
    });

  const homeXsi =
    calculateXsiEngine({
      pitch: homePitcherScore.score,
      bat: homeBattingScore.score,
      bullpen: homeBullpenScore.score,
      form: homeFormScore.score,
      market: marketScore.home.score,
    });

  const valueScore = {
    score: Math.round(
      awayXsi.total * 0.5 +
        winProbability.awayWinProbability * 0.5,
    ),
    grade: "A",
  };

  const betAdvisor =
    calculateBetAdvisor({
      pitch: homePitcherScore.score,
      batting: homeBattingScore.score,
      bullpen: homeBullpenScore.score,
      form: homeFormScore.score,
      market: marketScore.home.score,
      spread:
        marketData?.consensus.homeSpread ?? null,
    });

  return (
  <>
  
    <PredictionHistorySaver
      gamePk={gamePk}
      homeTeam={homeTeamName}
      awayTeam={awayTeamName}
      prediction={betAdvisor.recommendation}
      confidence={betAdvisor.confidence}
    />

    <GameAnalysis
        data={{
        membership,

        game,

        awayTeamId,
        homeTeamId,

        awayTeamName,
        homeTeamName,

        awayPitcher,
        homePitcher,

        awayPitcherScore,
        homePitcherScore,

        awayBattingScore,
        homeBattingScore,

        awayBullpenScore,
        homeBullpenScore,

        awayFormScore,
        homeFormScore,

        awayRecentGames,
        homeRecentGames,

        awayBullpenStats,
        homeBullpenStats,

        marketData,
        marketScore,

        headToHeadGames,

        winProbability,

        awayXsi,
        homeXsi,

        valueScore,

          betAdvisor,
        }}
      />
    </>
  );
}