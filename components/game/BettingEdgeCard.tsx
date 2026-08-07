import type { GameRecommendation } from "@/types/game";
import type { ValueAnalysis, ValueBet } from "@/lib/xsi/value";

type Props = {
  awayTeamName: string;
  homeTeamName: string;
  awayMoneyline: number | null;
  homeMoneyline: number | null;
  value: ValueAnalysis;
  recommendation: GameRecommendation;
};

export default function BettingEdgeCard({
  awayTeamName,
  homeTeamName,
  awayMoneyline,
  homeMoneyline,
  value,
  recommendation,
}: Props) {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
      <header className="border-b border-zinc-800 px-6 py-6 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">
          Betting Edge
        </p>

        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">
              Market Value Analysis
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              比較模型勝率、市場隱含勝率、期望值與 Kelly 建議比例。
            </p>
          </div>

          <RecommendationBadge
            type={recommendation.type}
            teamName={recommendation.teamName}
          />
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-2 lg:p-8">
        <TeamValueCard
          side="away"
          teamName={awayTeamName}
          moneyline={awayMoneyline}
          valueBet={value.away}
          isBestBet={value.bestBet?.side === "away"}
        />

        <TeamValueCard
          side="home"
          teamName={homeTeamName}
          moneyline={homeMoneyline}
          valueBet={value.home}
          isBestBet={value.bestBet?.side === "home"}
        />
      </div>

      <BestBetSummary
        bestBet={value.bestBet}
        awayTeamName={awayTeamName}
        homeTeamName={homeTeamName}
      />
    </section>
  );
}

type TeamValueCardProps = {
  side: "away" | "home";
  teamName: string;
  moneyline: number | null;
  valueBet: ValueBet | null;
  isBestBet: boolean;
};

function TeamValueCard({
  side,
  teamName,
  moneyline,
  valueBet,
  isBestBet,
}: TeamValueCardProps) {
  const sideLabel = side === "away" ? "Away" : "Home";

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-6 ${
        isBestBet
          ? "border-yellow-400/50 bg-yellow-400/5"
          : "border-zinc-800 bg-black/30"
      }`}
    >
      {isBestBet && (
        <div className="absolute right-0 top-0 rounded-bl-xl bg-yellow-400 px-4 py-2 text-xs font-black uppercase tracking-widest text-black">
          Best Value
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
          {sideLabel}
        </p>

        <h3 className="mt-2 pr-24 text-2xl font-black text-white">
          {teamName}
        </h3>

        <p className="mt-2 text-sm text-zinc-400">
          Moneyline {formatMoneyline(moneyline)}
        </p>
      </div>

      {valueBet ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Metric
              label="Model Win"
              value={`${valueBet.probability.toFixed(1)}%`}
            />

            <Metric
              label="Market Win"
              value={`${valueBet.impliedProbability.toFixed(1)}%`}
            />

            <Metric
              label="Fair Odds"
              value={formatMoneyline(
                probabilityToAmerican(valueBet.probability),
              )}
            />

            <Metric
              label="Market Edge"
              value={formatSignedPercentage(valueBet.edge)}
              positive={valueBet.edge > 0}
              negative={valueBet.edge < 0}
            />

            <Metric
              label="Expected Value"
              value={formatSignedPercentage(valueBet.expectedValue)}
              positive={valueBet.expectedValue > 0}
              negative={valueBet.expectedValue < 0}
            />

            <Metric
              label="Kelly"
              value={`${(valueBet.kellyFraction * 100).toFixed(1)}%`}
              positive={valueBet.kellyFraction > 0}
            />
          </div>

          <EdgeBar edge={valueBet.edge} />
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 p-8 text-center">
          <p className="font-semibold text-zinc-300">
            尚未取得市場賠率
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Moneyline 資料加入後，系統會自動計算 Value、EV 與 Kelly。
          </p>
        </div>
      )}
    </article>
  );
}

type MetricProps = {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
};

function Metric({
  label,
  value,
  positive = false,
  negative = false,
}: MetricProps) {
  const valueClass = positive
    ? "text-green-400"
    : negative
      ? "text-red-400"
      : "text-white";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className={`mt-3 text-xl font-black ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

type EdgeBarProps = {
  edge: number;
};

function EdgeBar({ edge }: EdgeBarProps) {
  const normalizedEdge = Math.min(100, Math.max(0, Math.abs(edge) * 5));
  const isPositive = edge > 0;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Value Strength
        </p>

        <p
          className={`text-sm font-bold ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {isPositive ? "Positive Edge" : "Negative Edge"}
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isPositive ? "bg-green-400" : "bg-red-400"
          }`}
          style={{
            width: `${normalizedEdge}%`,
          }}
        />
      </div>
    </div>
  );
}

