import type { TeamGameAnalysis } from "@/types/game";

type Props = {
  away: TeamGameAnalysis;
  home: TeamGameAnalysis;
};

type ComparisonSide = "away" | "home" | "even";

type ComparisonRow = {
  label: string;
  away: string;
  home: string;
  winner: ComparisonSide;
};

type NumericValue = string | number | null | undefined;

export default function ComparisonTable({
  away,
  home,
}: Props) {
  const rows: ComparisonRow[] = [
    createComparisonRow(
      "Overall XSI",
      calculateOverallScore(away),
      calculateOverallScore(home),
    ),

    createComparisonRow(
      "Pitch",
      away.pitcher.score,
      home.pitcher.score,
    ),

    createComparisonRow(
      "Batting",
      away.batting.score,
      home.batting.score,
    ),

    createComparisonRow(
      "Bullpen",
      away.bullpen.score,
      home.bullpen.score,
    ),

    createComparisonRow(
      "Recent Form",
      away.recentForm.score,
      home.recentForm.score,
    ),

    createComparisonRow(
      "Starting ERA",
      away.pitcher.pitcher.era,
      home.pitcher.pitcher.era,
      {
        reverse: true,
        decimals: 2,
      },
    ),

    createComparisonRow(
      "Starting WHIP",
      away.pitcher.pitcher.whip,
      home.pitcher.pitcher.whip,
      {
        reverse: true,
        decimals: 2,
      },
    ),

    createComparisonRow(
      "OPS",
      away.batting.stats.onBasePlusSlugging,
      home.batting.stats.onBasePlusSlugging,
      {
        decimals: 3,
      },
    ),

    createComparisonRow(
      "Bullpen ERA",
      away.bullpen.stats.era,
      home.bullpen.stats.era,
      {
        reverse: true,
        decimals: 2,
      },
    ),

    createComparisonRow(
      "Run Differential",
      away.recentForm.stats.runDifference,
      home.recentForm.stats.runDifference,
      {
        signed: true,
        decimals: 0,
      },
    ),
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
      <header className="border-b border-zinc-800 px-6 py-6 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">
          Team Comparison
        </p>

        <h2 className="mt-3 text-3xl font-black text-white">
          Side By Side
        </h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-black/30">
            <tr className="border-b border-zinc-800">
              <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Stat
              </th>

              <th className="px-6 py-5 text-center text-sm font-bold text-white">
                {away.team.name}
              </th>

              <th className="px-6 py-5 text-center text-sm font-bold text-white">
                {home.team.name}
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-zinc-800/70 last:border-b-0"
              >
                <td className="px-6 py-5 font-semibold text-zinc-300">
                  {row.label}
                </td>

                <ComparisonValue
                  value={row.away}
                  isWinner={row.winner === "away"}
                />

                <ComparisonValue
                  value={row.home}
                  isWinner={row.winner === "home"}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type ComparisonValueProps = {
  value: string;
  isWinner: boolean;
};

function ComparisonValue({
  value,
  isWinner,
}: ComparisonValueProps) {
  return (
    <td className="px-6 py-5 text-center">
      <span
        className={
          isWinner
            ? "inline-flex rounded-lg bg-green-500/10 px-3 py-2 font-black text-green-400"
            : "inline-flex px-3 py-2 font-bold text-white"
        }
      >
        {value}
      </span>
    </td>
  );
}

type ComparisonOptions = {
  reverse?: boolean;
  decimals?: number;
  signed?: boolean;
};

function createComparisonRow(
  label: string,
  awayValue: NumericValue,
  homeValue: NumericValue,
  options: ComparisonOptions = {},
): ComparisonRow {
  const awayNumber = toFiniteNumber(awayValue);
  const homeNumber = toFiniteNumber(homeValue);

  return {
    label,
    away: formatValue(awayValue, options),
    home: formatValue(homeValue, options),
    winner: determineWinner(
      awayNumber,
      homeNumber,
      options.reverse ?? false,
    ),
  };
}

function determineWinner(
  away: number | null,
  home: number | null,
  reverse: boolean,
): ComparisonSide {
  if (away === null || home === null) {
    return "even";
  }

  if (away === home) {
    return "even";
  }

  if (reverse) {
    return away < home ? "away" : "home";
  }

  return away > home ? "away" : "home";
}

function formatValue(
  value: NumericValue,
  options: ComparisonOptions,
): string {
  const numericValue = toFiniteNumber(value);

  if (numericValue === null) {
    return "-";
  }

  const decimals = options.decimals ?? 1;
  const formatted = numericValue.toFixed(decimals);

  if (options.signed && numericValue > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

function toFiniteNumber(
  value: NumericValue,
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized || normalized === "-") {
      return null;
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function calculateOverallScore(
  team: TeamGameAnalysis,
): number {
  const scores = [
    toFiniteNumber(team.pitcher.score),
    toFiniteNumber(team.batting.score),
    toFiniteNumber(team.bullpen.score),
    toFiniteNumber(team.recentForm.score),
  ].filter((score): score is number => score !== null);

  if (scores.length === 0) {
    return 0;
  }

  const total = scores.reduce(
    (sum, score) => sum + score,
    0,
  );

  return total / scores.length;
}