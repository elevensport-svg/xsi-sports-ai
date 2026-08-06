type GameCardProps = {
  league: string;
  awayTeam: string;
  homeTeam: string;
  time: string;
  status?: string;
};

export default function GameCard({
  league,
  awayTeam,
  homeTeam,
  time,
  status = "尚未開始",
}: GameCardProps) {
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-6">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-yellow-400 px-3 py-1 text-sm font-bold text-black">
          {league}
        </span>

        <span className="text-sm text-zinc-400">{status}</span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <p className="text-sm text-zinc-500">客隊</p>
          <h3 className="mt-2 text-xl font-bold">{awayTeam}</h3>
        </div>

        <div className="text-2xl font-bold text-yellow-400">VS</div>

        <div className="flex-1 text-center">
          <p className="text-sm text-zinc-500">主隊</p>
          <h3 className="mt-2 text-xl font-bold">{homeTeam}</h3>
        </div>
      </div>

      <div className="mt-6 border-t border-zinc-800 pt-4 text-center text-sm text-zinc-400">
        比賽時間：{time}
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black transition hover:bg-yellow-300"
      >
        查看分析
      </button>
    </div>
  );
}