type BestBetSummaryProps = {
  bestBet: ValueBet | null;
  awayTeamName: string;
  homeTeamName: string;
};

function BestBetSummary({
  bestBet,
  awayTeamName,
  homeTeamName,
}: BestBetSummaryProps) {
  if (!bestBet) {
    return (
      <div className="border-t border-zinc-800 bg-black/30 px-6 py-6 md:px-8">
        <p className="text-sm text-zinc-400">
          目前沒有足夠的市場資料建立 Value Bet 建議。
        </p>
      </div>
    );
  }

  const teamName =
    bestBet.side === "away"
      ? awayTeamName
      : homeTeamName;

  const hasPositiveValue =
    bestBet.edge > 0 &&
    bestBet.expectedValue > 0;

  return (
    <div className="border-t border-zinc-800 bg-black/30 px-6 py-6 md:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
            AI Value Decision
          </p>

          <h3 className="mt-2 text-2xl font-black text-white">
            {hasPositiveValue
              ? `${teamName} 具備正期望值`
              : "目前沒有明顯正期望值"}
          </h3>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {hasPositiveValue
              ? `模型勝率比市場隱含勝率高出 ${bestBet.edge.toFixed(
                  2,
                )}%，預估 EV 為 ${bestBet.expectedValue.toFixed(2)}%。`
              : "模型與市場價格之間的差距不足，建議等待更好的進場賠率。"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SummaryMetric
            label="Suggested Kelly"
            value={`${(bestBet.kellyFraction * 100).toFixed(1)}%`}
          />

          <SummaryMetric
            label="Value Edge"
            value={formatSignedPercentage(bestBet.edge)}
          />
        </div>
      </div>
    </div>
  );
}

type SummaryMetricProps = {
  label: string;
  value: string;
};

function SummaryMetric({
  label,
  value,
}: SummaryMetricProps) {
  return (
    <div className="min-w-36 rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-yellow-400">
        {value}
      </p>
    </div>
  );
}

type RecommendationBadgeProps = {
  type: GameRecommendation["type"];
  teamName: string | null;
};

function RecommendationBadge({
  type,
  teamName,
}: RecommendationBadgeProps) {
  const className = {
    strong:
      "border-green-500/30 bg-green-500/10 text-green-300",
    lean:
      "border-blue-500/30 bg-blue-500/10 text-blue-300",
    pass:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    avoid:
      "border-red-500/30 bg-red-500/10 text-red-300",
  }[type];

  return (
    <div className={`rounded-xl border px-4 py-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-widest">
        {type}
      </p>

      <p className="mt-1 font-bold">
        {teamName ?? "No Play"}
      </p>
    </div>
  );
}

function formatMoneyline(
  moneyline: number | null,
): string {
  if (moneyline == null) {
    return "-";
  }

  return moneyline > 0
    ? `+${Math.round(moneyline)}`
    : `${Math.round(moneyline)}`;
}

function probabilityToAmerican(
  probability: number,
): number | null {
  if (
    !Number.isFinite(probability) ||
    probability <= 0 ||
    probability >= 100
  ) {
    return null;
  }

  const decimalProbability = probability / 100;

  if (decimalProbability >= 0.5) {
    return Math.round(
      (-100 * decimalProbability) /
        (1 - decimalProbability),
    );
  }

  return Math.round(
    (100 * (1 - decimalProbability)) /
      decimalProbability,
  );
}

function formatSignedPercentage(
  value: number,
): string {
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(2)}%`;
}