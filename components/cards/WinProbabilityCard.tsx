type Props = {
  awayTeamName: string;
  homeTeamName: string;
  awayProbability: number;
  homeProbability: number;
  isVip: boolean;
};

function clampProbability(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function getConfidenceLabel(
  awayProbability: number,
  homeProbability: number,
): string {
  const difference = Math.abs(
    awayProbability - homeProbability,
  );

  if (difference >= 35) return "明顯優勢";
  if (difference >= 22) return "優勢明確";
  if (difference >= 12) return "略有優勢";
  if (difference >= 5) return "接近五五波";

  return "勢均力敵";
}

function ProbabilityRow({
  teamName,
  probability,
  isLeading,
}: {
  teamName: string;
  probability: number;
  isLeading: boolean;
}) {
  const safeProbability = clampProbability(probability);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            {teamName}
          </p>

          <p
            className={
              isLeading
                ? "mt-2 text-5xl font-black text-yellow-400"
                : "mt-2 text-5xl font-black text-white"
            }
          >
            {safeProbability.toFixed(1)}%
          </p>
        </div>

        <span
          className={
            isLeading
              ? "rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-black"
              : "rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-400"
          }
        >
          {isLeading ? "模型領先" : "追趕方"}
        </span>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={
            isLeading
              ? "h-full rounded-full bg-yellow-400"
              : "h-full rounded-full bg-zinc-500"
          }
          style={{
            width: `${safeProbability}%`,
          }}
        />
      </div>
    </div>
  );
}

export default function WinProbabilityCard({
  awayTeamName,
  homeTeamName,
  awayProbability,
  homeProbability,
}: Props) {
  const awayIsLeading =
    awayProbability > homeProbability;

  const homeIsLeading =
    homeProbability > awayProbability;

  const leadingTeam =
    awayProbability === homeProbability
      ? "雙方相同"
      : awayIsLeading
        ? awayTeamName
        : homeTeamName;

  const confidenceLabel = getConfidenceLabel(
    awayProbability,
    homeProbability,
  );

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-400/10 via-zinc-950 to-black">
      <div className="p-6 md:p-8">

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
              XSI Win Probability
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              AI 勝率預測
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              綜合先發投手、打線、牛棚、近期狀態、市場盤口及歷史交手計算。
            </p>
          </div>


          <div className="rounded-2xl border border-yellow-500/20 bg-black/30 px-5 py-4 md:text-right">
            <p className="text-xs text-zinc-500">
              模型方向
            </p>

            <p className="mt-1 text-xl font-black text-yellow-400">
              {leadingTeam}
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              {confidenceLabel}
            </p>
          </div>
        </div>


        <div className="mt-7 grid gap-5 lg:grid-cols-2">

          <ProbabilityRow
            teamName={awayTeamName}
            probability={awayProbability}
            isLeading={awayIsLeading}
          />


          <ProbabilityRow
            teamName={homeTeamName}
            probability={homeProbability}
            isLeading={homeIsLeading}
          />

        </div>


        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <p className="text-xs text-zinc-500">
                勝率總和
              </p>

              <p className="mt-1 text-lg font-black text-white">
                {(
                  clampProbability(awayProbability) +
                  clampProbability(homeProbability)
                ).toFixed(1)}
                %
              </p>
            </div>


            <p className="max-w-xl text-sm leading-6 text-zinc-500">
              勝率為模型估算值，不代表實際比賽結果或保證獲利。
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}