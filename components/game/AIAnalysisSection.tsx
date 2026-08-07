import type { AnalysisFactor } from "@/types/game";

type Props = {
  factors: AnalysisFactor[];
};

export default function AIAnalysisSection({
  factors,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
          AI Analysis
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Key Matchup Factors
        </h2>
      </div>

      {factors.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-8 text-center">
          <p className="text-lg font-semibold text-white">
            No Clear Advantage
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            雙方主要模組評分接近，目前沒有明顯優勢。
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {factors.map((factor, index) => (
            <FactorCard
              key={factor.key}
              factor={factor}
              rank={index + 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type FactorCardProps = {
  factor: AnalysisFactor;
  rank: number;
};

function FactorCard({
  factor,
  rank,
}: FactorCardProps) {
  const advantageLabel =
    factor.advantage === "away"
      ? "Away"
      : factor.advantage === "home"
        ? "Home"
        : "Even";

  const impactLabel =
    factor.impact === "high"
      ? "High Impact"
      : factor.impact === "medium"
        ? "Medium Impact"
        : "Low Impact";

  return (
    <article className="rounded-2xl border border-zinc-800 bg-black/40 p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black text-black">
          {rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-white">
              {factor.title}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                factor.impact === "high"
                  ? "bg-red-500/20 text-red-300"
                  : factor.impact === "medium"
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-zinc-700 text-zinc-300"
              }`}
            >
              {impactLabel}
            </span>
          </div>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {factor.description}
          </p>
        </div>

        <div className="shrink-0 text-left md:text-right">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Advantage
          </p>

          <p
            className={`mt-2 text-xl font-bold ${
              factor.advantage === "away"
                ? "text-blue-300"
                : factor.advantage === "home"
                  ? "text-red-300"
                  : "text-zinc-300"
            }`}
          >
            {advantageLabel}
          </p>
        </div>
      </div>
    </article>
  );
}