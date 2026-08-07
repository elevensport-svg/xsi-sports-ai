import BetAdvisorCard from "../../../components/cards/BetAdvisorCard";
import {
  calculateBetAdvisor,
} from "../../../lib/xsi/betAdvisor";

import { currentUser } from "../../../lib/membership";

import ValueScoreCard from "../../../components/cards/ValueScoreCard";

import {
  calculateH2HScore,
} from "../../../lib/xsi/h2h";

import {
  calculateWinProbability,
} from "../../../lib/xsi/win-probability";

import WinProbabilityCard from "../../../components/cards/WinProbabilityCard";

import {
  getBullpenStats,
} from "../../../lib/api/bullpen";

import {
  calculateBullpenScore,
} from "../../../lib/xsi/bullpen";

import BullpenCard from "../../../components/cards/BullpenCard";

import {
  getHeadToHeadGames,
} from "../../../lib/api/head-to-head";

import H2HCard from "../../../components/cards/H2HCard";

import {
  getTeamRecentGames,
} from "../../../lib/api/recent-games";

import RecentGamesCard from "../../../components/cards/RecentGamesCard";

import AIRecommendationCard from "../../../components/cards/AIRecommendationCard";

import {
  getMlbMarketData,
} from "../../../lib/api/market";

import {
  calculateMarketScore,
} from "../../../lib/xsi/market";

import MarketCard from "../../../components/cards/MarketCard";

import {
  getTeamBattingStats,
} from "../../../lib/api/batting";

import {
  calculateBattingScore,
} from "../../../lib/xsi/batting";

import {
  getTeamRecentForm,
} from "../../../lib/api/teamForm";

import {
  calculateFormScore,
} from "../../../lib/xsi/recent";

import {
  calculateXsiEngine,
} from "../../../lib/xsi/engine";

import {
  formatTaiwanGameTime,
  getMlbGamesByTaiwanDate,
  getTaiwanTomorrow,
} from "../../../lib/api/mlb";

import {
  getMlbTeamLogo,
  getMlbTeamName,
} from "../../../lib/teams/mlb";

import {
  getPitcherSeasonStats,
} from "../../../lib/api/pitcher";

import {
  calculatePitcherScore,
} from "../../../lib/xsi/pitcher";


type PageProps = {
  params: Promise<{
    gamePk: string;
  }>;
};


function StatItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-zinc-950 p-3 text-center">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-white">
        {value}
      </p>
    </div>
  );
}


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
    <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-400/5 p-4 text-left">

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
            XSI Pitch
          </p>

          <p className="mt-1 text-sm text-zinc-400">
            {grade}
          </p>
        </div>

        <p className="text-4xl font-black text-yellow-400">
          {score}
        </p>
      </div>


      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-yellow-400"
          style={{
            width: `${score}%`,
          }}
        />
      </div>


      {reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {reasons.map((reason) => (
            <p
              key={reason}
              className="text-xs text-zinc-500"
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

  const {
    gamePk,
  } = await params;


  const games =
    await getMlbGamesByTaiwanDate(
      getTaiwanTomorrow(),
    );


  const game =
    games.find(
      (item) =>
        String(item.gamePk) === gamePk,
    );


  if (!game) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-zinc-950 px-4 py-10 text-white sm:px-6">

        <div className="mx-auto max-w-6xl">

          <a
            href="/"
            className="inline-block rounded-lg border border-yellow-500/30 px-4 py-2 text-yellow-400"
          >
            ← 返回明日賽事
          </a>


          <div className="mt-8 rounded-2xl border border-red-500/30 bg-zinc-900 p-8">

            <h1 className="text-3xl font-bold">
              找不到這場比賽
            </h1>


            <p className="mt-3 text-zinc-400">
              Game ID：{gamePk}
            </p>

          </div>

        </div>

      </main>
    );
  }


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
    game.teams.away.probablePitcher;


  const homePitcher =
    game.teams.home.probablePitcher;

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


  const headToHeadGames =
    await getHeadToHeadGames(
      awayTeamId,
      homeTeamId,
    );


  const headToHead =
    calculateH2HScore(
      headToHeadGames,
    );


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


  const marketData =
    await getMlbMarketData(
      game.teams.away.team.name,
      game.teams.home.team.name,
    );


  const marketScore =
    calculateMarketScore(
      marketData,
    );


  const awayBattingScore =
    calculateBattingScore(
      awayBattingStats,
    );


  const homeBattingScore =
    calculateBattingScore(
      homeBattingStats,
    );


  const winProbability =
    calculateWinProbability(
      {
        pitch:
          awayPitcherScore.score ?? 50,
        batting:
          awayBattingScore.score ?? 50,
        bullpen:
          awayBullpenScore.score ?? 50,
        form:
          awayFormScore.score ?? 50,
        market:
          marketScore.away.score ?? 50,
        h2h:
          headToHead.teamAScore ?? 50,
      },
      {
        pitch:
          homePitcherScore.score ?? 50,
        batting:
          homeBattingScore.score ?? 50,
        bullpen:
          homeBullpenScore.score ?? 50,
        form:
          homeFormScore.score ?? 50,
        market:
          marketScore.home.score ?? 50,
        h2h:
          headToHead.teamBScore ?? 50,
      },
    );


  const awayXsi =
    calculateXsiEngine({
      pitch:
        awayPitcherScore.score,
      bat:
        awayBattingScore.score,
      bullpen:
        awayBullpenScore.score,
      form:
        awayFormScore.score,
      market:
        marketScore.away.score,
    });


  const homeXsi =
    calculateXsiEngine({
      pitch:
        homePitcherScore.score,
      bat:
        homeBattingScore.score,
      bullpen:
        homeBullpenScore.score,
      form:
        homeFormScore.score,
      market:
        marketScore.home.score,
    });


  const betAdvisor =
    calculateBetAdvisor({
      pitch:
        homePitcherScore.score,
      batting:
        homeBattingScore.score,
      bullpen:
        homeBullpenScore.score,
      form:
        homeFormScore.score,
      market:
        marketScore.home.score,
      spread:
        marketData?.consensus.homeSpread ?? null,
    });


  const valueScore = {
    score: Math.round(
      awayXsi.total * 0.5 +
      winProbability.awayWinProbability * 0.5,
    ),
    grade: "A",
  };


  return (

    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">

      <div className="mx-auto max-w-[1400px]">

        <a
          href="/"
          className="inline-block rounded-lg border border-yellow-500/30 px-4 py-2 text-yellow-400 hover:bg-yellow-400 hover:text-black"
        >
          ← 返回明日賽事
        </a>


        <section className="mt-8 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-8">


          <p className="text-sm font-bold text-yellow-400">
            MLB GAME ANALYSIS
          </p>


          <h1 className="mt-2 text-4xl font-black">
            {awayTeamName} vs {homeTeamName}
          </h1>


          <p className="mt-3 text-zinc-400">
            比賽時間：
            {formatTaiwanGameTime(
              game.gameDate,
            )}
          </p>


          <p className="text-sm text-zinc-500">
            Game ID：{gamePk}
          </p>



          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_auto_1fr]">


            <div className="rounded-2xl bg-zinc-800 p-6 text-center">

              <p className="text-sm text-zinc-400">
                AWAY
              </p>


              <img
                src={getMlbTeamLogo(awayTeamId)}
                alt={awayTeamName}
                className="mx-auto mt-4 h-28 w-28 object-contain"
              />


              <h2 className="mt-4 text-2xl font-bold">
                {awayTeamName}
              </h2>


              <div className="mt-6 rounded-xl bg-zinc-900 p-5">

                <p className="text-sm text-zinc-400">
                  STARTING PITCHER
                </p>


                <p className="mt-2 text-xl font-bold">
                  {awayPitcher?.fullName ?? "TBD"}
                </p>


                <PitcherScoreCard
                  score={awayPitcherScore.score}
                  grade={awayPitcherScore.grade}
                  reasons={awayPitcherScore.reasons}
                />

              </div>

            </div>



            <div className="flex items-center justify-center text-5xl font-black text-yellow-400">
              VS
            </div>



            <div className="rounded-2xl bg-zinc-800 p-6 text-center">

              <p className="text-sm text-zinc-400">
                HOME
              </p>


              <img
                src={getMlbTeamLogo(homeTeamId)}
                alt={homeTeamName}
                className="mx-auto mt-4 h-28 w-28 object-contain"
              />


              <h2 className="mt-4 text-2xl font-bold">
                {homeTeamName}
              </h2>


              <div className="mt-6 rounded-xl bg-zinc-900 p-5">

                <p className="text-sm text-zinc-400">
                  STARTING PITCHER
                </p>


                <p className="mt-2 text-xl font-bold">
                  {homePitcher?.fullName ?? "TBD"}
                </p>


                <PitcherScoreCard
                  score={homePitcherScore.score}
                  grade={homePitcherScore.grade}
                  reasons={homePitcherScore.reasons}
                />

              </div>

            </div>

          </div>

 <div className="mt-10 grid gap-8 xl:grid-cols-2">

            <div className="rounded-xl bg-zinc-800 p-5">

              <p className="text-sm text-zinc-400">
                {awayTeamName} BATTING
              </p>

              <p className="mt-3 text-3xl font-bold text-yellow-400">
                XSI Bat {awayBattingScore.score}
              </p>

              <p className="mt-3 text-zinc-500">
                AVG：{awayBattingStats?.avg ?? "-"}
              </p>

              <p className="mt-2 text-zinc-500">
                OPS：{awayBattingStats?.ops ?? "-"}
              </p>

            </div>


            <div className="rounded-xl bg-zinc-800 p-5">

              <p className="text-sm text-zinc-400">
                {homeTeamName} BATTING
              </p>

              <p className="mt-3 text-3xl font-bold text-yellow-400">
                XSI Bat {homeBattingScore.score}
              </p>

              <p className="mt-3 text-zinc-500">
                AVG：{homeBattingStats?.avg ?? "-"}
              </p>

              <p className="mt-2 text-zinc-500">
                OPS：{homeBattingStats?.ops ?? "-"}
              </p>

            </div>

          </div>



          <div className="mt-10 grid gap-8 xl:grid-cols-2">


            <div className="rounded-xl bg-zinc-800 p-5">

              <p className="text-sm text-zinc-400">
                {awayTeamName} RECENT FORM
              </p>


              <p className="mt-3 text-3xl font-bold text-yellow-400">
                XSI Form {awayFormScore.score}
              </p>


              <p className="mt-3 text-zinc-500">
                近10場：
                {awayFormStats?.wins ?? 0}勝
                {awayFormStats?.losses ?? 0}敗
              </p>


              <p className="mt-2 text-zinc-500">
                趨勢：
                {awayFormStats?.streak ?? "-"}
              </p>

            </div>



            <div className="rounded-xl bg-zinc-800 p-5">

              <p className="text-sm text-zinc-400">
                {homeTeamName} RECENT FORM
              </p>


              <p className="mt-3 text-3xl font-bold text-yellow-400">
                XSI Form {homeFormScore.score}
              </p>


              <p className="mt-3 text-zinc-500">
                近10場：
                {homeFormStats?.wins ?? 0}勝
                {homeFormStats?.losses ?? 0}敗
              </p>


              <p className="mt-2 text-zinc-500">
                趨勢：
                {homeFormStats?.streak ?? "-"}
              </p>

            </div>

          </div>




          <div className="mt-10 grid gap-8">


            <BullpenCard
              awayTeamName={awayTeamName}
              homeTeamName={homeTeamName}
              awayStats={awayBullpenStats}
              homeStats={homeBullpenStats}
              awayScore={awayBullpenScore}
              homeScore={homeBullpenScore}
            />



            <WinProbabilityCard
              awayTeamName={awayTeamName}
              homeTeamName={homeTeamName}
              awayProbability={winProbability.awayWinProbability}
              homeProbability={winProbability.homeWinProbability}
              isVip={currentUser.level === "vip"}
            />



            <ValueScoreCard
              score={valueScore.score}
              grade={valueScore.grade}
              isVip={currentUser.level === "vip"}
              details={[
                {
                  label:"Pitch",
                  value:18,
                },
                {
                  label:"Batting",
                  value:12,
                },
                {
                  label:"Bullpen",
                  value:15,
                },
                {
                  label:"Market",
                  value:14,
                },
                {
                  label:"Form",
                  value:8,
                },
                {
                  label:"H2H",
                  value:5,
                },
              ]}
            />


          </div>




          <div className="mt-10 grid min-w-0 gap-8 [&>*]:min-w-0 [&>*]:max-w-full">

            <div className="min-w-0 max-w-full overflow-hidden">
              <BetAdvisorCard
              isVip={currentUser.level === "vip"}
              recommendation={betAdvisor.recommendation}
              confidence={betAdvisor.confidence}
              score={betAdvisor.score}
              reasons={betAdvisor.reasons}
              risk={betAdvisor.risk}
              />
            </div>


            <div className="min-w-0 max-w-full overflow-hidden">
              <AIRecommendationCard
  isVip={currentUser.level === "vip"}
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
            </div>



            <div className="min-w-0 max-w-full overflow-hidden">
              <H2HCard
              teamAId={awayTeamId}
              teamAName={awayTeamName}
              teamBId={homeTeamId}
              teamBName={homeTeamName}
              summary={headToHeadGames}
              />
            </div>



            <div className="min-w-0 max-w-full overflow-hidden">
              <RecentGamesCard
              awayTeamName={awayTeamName}
              homeTeamName={homeTeamName}
              awaySummary={awayRecentGames}
              homeSummary={homeRecentGames}
              />
            </div>



            <div className="min-w-0 max-w-full overflow-hidden">
              <MarketCard
              market={marketData}
              scores={marketScore}
              />
            </div>

          </div>



        </section>

      </div>

    </main>

  );

}
