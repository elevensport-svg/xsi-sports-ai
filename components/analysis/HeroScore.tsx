type HeroScoreProps = {
  score: number;
  confidence: number;
  recommendation: string;
};

export default function HeroScore({
  score,
  confidence,
  recommendation,
}: HeroScoreProps) {
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-8">
      <p className="text-sm font-bold uppercase tracking-widest text-yellow-400">
        XSI Score
      </p>

      <p className="mt-4 text-6xl font-black text-yellow-400">
        {score}
      </p>

      <p className="mt-3 text-lg text-zinc-300">
        信心指數：{confidence}%
      </p>

      <div className="mt-6 inline-block rounded-xl bg-yellow-400 px-6 py-3 font-bold text-black">
        {recommendation}
      </div>
    </div>
  );
}