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
    <main className="min-h-screen bg-zinc-950 px-3 pt-10 pb-32 text-white">

      <div className="w-full">


        <section className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">


          <p className="text-xs font-black tracking-widest text-yellow-400">
            MLB GAME ANALYSIS
          </p>


          <h1 className="mt-3 text-2xl font-black leading-tight">
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



          {/* 固定左右兩隊 */}
          <div className="mt-8 flex w-full gap-2">


            <div className="w-1/2">
              <TeamBox
                side="AWAY"
                teamId={awayTeamId}
                teamName={awayTeamName}
                pitcher={awayPitcher}
                score={awayPitcherScore}
              />
            </div>



            <div className="w-1/2">
              <TeamBox
                side="HOME"
                teamId={homeTeamId}
                teamName={homeTeamName}
                pitcher={homePitcher}
                score={homePitcherScore}
              />
            </div>


          </div>


        </section>



        <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">

          <p className="text-xs font-bold text-yellow-400">
            XSI WIN PROBABILITY
          </p>


          <div className="mt-3 flex gap-2">


            <div className="w-1/2 rounded-xl bg-black p-3 text-center">

              <p className="truncate text-xs text-zinc-400">
                {awayTeamName}
              </p>

              <p className="mt-2 text-2xl font-black text-yellow-400">
                {winProbability.awayWinProbability}%
              </p>

            </div>



            <div className="w-1/2 rounded-xl bg-black p-3 text-center">

              <p className="truncate text-xs text-zinc-400">
                {homeTeamName}
              </p>

              <p className="mt-2 text-2xl font-black text-yellow-400">
                {winProbability.homeWinProbability}%
              </p>

            </div>


          </div>

        </section>



        <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">

          <p className="text-xs text-zinc-500">
            XSI VALUE SCORE
          </p>

          <p className="mt-2 text-5xl font-black text-yellow-400">
            {valueScore.score}
          </p>


          <p className="mt-3 font-bold">
            {betAdvisor.recommendation}
          </p>


        </section>


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

    <div className="min-w-0 rounded-2xl bg-zinc-800 p-2 text-center">


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



      <div className="mt-3 rounded-xl bg-zinc-950 p-2">


        <p className="text-[9px] text-zinc-500">
          先發投手
        </p>



        <p className="mt-2 truncate text-xs font-bold">
          {pitcher?.fullName ?? "TBD"}
        </p>



        <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-400/5 p-2">


          <p className="text-left text-[9px] font-bold text-yellow-400">
            XSI PITCH
          </p>


          <p className="text-3xl font-black text-yellow-400">
            {score.score}
          </p>



          <div className="mt-2 h-1 rounded-full bg-zinc-800">

            <div
              className="h-full rounded-full bg-yellow-400"
              style={{
                width: `${score.score}%`,
              }}
            />

          </div>


        </div>


      </div>


    </div>

  );
}