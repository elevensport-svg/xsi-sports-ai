"use client";

import { formatTaiwanGameTime } from "../../lib/api/mlb";
import { getMlbTeamLogo } from "../../lib/teams/mlb";

type Props = {
  data: any;
};

export default function MobileGameAnalysis({
  data,
}: Props) {
  const {
    game,

    awayTeamId,
    homeTeamId,

    awayTeamName,
    homeTeamName,

    awayPitcher,
    homePitcher,

    awayPitcherScore,
    homePitcherScore,

    winProbability,

    valueScore,

    betAdvisor,
  } = data;


  return (
    <>
      <main className="min-h-screen bg-zinc-950 px-3 py-6 text-white">

        <div className="mx-auto w-full max-w-xl">


          <section className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5">


            <p className="text-xs font-black tracking-widest text-yellow-400">
              MLB GAME ANALYSIS
            </p>


            <h1 className="mt-3 text-3xl font-black leading-tight break-words">
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


            <p className="mt-1 text-xs text-zinc-500">
              Game ID：{game.gamePk}
            </p>



            {/* 手機左右對比 */}
            <div className="mt-8 grid grid-cols-2 gap-3">


              <TeamBox
                side="AWAY"
                teamId={awayTeamId}
                teamName={awayTeamName}
                pitcher={awayPitcher}
                score={awayPitcherScore}
              />


              <TeamBox
                side="HOME"
                teamId={homeTeamId}
                teamName={homeTeamName}
                pitcher={homePitcher}
                score={homePitcherScore}
              />


            </div>


          </section>



          <section className="mt-6 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5">

            <p className="text-xs font-black text-yellow-400">
              XSI WIN PROBABILITY
            </p>


            <div className="mt-4 grid grid-cols-2 gap-3">


              <div className="rounded-xl bg-black p-4 text-center">

                <p className="text-xs text-zinc-400">
                  {awayTeamName}
                </p>

                <p className="mt-2 text-3xl font-black text-yellow-400">
                  {winProbability.awayWinProbability}%
                </p>

              </div>


              <div className="rounded-xl bg-black p-4 text-center">

                <p className="text-xs text-zinc-400">
                  {homeTeamName}
                </p>

                <p className="mt-2 text-3xl font-black text-yellow-400">
                  {winProbability.homeWinProbability}%
                </p>

              </div>


            </div>

          </section>




          <section className="mt-6 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5">


            <p className="text-xs text-zinc-500">
              XSI VALUE SCORE
            </p>


            <p className="mt-3 text-5xl font-black text-yellow-400">
              {valueScore.score}
            </p>


            <p className="mt-4 text-lg font-bold">
              {betAdvisor.recommendation}
            </p>


          </section>



        </div>

      </main>
    </>
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


      <p className="text-xs text-zinc-400">
        {side}
      </p>


      <img
        src={getMlbTeamLogo(teamId)}
        alt={teamName}
        className="mx-auto mt-3 h-20 w-20 object-contain"
      />


      <h2 className="mt-3 text-sm font-black">
        {teamName}
      </h2>



      <div className="mt-4 rounded-xl bg-zinc-950 p-3">


        <p className="text-[10px] text-zinc-500">
          STARTING PITCHER
        </p>


        <p className="mt-2 text-sm font-bold">
          {pitcher?.fullName ?? "TBD"}
        </p>


        <p className="mt-3 text-3xl font-black text-yellow-400">
          {score.score}
        </p>


        <p className="text-xs text-zinc-400">
          {score.grade}
        </p>


      </div>


    </div>

  );
}