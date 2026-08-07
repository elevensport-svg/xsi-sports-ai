import type {
  GameRecommendation,
  XsiEngineResult,
} from "@/types/game";

type Props = {
  engine: XsiEngineResult;
  recommendation: GameRecommendation;
};

export default function HeroPrediction({
  engine,
  recommendation,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            XSI Prediction
          </p>

          <h2 className="mt-3 text-4xl font-black">
            {recommendation.teamName ?? "No Edge"}
          </h2>

          <p className="mt-3 max-w-xl text-zinc-400">
            {recommendation.summary}
          </p>

        </div>

        <div className="grid grid-cols-2 gap-5">

          <ScoreCard
            title="Away"
            score={engine.away.totalScore}
            probability={engine.away.winProbability}
            grade={engine.away.grade}
          />

          <ScoreCard
            title="Home"
            score={engine.home.totalScore}
            probability={engine.home.winProbability}
            grade={engine.home.grade}
          />

        </div>

      </div>

      <div className="mt-8 grid gap-4 border-t border-zinc-800 pt-8 md:grid-cols-4">

        <InfoCard
          label="Confidence"
          value={`${recommendation.confidenceScore}%`}
        />

        <InfoCard
          label="Risk"
          value={recommendation.risk.toUpperCase()}
        />

        <InfoCard
          label="Edge"
          value={recommendation.edge.toFixed(1)}
        />

        <InfoCard
          label="Recommendation"
          value={recommendation.type.toUpperCase()}
        />

      </div>

    </section>
  );
}

type ScoreCardProps = {
  title: string;
  score: number;
  probability: number;
  grade: string;
};

function ScoreCard({
  title,
  score,
  probability,
  grade,
}: ScoreCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 text-center">

      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
        {title}
      </p>

      <p className="mt-4 text-5xl font-black text-yellow-400">
        {score.toFixed(1)}
      </p>

      <p className="mt-3 text-lg font-semibold">
        Grade {grade}
      </p>

      <p className="mt-2 text-sm text-zinc-400">
        Win {probability.toFixed(1)}%
      </p>

    </div>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
};

function InfoCard({
  label,
  value,
}: InfoCardProps) {
  return (
    <div className="rounded-xl bg-black/40 p-5">

      <p className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-bold text-white">
        {value}
      </p>

    </div>
  );
}