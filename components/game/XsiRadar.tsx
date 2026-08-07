import type { XsiEngineResult } from "@/types/game";

type Props = {
  engine: XsiEngineResult;
  awayTeamName: string;
  homeTeamName: string;
};

type RadarPoint = {
  label: string;
  away: number;
  home: number;
};

const SIZE = 520;
const CENTER = SIZE / 2;
const RADIUS = 185;
const LEVELS = 5;

export default function XsiRadar({
  engine,
  awayTeamName,
  homeTeamName,
}: Props) {
  const points: RadarPoint[] = engine.modules
    .filter((module) => module.key !== "homeField")
    .map((module) => ({
      label: module.label,
      away: clampScore(module.awayScore),
      home: clampScore(module.homeScore),
    }));

  if (points.length < 3) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">
          XSI RADAR
        </p>

        <h2 className="mt-3 text-3xl font-black text-white">
          Module Comparison
        </h2>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-black/30 p-8 text-center text-zinc-400">
          模組資料不足，無法建立雷達圖。
        </div>
      </section>
    );
  }

  const awayPolygon = buildPolygon(
    points.map((point) => point.away),
    points.length,
  );

  const homePolygon = buildPolygon(
    points.map((point) => point.home),
    points.length,
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
      <header className="border-b border-zinc-800 px-8 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">
          XSI RADAR
        </p>

        <h2 className="mt-3 text-3xl font-black text-white">
          Module Comparison
        </h2>

        <p className="mt-3 text-sm text-zinc-400">
          比較先發投手、打線、牛棚、近期狀態、市場與天氣模組。
        </p>
      </header>

      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)] lg:p-8">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/30">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={`${awayTeamName} 與 ${homeTeamName} XSI 模組雷達圖`}
            className="h-auto w-full"
          >
            <defs>
              <radialGradient id="radarBackground">
                <stop offset="0%" stopColor="rgba(250,204,21,0.08)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>

            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS + 45}
              fill="url(#radarBackground)"
            />

            {Array.from({ length: LEVELS }).map((_, index) => {
              const levelRadius = RADIUS * ((index + 1) / LEVELS);

              return (
                <polygon
                  key={levelRadius}
                  points={buildGridPolygon(levelRadius, points.length)}
                  fill="none"
                  stroke="rgba(113,113,122,0.45)"
                  strokeWidth="1"
                />
              );
            })}

            {points.map((_, index) => {
              const point = polarPoint(index, points.length, RADIUS);

              return (
                <line
                  key={`axis-${index}`}
                  x1={CENTER}
                  y1={CENTER}
                  x2={point.x}
                  y2={point.y}
                  stroke="rgba(113,113,122,0.45)"
                  strokeWidth="1"
                />
              );
            })}

            <polygon
              points={awayPolygon}
              fill="rgba(59,130,246,0.22)"
              stroke="rgb(96,165,250)"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            <polygon
              points={homePolygon}
              fill="rgba(239,68,68,0.20)"
              stroke="rgb(248,113,113)"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {points.map((point, index) => {
              const awayPoint = polarPoint(
                index,
                points.length,
                RADIUS * (point.away / 100),
              );

              const homePoint = polarPoint(
                index,
                points.length,
                RADIUS * (point.home / 100),
              );

              return (
                <g key={`score-${point.label}`}>
                  <circle
                    cx={awayPoint.x}
                    cy={awayPoint.y}
                    r="5"
                    fill="rgb(96,165,250)"
                    stroke="rgb(9,9,11)"
                    strokeWidth="2"
                  />

                  <circle
                    cx={homePoint.x}
                    cy={homePoint.y}
                    r="5"
                    fill="rgb(248,113,113)"
                    stroke="rgb(9,9,11)"
                    strokeWidth="2"
                  />
                </g>
              );
            })}

            {points.map((point, index) => {
              const labelPoint = polarPoint(
                index,
                points.length,
                RADIUS + 38,
              );

              const anchor =
                Math.abs(labelPoint.x - CENTER) < 18
                  ? "middle"
                  : labelPoint.x > CENTER
                    ? "start"
                    : "end";

              return (
                <text
                  key={`label-${point.label}`}
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  fill="rgb(212,212,216)"
                  fontSize="13"
                  fontWeight="700"
                >
                  {point.label}
                </text>
              );
            })}

            <circle
              cx={CENTER}
              cy={CENTER}
              r="4"
              fill="rgb(250,204,21)"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-5">
          <LegendCard
            teamName={awayTeamName}
            score={engine.away.totalScore}
            probability={engine.away.winProbability}
            grade={engine.away.grade}
            side="away"
          />

          <LegendCard
            teamName={homeTeamName}
            score={engine.home.totalScore}
            probability={engine.home.winProbability}
            grade={engine.home.grade}
            side="home"
          />

          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Strongest Edge
            </p>

            <div className="mt-5 space-y-3">
              {engine.modules
                .filter(
                  (module) =>
                    module.key !== "homeField" &&
                    module.advantage !== "even",
                )
                .sort((a, b) => b.difference - a.difference)
                .slice(0, 3)
                .map((module) => (
                  <div
                    key={module.key}
                    className="flex items-center justify-between rounded-xl bg-zinc-950 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {module.label}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {module.advantage === "away"
                          ? awayTeamName
                          : homeTeamName}
                      </p>
                    </div>

                    <p className="text-lg font-black text-yellow-400">
                      +{module.difference.toFixed(1)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type LegendCardProps = {
  teamName: string;
  score: number;
  probability: number;
  grade: string;
  side: "away" | "home";
};

function LegendCard({
  teamName,
  score,
  probability,
  grade,
  side,
}: LegendCardProps) {
  const indicatorClass =
    side === "away" ? "bg-blue-400" : "bg-red-400";

  return (
    <article className="rounded-2xl border border-zinc-800 bg-black/30 p-6">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${indicatorClass}`} />

        <p className="font-bold text-white">
          {teamName}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Metric
          label="XSI"
          value={score.toFixed(1)}
        />

        <Metric
          label="Win"
          value={`${probability.toFixed(1)}%`}
        />

        <Metric
          label="Grade"
          value={grade}
        />
      </div>
    </article>
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
    <div className="rounded-xl bg-zinc-950 p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
}

function buildPolygon(
  values: number[],
  pointCount: number,
): string {
  return values
    .map((value, index) => {
      const point = polarPoint(
        index,
        pointCount,
        RADIUS * (clampScore(value) / 100),
      );

      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function buildGridPolygon(
  radius: number,
  pointCount: number,
): string {
  return Array.from({ length: pointCount })
    .map((_, index) => {
      const point = polarPoint(
        index,
        pointCount,
        radius,
      );

      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function polarPoint(
  index: number,
  pointCount: number,
  radius: number,
): {
  x: number;
  y: number;
} {
  const angle =
    -Math.PI / 2 +
    (Math.PI * 2 * index) / pointCount;

  return {
    x: Number(
      (CENTER + Math.cos(angle) * radius).toFixed(2),
    ),
    y: Number(
      (CENTER + Math.sin(angle) * radius).toFixed(2),
    ),
  };
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}