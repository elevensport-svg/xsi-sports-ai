import type {
  GamePrediction,
  GameRecommendation,
} from "@/types/game";

import type {
  ValueAnalysis,
} from "@/lib/xsi/value";

type Props = {
  awayTeam: string;
  homeTeam: string;

  prediction: GamePrediction;

  recommendation: GameRecommendation;

  value: ValueAnalysis;
};

export default function PredictionSummary({
  awayTeam,
  homeTeam,
  prediction,
  recommendation,
  value,
}: Props) {
  const winner =
    recommendation.recommendedSide === "away"
      ? awayTeam
      : recommendation.recommendedSide === "home"
        ? homeTeam
        : "No Play";

  return (
    <section className="overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#1a1a1a] via-[#111] to-black">

      <div className="border-b border-zinc-800 px-8 py-6">

        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">
          XSI SPORTS AI V2
        </p>

        <h1 className="mt-3 text-4xl font-black">
          Final Prediction
        </h1>

      </div>

      <div className="grid gap-8 p-8 lg:grid-cols-[2fr_1fr]">

        <div>

          <div className="rounded-2xl bg-yellow-400 p-8 text-black">

            <p className="text-sm font-bold uppercase tracking-widest">
              AI PICK
            </p>

            <h2 className="mt-3 text-5xl font-black">
              {winner}
            </h2>

            <p className="mt-5 text-lg leading-8">
              {recommendation.summary}
            </p>

          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">

            <Metric
              title="Confidence"
              value={`${recommendation.confidenceScore}%`}
            />

            <Metric
              title="Recommendation"
              value={recommendation.type.toUpperCase()}
            />

            <Metric
              title="Risk"
              value={recommendation.risk.toUpperCase()}
            />

          </div>

          <div className="mt-8 rounded-2xl border border-zinc-800 bg-black/40 p-6">

            <h3 className="text-xl font-bold">
              Projected Score
            </h3>

            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center">

              <div className="text-center">

                <p className="text-sm text-zinc-500">
                  {awayTeam}
                </p>

                <p className="mt-3 text-6xl font-black text-blue-400">
                  {prediction.projectedAwayRuns?.toFixed(1)}
                </p>

              </div>

              <div className="px-8 text-3xl font-black text-yellow-400">
                :
              </div>

              <div className="text-center">

                <p className="text-sm text-zinc-500">
                  {homeTeam}
                </p>

                <p className="mt-3 text-6xl font-black text-red-400">
                  {prediction.projectedHomeRuns?.toFixed(1)}
                </p>

              </div>

            </div>

          </div>

        </div>

        <div className="space-y-5">

          <SideCard
            title="Away Win"
            value={`${prediction.winProbabilityAway.toFixed(1)}%`}
          />

          <SideCard
            title="Home Win"
            value={`${prediction.winProbabilityHome.toFixed(1)}%`}
          />

          <SideCard
            title="Expected Total"
            value={
              prediction.projectedTotalRuns?.toFixed(1) ??
              "-"
            }
          />

          <SideCard
            title="Best Value"
            value={
              value.bestBet
                ? value.bestBet.side === "away"
                  ? awayTeam
                  : homeTeam
                : "-"
            }
          />

          <SideCard
            title="Value Edge"
            value={
              value.bestBet
                ? `${value.bestBet.edge.toFixed(2)}%`
                : "-"
            }
          />

          <SideCard
            title="Kelly"
            value={
              value.bestBet
                ? `${(
                    value.bestBet.kellyFraction * 100
                  ).toFixed(1)}%`
                : "-"
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

function Metric({
  title,
  value,
}: MetricProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">

      <p className="text-xs uppercase tracking-widest text-zinc-500">
        {title}
      </p>

      <p className="mt-3 text-2xl font-black">
        {value}
      </p>

    </div>
  );
}

type SideCardProps = {
  title: string;
  value: string;
};

function SideCard({
  title,
  value,
}: SideCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">

      <p className="text-xs uppercase tracking-widest text-zinc-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-black text-yellow-400">
        {value}
      </p>

    </div>
  );
}