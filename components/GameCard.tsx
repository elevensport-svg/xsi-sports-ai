import Link from "next/link";
type GameCardProps = {
  gamePk: number;
  league: string;
  awayTeam: string;
  homeTeam: string;
  awayTeamLogo?: string;
  homeTeamLogo?: string;
  awayPitcher?: string;
  homePitcher?: string;
  time: string;
  status?: string;
};

export default function GameCard({
  gamePk,
  league,
  awayTeam,
  homeTeam,
  awayTeamLogo,
  homeTeamLogo,
  awayPitcher = "尚未公布",
  homePitcher = "尚未公布",
  time,
  status = "尚未開始",
}: GameCardProps) {
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-yellow-400 px-3 py-1 text-sm font-bold text-black">
          {league}
        </span>

        <span className="text-sm text-zinc-400">{status}</span>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-5">
        <div className="text-center">
          <p className="text-sm text-zinc-500">客隊</p>

          {awayTeamLogo && (
            <img
              src={awayTeamLogo}
              alt={`${awayTeam} Logo`}
              className="mx-auto mt-3 h-20 w-20 object-contain"
            />
          )}

          <h3 className="mt-3 text-xl font-bold">{awayTeam}</h3>

          <div className="mt-3 rounded-lg bg-zinc-800 p-3">
            <p className="text-xs text-zinc-500">預計先發</p>
            <p className="mt-1 text-sm font-semibold">{awayPitcher}</p>
          </div>
        </div>

        <div className="text-2xl font-bold text-yellow-400">VS</div>

        <div className="text-center">
          <p className="text-sm text-zinc-500">主隊</p>

          {homeTeamLogo && (
            <img
              src={homeTeamLogo}
              alt={`${homeTeam} Logo`}
              className="mx-auto mt-3 h-20 w-20 object-contain"
            />
          )}

          <h3 className="mt-3 text-xl font-bold">{homeTeam}</h3>

          <div className="mt-3 rounded-lg bg-zinc-800 p-3">
            <p className="text-xs text-zinc-500">預計先發</p>
            <p className="mt-1 text-sm font-semibold">{homePitcher}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-zinc-800 pt-4 text-center text-sm text-zinc-400">
        比賽時間：{time}
      </div>

      <Link
  href={`/mlb/${gamePk}`}
  className="mt-5 block w-full rounded-xl bg-yellow-400 px-4 py-3 text-center font-bold text-black hover:bg-yellow-300"
>
  查看分析
</Link>
    </div>
  );
}