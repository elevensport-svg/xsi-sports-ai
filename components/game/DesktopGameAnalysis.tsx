import BullpenCard from "../cards/BullpenCard";
import WinProbabilityCard from "../cards/WinProbabilityCard";
import ValueScoreCard from "../cards/ValueScoreCard";
import BetAdvisorCard from "../cards/BetAdvisorCard";
import AIRecommendationCard from "../cards/AIRecommendationCard";
import H2HCard from "../cards/H2HCard";
import RecentGamesCard from "../cards/RecentGamesCard";
import MarketCard from "../cards/MarketCard";

import { getMlbTeamLogo } from "../../lib/teams/mlb";
import { formatTaiwanGameTime } from "../../lib/api/mlb";


type Props = {
  data: any;
};


export default function DesktopGameAnalysis({
  data,
}: Props) {

  const {
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

    awayBattingStats,
    homeBattingStats,

    awayFormScore,
    homeFormScore,

    awayFormStats,
    homeFormStats,

    awayBullpenStats,
    homeBullpenStats,

    awayBullpenScore,
    homeBullpenScore,

    winProbability,

    valueScore,

    betAdvisor,

    awayXsi,
    homeXsi,

    marketScore,
    marketData,

    headToHeadGames,

    awayRecentGames,
    homeRecentGames,

  } = data;


  return (
    <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">

      <div className="mx-auto max-w-[1400px]">


        <section className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-8">

          <p className="text-sm font-bold text-yellow-400">
            MLB GAME ANALYSIS
          </p>


          <h1 className="mt-3 text-4xl font-black">
            {awayTeamName}

            <span className="mx-3 text-yellow-400">
              VS
            </span>

            {homeTeamName}
          </h1>


          <p className="mt-3 text-zinc-400">
            比賽時間：
            {formatTaiwanGameTime(game.gameDate)}
          </p>


          <p className="mt-1 text-sm text-zinc-500">
            Game ID：{game.gamePk}
          </p>


          <div className="mt-10 grid grid-cols-[1fr_auto_1fr] gap-8">


            <TeamBox
              side="AWAY"
              teamId={awayTeamId}
              teamName={awayTeamName}
              pitcher={awayPitcher}
              score={awayPitcherScore}
            />


            <div className="flex items-center text-5xl font-black text-yellow-400">
              VS
            </div>


            <TeamBox
              side="HOME"
              teamId={homeTeamId}
              teamName={homeTeamName}
              pitcher={homePitcher}
              score={homePitcherScore}
            />


          </div>


        </section>



        <WinProbabilityCard
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awayProbability={winProbability.awayWinProbability}
          homeProbability={winProbability.homeWinProbability}
          isVip={membership.isVip}
        />


        <ValueScoreCard
          score={valueScore.score}
          grade={valueScore.grade}
          isVip={membership.isVip}
        />


        <BetAdvisorCard
          isVip={membership.isVip}
          recommendation={betAdvisor.recommendation}
          confidence={betAdvisor.confidence}
          score={betAdvisor.score}
          reasons={betAdvisor.reasons}
          risk={betAdvisor.risk}
        />


        <AIRecommendationCard
          isVip={membership.isVip}
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awayXsi={awayXsi}
          homeXsi={homeXsi}
          awayPitchScore={awayPitcherScore.score}
          homePitchScore={homePitcherScore.score}
          awayBatScore={awayBattingScore.score}
          homeBatScore={homeBattingScore.score}
          awayBullpenScore={awayBullpenScore.score}
          homeBullpenScore={homeBullpenScore.score}
          awayFormScore={awayFormScore.score}
          homeFormScore={homeFormScore.score}
          awayMarketScore={marketScore.away.score}
          homeMarketScore={marketScore.home.score}
        />


        <H2HCard
          teamAId={awayTeamId}
          teamAName={awayTeamName}
          teamBId={homeTeamId}
          teamBName={homeTeamName}
          summary={headToHeadGames}
        />


        <RecentGamesCard
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awaySummary={awayRecentGames}
          homeSummary={homeRecentGames}
        />


        <MarketCard
          market={marketData}
          scores={marketScore}
        />


      </div>

    </main>
  );
}



function TeamBox({
  side,
  teamId,
  teamName,
  pitcher,
  score,
}: any) {

  return (

    <div className="rounded-2xl bg-zinc-800 p-6 text-center">


      <p className="text-sm text-zinc-400">
        {side}
      </p>


      <img
        src={getMlbTeamLogo(teamId)}
        className="mx-auto mt-5 h-28 w-28 object-contain"
      />


      <h2 className="mt-4 text-2xl font-black">
        {teamName}
      </h2>


      <div className="mt-6 rounded-xl bg-zinc-900 p-5">

        <p className="text-sm text-zinc-400">
          先發投手
        </p>


        <p className="mt-3 text-xl font-bold">
          {pitcher?.fullName ?? "TBD"}
        </p>


        <p className="mt-5 text-4xl font-black text-yellow-400">
          {score.score}
        </p>

      </div>

    </div>

  );
}