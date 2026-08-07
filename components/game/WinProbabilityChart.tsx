type Props = {
  awayTeam: string;
  homeTeam: string;

  awayProbability: number;
  homeProbability: number;

  awayRuns: number | null;
  homeRuns: number | null;
  totalRuns: number | null;
};

export default function WinProbabilityChart({
  awayTeam,
  homeTeam,
  awayProbability,
  homeProbability,
  awayRuns,
  homeRuns,
  totalRuns,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900">

      <header className="border-b border-zinc-800 px-8 py-6">

        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">
          WIN PROBABILITY
        </p>

        <h2 className="mt-3 text-3xl font-black">
          AI Win Projection
        </h2>

      </header>

      <div className="space-y-10 p-8">

        <div>

          <div className="mb-4 flex items-center justify-between">

            <span className="font-semibold">
              {awayTeam}
            </span>

            <span className="text-3xl font-black text-yellow-400">
              {awayProbability.toFixed(1)}%
            </span>

          </div>

          <div className="h-5 overflow-hidden rounded-full bg-zinc-800">

            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 transition-all duration-700"
              style={{
                width: `${awayProbability}%`,
              }}
            />

          </div>

        </div>

        <div>

          <div className="mb-4 flex items-center justify-between">

            <span className="font-semibold">
              {homeTeam}
            </span>

            <span className="text-3xl font-black text-yellow-400">
              {homeProbability.toFixed(1)}%
            </span>

          </div>

          <div className="h-5 overflow-hidden rounded-full bg-zinc-800">

            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-red-400 to-red-300 transition-all duration-700"
              style={{
                width: `${homeProbability}%`,
              }}
            />

          </div>

        </div>

        <div className="grid gap-5 pt-4 md:grid-cols-3">

          <MetricCard
            title="Projected Away Runs"
            value={
              awayRuns?.toFixed(1) ?? "-"
            }
          />

          <MetricCard
            title="Projected Home Runs"
            value={
              homeRuns?.toFixed(1) ?? "-"
            }
          />

          <MetricCard
            title="Expected Total"
            value={
              totalRuns?.toFixed(1) ?? "-"
            }
          />

        </div>

      </div>

    </section>
  );
}

type MetricProps = {
  title: string;
  value: string;
};

function MetricCard({
  title,
  value,
}: MetricProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">

      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </p>

      <p className="mt-4 text-4xl font-black text-yellow-400">
        {value}
      </p>

    </div>
  );
}