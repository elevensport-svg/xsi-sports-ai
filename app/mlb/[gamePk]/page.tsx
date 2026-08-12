import PredictionHistorySaver from "../../../components/analysis/PredictionHistorySaver";
import GameAnalysis from "../../../components/game/GameAnalysis";

import { getCurrentUserMembership } from "../../../lib/membership";

import {
  getMlbGameByPk,
} from "../../../lib/api/mlb";

import {
  calculateMlbGameAnalysis,
} from "../../../lib/xsi/mlbGameAnalysis";

type PageProps = {
  params: Promise<{
    gamePk: string;
  }>;
};

export default async function GamePage({
  params,
}: PageProps) {
  const { gamePk } =
    await params;

  console.log(
    "XSI GAME PAGE RUN",
    gamePk,
  );

  /* ==========================================
     1. 會員資料
  ========================================== */

  const membership =
    await getCurrentUserMembership();

  /* ==========================================
     2. 取得明日 MLB 賽程
  ========================================== */

  const game =
  await getMlbGameByPk(
    gamePk,
  );

  /* ==========================================
     3. 找不到比賽
  ========================================== */

  if (!game) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-zinc-950 px-3 py-6 pb-28 text-white sm:px-6 sm:py-10">
        <div className="mx-auto w-full max-w-6xl">

          <a
            href="/mlb"
            className="inline-block rounded-lg border border-yellow-500/30 px-4 py-2 text-sm font-bold text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
          >
            ← 返回明日賽事
          </a>

          <div className="mt-6 rounded-2xl border border-red-500/30 bg-zinc-900 p-5 sm:mt-8 sm:p-8">

            <h1 className="text-2xl font-bold sm:text-3xl">
              找不到這場比賽
            </h1>

            <p className="mt-3 break-all text-sm text-zinc-400">
              Game ID：
              {gamePk}
            </p>

          </div>

        </div>
      </main>
    );
  }

  /* ==========================================
     4. XSI 共用分析

     所有 MLB 單場分析統一由
     mlbGameAnalysis.ts 計算
  ========================================== */

  const analysis =
    await calculateMlbGameAnalysis(
      game,
    );

  const {
    awayTeamName,
    homeTeamName,

    betAdvisor,
  } = analysis;

  /* ==========================================
     5. 歷史紀錄 + 分析畫面
  ========================================== */

  return (
    <>
      <PredictionHistorySaver
        gamePk={gamePk}
        homeTeam={
          homeTeamName
        }
        awayTeam={
          awayTeamName
        }
        prediction={
          betAdvisor.recommendation
        }
        confidence={
          betAdvisor.confidence
        }
      />

      <GameAnalysis
        data={{
          membership,

          ...analysis,
        }}
      />
    </>
  );
}