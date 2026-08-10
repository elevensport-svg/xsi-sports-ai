type Props = {
  total: number;
  wins: number;
  losses: number;
  spreadRate: number;
  overUnderRate: number;
  maxWinStreak: number;
};

export default function HistoryWinRateCard({
  total,
  wins,
  losses,
  spreadRate,
  overUnderRate,
  maxWinStreak,
}: Props) {
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">

      <h2 className="text-xl font-black text-white">
        歷史預測勝率
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-4">

        <div>
          <p className="text-sm text-zinc-400">
            總場次
          </p>
          <p className="text-3xl font-black text-yellow-400">
            {total}
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-400">
            勝率
          </p>
          <p className="text-3xl font-black text-yellow-400">
            {Math.round((wins / total) * 100)}%
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-400">
            讓分勝率
          </p>
          <p className="text-xl font-bold text-white">
            {spreadRate}%
          </p>
        </div>

        <div>
          <p className="text-sm text-zinc-400">
            大小分勝率
          </p>
          <p className="text-xl font-bold text-white">
            {overUnderRate}%
          </p>
        </div>

      </div>

      <div className="mt-5 border-t border-zinc-800 pt-4">
        <p className="text-sm text-zinc-400">
          最大連勝
        </p>

        <p className="text-2xl font-black text-yellow-400">
          {maxWinStreak} 連勝
        </p>
      </div>

    </div>
  );
}