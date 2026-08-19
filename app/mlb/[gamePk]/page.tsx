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
     2. 取得 MLB 賽程
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
      <main className="relative min-h-screen overflow-hidden bg-[#fffaf3] px-4 py-8 text-[#4a4038] sm:px-6 sm:py-10">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#fff0a8]/35 blur-3xl" />

        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-[#dff5ff]/50 blur-3xl" />

        <div className="relative mx-auto w-full max-w-4xl">
          <a
            href="/mlb"
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[#eadcc8]
              bg-white
              px-4
              py-2.5
              text-sm
              font-black
              text-[#75685e]
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:border-[#ffc94a]
              hover:text-[#a56e14]
            "
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff3c9]">
              ←
            </span>

            <span>
              返回 MLB 賽事
            </span>
          </a>

          <div
            className="
              mt-8
              overflow-hidden
              rounded-[30px]
              border
              border-[#f0d7d7]
              bg-white
              p-8
              text-center
              shadow-[0_14px_35px_rgba(95,75,55,0.08)]
            "
          >
            <div
              className="
                mx-auto
                flex
                h-20
                w-20
                items-center
                justify-center
                rounded-[26px]
                bg-[#fff0f2]
                text-4xl
              "
            >
              😵‍💫
            </div>

            <h1
              className="
                mt-5
                text-2xl
                font-black
                text-[#4a4038]
                sm:text-3xl
              "
            >
              找不到這場比賽
            </h1>

            <p
              className="
                mt-3
                text-sm
                leading-6
                text-[#9c9085]
              "
            >
              可能是賽程已更新，
              或這場比賽目前不在 XSI 的賽程清單中。
            </p>

            <div
              className="
                mx-auto
                mt-5
                w-fit
                rounded-full
                bg-[#f8f4ef]
                px-4
                py-2
                text-xs
                font-bold
                text-[#a3988e]
              "
            >
              Game ID：{gamePk}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ==========================================
     4. XSI 共用分析
  ========================================== */

  console.time("⏱️ XSI MLB ANALYSIS");

const analysis =
  await calculateMlbGameAnalysis(
    game,
  );

console.timeEnd("⏱️ XSI MLB ANALYSIS");

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