type RecommendationCardProps = {
  team: string;
  recommendation: string;
  confidence: number;
  risk: string;
  scoreDiff: number;
  pitcherDiff: number;
  battingDiff: number;
  formDiff: number;
};

function stars(value: number) {
  if (value >= 90) return "★★★★★";
  if (value >= 75) return "★★★★☆";
  if (value >= 60) return "★★★☆☆";
  if (value >= 45) return "★★☆☆☆";
  return "★☆☆☆☆";
}

export default function RecommendationCard({
  team,
  recommendation,
  confidence,
  risk,
  scoreDiff,
  pitcherDiff,
  battingDiff,
  formDiff,
}: RecommendationCardProps) {
  return (
    <section className="mt-8 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6 md:p-8">
      <p className="text-sm font-black text-yellow-400">
        AI 推薦
      </p>

      <h2 className="mt-2 text-3xl font-black">
        {team}
      </h2>

      <p className="mt-2 text-xl font-bold text-yellow-400">
        {recommendation}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">
            Confidence
          </p>

          <p className="mt-2 text-3xl font-black text-yellow-400">
            {confidence}%
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            {stars(confidence)}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">
            綜合差距
          </p>

          <p className="mt-2 text-3xl font-black">
            {scoreDiff}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">
            風險
          </p>

          <p className="mt-2 text-3xl font-black">
            {risk}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500">
            評級
          </p>

          <p className="mt-2 text-3xl font-black text-yellow-400">
            {stars(confidence)}
          </p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl bg-zinc-900 p-5">
        <p className="font-bold text-yellow-400">
          AI 判斷依據
        </p>

        <ul className="mt-4 space-y-2 text-zinc-300">
          <li>• 投手差距：{pitcherDiff} 分</li>
          <li>• 打線差距：{battingDiff} 分</li>
          <li>• 近況差距：{formDiff} 分</li>
        </ul>
      </div>
    </section>
  );
}