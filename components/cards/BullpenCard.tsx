import type { BullpenStats } from "../../lib/api/bullpen";
import type { BullpenScoreResult } from "../../lib/xsi/bullpen";

type Props = {
  awayTeamName: string;
  homeTeamName: string;
  awayStats: BullpenStats | null;
  homeStats: BullpenStats | null;
  awayScore: BullpenScoreResult;
  homeScore: BullpenScoreResult;
};

function formatValue(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "--";
  }

  return String(value);
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-4 text-center">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function TeamBullpenCard({
  teamName,
  stats,
  score,
}: {
  teamName: string;
  stats: BullpenStats | null;
  score: BullpenScoreResult;
}) {
  const saveOpportunities =
    (stats?.saves ?? 0) + (stats?.blownSaves ?? 0);

  const saveRate =
    saveOpportunities > 0
      ? Number(
          (
            ((stats?.saves ?? 0) /
              saveOpportunities) *
            100
          ).toFixed(1),
        )
      : null;

  const strikeoutWalkRatio =
    stats && stats.walks > 0
      ? Number(
          (
            stats.strikeOuts /
            stats.walks
          ).toFixed(2),
        )
      : null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">
        {teamName}
      </p>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
            XSI Bullpen
          </p>

          <p className="mt-2 text-4xl font-black text-yellow-400">
            {score.score}
          </p>

          <p className="mt-1 text-sm text-zinc-400">
            {score.grade}
          </p>
        </div>

        <div className="text-right">
          {score.reasons.map((reason) => (
            <p
              key={reason}
              className="mt-1 text-xs text-zinc-500"
            >
              • {reason}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-yellow-400"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, score.score),
            )}%`,
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatBox
          label="ERA"
          value={formatValue(stats?.era)}
        />

        <StatBox
          label="WHIP"
          value={formatValue(stats?.whip)}
        />

        <StatBox
          label="投球局數"
          value={formatValue(stats?.inningsPitched)}
        />

        <StatBox
          label="三振"
          value={formatValue(stats?.strikeOuts)}
        />

        <StatBox
          label="保送"
          value={formatValue(stats?.walks)}
        />

        <StatBox
          label="K/BB"
          value={formatValue(strikeoutWalkRatio)}
        />

        <StatBox
          label="救援成功"
          value={formatValue(stats?.saves)}
        />

        <StatBox
          label="救援失敗"
          value={formatValue(stats?.blownSaves)}
        />

        <StatBox
          label="救援成功率"
          value={
            saveRate === null
              ? "--"
              : `${saveRate}%`
          }
        />
      </div>
    </div>
  );
}

export default function BullpenCard({
  awayTeamName,
  homeTeamName,
  awayStats,
  homeStats,
  awayScore,
  homeScore,
}: Props) {
  return (
    <section className="mt-10 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6 md:p-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
          Bullpen Analysis
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          牛棚分析
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          依 ERA、WHIP、救援成功率與三振保送比評估兩隊牛棚。
        </p>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <TeamBullpenCard
          teamName={awayTeamName}
          stats={awayStats}
          score={awayScore}
        />

        <TeamBullpenCard
          teamName={homeTeamName}
          stats={homeStats}
          score={homeScore}
        />
      </div>
    </section>
  );
}