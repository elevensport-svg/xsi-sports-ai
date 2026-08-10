type Props = {
  score: number;
  grade: string;
  isVip: boolean;

  details?: {
    label: string;
    value: number;
  }[];
};

function getLevel(score: number) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";

  return "D";
}

function getStars(score: number) {
  if (score >= 90) return "★★★★★";
  if (score >= 80) return "★★★★☆";
  if (score >= 70) return "★★★☆☆";

  return "★★☆☆☆";
}

export default function ValueScoreCard({
  score,
  grade,
  isVip,
  details = [],
}: Props) {
  return (
    <section className="mt-6 rounded-2xl border border-yellow-500/20 bg-zinc-950 p-5 sm:p-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
          XSI 價值評分
        </p>

        <p className="mt-2 text-sm text-zinc-500">
          AI 模型綜合評估
        </p>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row">
        <div>
          <p className="text-7xl font-black text-yellow-400">
            {score}
          </p>

          <p className="mt-2 text-2xl font-black text-white">
            評級 {grade || getLevel(score)}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900 px-6 py-5 text-center">
          <p className="text-xs text-zinc-500">
            價值星級
          </p>

          <p className="mt-2 text-3xl tracking-widest text-yellow-400">
            {getStars(score)}
          </p>
        </div>
      </div>

      {!isVip ? (
        <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-6 text-center">
          <p className="text-lg font-black text-white">
            🔒 XSI VIP 進階分析
          </p>

          <p className="mt-3 text-sm text-zinc-400">
            解鎖完整 AI 模型拆解
          </p>

          <div className="mt-5 grid gap-3 text-left md:grid-cols-2">
            {[
              "投手優勢",
              "牛棚深度",
              "市場價值",
              "AI 投注建議",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl bg-black/40 p-3 text-sm text-zinc-400"
              >
                🔒 {item}
              </div>
            ))}
          </div>

          <a
  href="https://lin.ee/r8t6pBB4"
  target="_blank"
  rel="noopener noreferrer"
  className="mt-6 inline-flex items-center justify-center rounded-full bg-yellow-400 px-6 py-3 font-black text-black transition hover:bg-yellow-300"
>
  升級 VIP 查看完整分析
</a>
        </div>
      ) : (
        <div className="mt-8">
          <p className="mb-4 text-sm font-black text-yellow-400">
            XSI 優勢分析
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {details.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">
                    {item.label}
                  </span>

                  <span className="text-xl font-black text-yellow-400">
                    +{item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-black/40 p-5">
            <p className="text-xs text-zinc-500">
              AI 模型總結
            </p>

            <p className="mt-2 text-lg font-black text-white">
              模型評價：
              <span className="ml-2 text-yellow-400">
                {score >= 85
                  ? "高價值方向"
                  : "觀察方向"}
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}