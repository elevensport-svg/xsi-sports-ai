type Props = {
  awayTeam: string;
  homeTeam: string;

  awayScore: number;
  homeScore: number;
};

const MAX_SCORE = 100;
const SIZE = 220;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function XsiGauge({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900">

      <header className="border-b border-zinc-800 px-8 py-6">

        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">
          XSI POWER INDEX
        </p>

        <h2 className="mt-3 text-3xl font-black">
          Overall Team Strength
        </h2>

      </header>

      <div className="grid gap-8 p-8 lg:grid-cols-2">

        <GaugeCard
          title={awayTeam}
          score={awayScore}
          color="#3B82F6"
        />

        <GaugeCard
          title={homeTeam}
          score={homeScore}
          color="#EF4444"
        />

      </div>

    </section>
  );
}

type GaugeProps = {
  title: string;
  score: number;
  color: string;
};

function GaugeCard({
  title,
  score,
  color,
}: GaugeProps) {
  const percent = Math.max(
    0,
    Math.min(100, score),
  );

  const dashOffset =
    CIRCUMFERENCE -
    (percent / 100) * CIRCUMFERENCE;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-8">

      <p className="text-center text-lg font-bold">
        {title}
      </p>

      <div className="mt-8 flex justify-center">

        <svg
          width={SIZE}
          height={SIZE}
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#27272A"
            strokeWidth={STROKE}
          />

          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />

          <text
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            transform={`rotate(90 ${SIZE / 2} ${SIZE / 2})`}
            fill="white"
            fontSize="42"
            fontWeight="700"
          >
            {score.toFixed(1)}
          </text>

        </svg>

      </div>

      <div className="mt-8">

        <div className="mb-3 flex justify-between text-sm text-zinc-500">
          <span>Power</span>
          <span>{percent.toFixed(1)}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">

          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percent}%`,
              background: color,
            }}
          />

        </div>

      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">

        <SmallMetric
          title="Grade"
          value={grade(score)}
        />

        <SmallMetric
          title="Tier"
          value={tier(score)}
        />

        <SmallMetric
          title="Rank"
          value={`${Math.round(score)}`}
        />

      </div>

    </div>
  );
}

type MetricProps = {
  title: string;
  value: string;
};

function SmallMetric({
  title,
  value,
}: MetricProps) {
  return (
    <div className="rounded-xl bg-zinc-950 p-4 text-center">

      <p className="text-[10px] uppercase tracking-widest text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-xl font-black">
        {value}
      </p>

    </div>
  );
}

function grade(score: number) {
  if (score >= 95) return "S";
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "C+";
  if (score >= 60) return "C";
  return "D";
}

function tier(score: number) {
  if (score >= 90) return "Elite";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Average";
  if (score >= 60) return "Weak";
  return "Poor";
}