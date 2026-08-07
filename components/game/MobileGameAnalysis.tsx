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

export default function MobileGameAnalysis({
  data,
}: Props) {
    console.log("手機版載入");
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

    awayFormScore,
    homeFormScore,

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
    <main className="min-h-screen bg-zinc-950 px-3 py-5 text-white">

      <div className="w-full">


        {/* Header */}
        <section className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">

          <p className="text-xs font-black tracking-widest text-yellow-400">
            MLB GAME ANALYSIS
          </p>


          <h1 className="mt-3 break-words text-xl font-black leading-tight">
            {awayTeamName}
            <span className="mx-2 text-yellow-400">
              VS
            </span>
            {homeTeamName}
          </h1>


          <p className="mt-3 text-sm text-zinc-400">
            比賽時間：
            {formatTaiwanGameTime(game.gameDate)}
          </p>

          <p className="text-xs text-zinc-500">
            Game ID：{game.gamePk}
          </p>

        </section>



        {/* 雙隊比較 */}
        <section className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">


          <TeamBox
            side="AWAY"
            teamId={awayTeamId}
            teamName={awayTeamName}
            pitcher={awayPitcher}
            score={awayPitcherScore}
          />


          <div className="text-lg font-black text-yellow-400">
            VS
          </div>


          <TeamBox
            side="HOME"
            teamId={homeTeamId}
            teamName={homeTeamName}
            pitcher={homePitcher}
            score={homePitcherScore}
          />


        </section>



        <WinProbabilityCard
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awayProbability={
            winProbability.awayWinProbability
          }
          homeProbability={
            winProbability.homeWinProbability
          }
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

    <div className="rounded-2xl bg-zinc-800 p-3 text-center">


      <p className="text-[10px] text-zinc-400">
        {side}
      </p>


      <img
        src={getMlbTeamLogo(teamId)}
        alt={teamName}
        className="mx-auto mt-3 h-14 w-14 object-contain"
      />


      <h2 className="mt-2 truncate text-xs font-black">
        {teamName}
      </h2>


      <div className="mt-3 rounded-xl bg-zinc-900 p-2">


        <p className="text-[9px] text-zinc-500">
          STARTING
        </p>


        <p className="mt-1 truncate text-xs font-bold">
          {pitcher?.fullName ?? "TBD"}
        </p>


        <p className="mt-3 text-3xl font-black text-yellow-400">
          {score.score}
        </p>


      </div>


    </div>

  );
}