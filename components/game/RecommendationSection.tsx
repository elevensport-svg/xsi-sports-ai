import type { GameRecommendation } from "@/types/game";

type Props = {
  recommendation: GameRecommendation;
};

export default function RecommendationSection({
  recommendation,
}: Props) {
  const typeColor = {
    strong: "bg-green-500/20 text-green-300 border-green-500/30",
    lean: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    pass: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    avoid: "bg-red-500/20 text-red-300 border-red-500/30",
  }[recommendation.type];

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">

      <div className="mb-8">

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
          Recommendation
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          AI Betting Decision
        </h2>

      </div>

      <div className={`rounded-2xl border p-8 ${typeColor}`}>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h3 className="text-4xl font-black">
              {recommendation.teamName ?? "NO PLAY"}
            </h3>

            <p className="mt-4 max-w-2xl text-lg leading-8">
              {recommendation.summary}
            </p>

          </div>

          <div className="grid grid-cols-2 gap-4">

            <Metric
              label="Confidence"
              value={`${recommendation.confidenceScore}%`}
            />

            <Metric
              label="Edge"
              value={recommendation.edge.toFixed(1)}
            />

            <Metric
              label="Risk"
              value={recommendation.risk.toUpperCase()}
            />

            <Metric
              label="Play"
              value={recommendation.type.toUpperCase()}
            />

          </div>

        </div>

      </div>

      {recommendation.reasons.length > 0 && (

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-black/30 p-6">

          <h4 className="mb-4 text-lg font-bold">
            Reasons
          </h4>

          <ul className="space-y-3">

            {recommendation.reasons.map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-3"
              >
                <div className="mt-2 h-2 w-2 rounded-full bg-green-400" />

                <span className="text-zinc-300">
                  {reason}
                </span>
              </li>
            ))}

          </ul>

        </div>

      )}

      {recommendation.warnings.length > 0 && (

        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">

          <h4 className="mb-4 text-lg font-bold text-red-300">
            Warnings
          </h4>

          <ul className="space-y-3">

            {recommendation.warnings.map((warning) => (
              <li
                key={warning}
                className="flex items-start gap-3"
              >
                <div className="mt-2 h-2 w-2 rounded-full bg-red-400" />

                <span className="text-zinc-300">
                  {warning}
                </span>
              </li>
            ))}

          </ul>

        </div>

      )}

    </section>
  );
}

type MetricProps = {
  label: string;
  value: string;
};

function Metric({
  label,
  value,
}: MetricProps) {
  return (
    <div className="rounded-xl bg-black/40 p-5 text-center">

      <p className="text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-bold text-white">
        {value}
      </p>

    </div>
  );
}