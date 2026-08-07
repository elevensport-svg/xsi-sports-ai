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
    <main className="min-h-screen bg-zinc-950 px-3 pt-12 pb-32 text-white">

      <div className="mx-auto w-full max-w-xl">


        {/* 標題區 */}
        <section className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5">


          <p className="text-xs font-black tracking-widest text-yellow-400">
            MLB GAME ANALYSIS
          </p>


          <h1 className="mt-3 text-2xl font-black leading-snug break-words">
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



          {/* 左右球隊 */}
          <div className="mt-8 grid grid-cols-2 gap-2">


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



        {/* 勝率 */}
        <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5">


          <p className="text-xs font-bold text-yellow-400">
            XSI WIN PROBABILITY
          </p>


          <div className="mt-4 grid grid-cols-2 gap-2">


            <div className="rounded-xl bg-zinc-950 p-3 text-center">

              <p className="truncate text-xs text-zinc-400">
                {awayTeamName}
              </p>

              <p className="mt-2 text-2xl font-black text-yellow-400">
                {winProbability.awayWinProbability}%
              </p>

            </div>



            <div className="rounded-xl bg-zinc-950 p-3 text-center">

              <p className="truncate text-xs text-zinc-400">
                {homeTeamName}
              </p>

              <p className="mt-2 text-2xl font-black text-yellow-400">
                {winProbability.homeWinProbability}%
              </p>

            </div>


          </div>


        </section>



        {/* AI */}
        <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5">


          <p className="text-xs text-zinc-500">
            XSI VALUE SCORE
          </p>


          <p className="mt-2 text-5xl font-black text-yellow-400">
            {valueScore.score}
          </p>


          <p className="mt-3 text-lg font-bold">
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

    <div className="rounded-2xl bg-zinc-800 p-3 text-center">


      <p className="text-[11px] text-zinc-400">
        {side}
      </p>


      <img
        src={getMlbTeamLogo(teamId)}
        alt={teamName}
        className="mx-auto mt-3 h-16 w-16 object-contain"
      />



      <h2 className="mt-3 truncate text-xs font-black">
        {teamName}
      </h2>



      <div className="mt-4 rounded-xl bg-zinc-950 p-3">


        <p className="text-[10px] text-zinc-500">
          STARTING PITCHER
        </p>


        <p className="mt-2 truncate text-xs font-bold">
          {pitcher?.fullName ?? "TBD"}
        </p>



        <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-400/5 p-2">


          <p className="text-left text-[10px] font-bold text-yellow-400">
            XSI PITCH
          </p>


          <p className="mt-1 text-3xl font-black text-yellow-400">
            {score.score}
          </p>


          <p className="text-left text-[10px] text-zinc-400">
            {score.grade}
          </p>


          <div className="mt-2 h-1.5 rounded-full bg-zinc-800">

            <div
              className="h-full rounded-full bg-yellow-400"
              style={{
                width:`${score.score}%`,
              }}
            />

          </div>


        </div>


      </div>


    </div>

  );
}