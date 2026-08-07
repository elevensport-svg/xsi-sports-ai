import Image from "next/image";

import type { TeamGameAnalysis } from "@/types/game";

type Props = {
  away: TeamGameAnalysis;
  home: TeamGameAnalysis;
};

export default function BattingSection({
  away,
  home,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">

      <div className="mb-8">

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
          Offense
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Batting Comparison
        </h2>

      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        <BattingCard team={away} />

        <BattingCard team={home} />

      </div>

    </section>
  );
}

type CardProps = {
  team: TeamGameAnalysis;
};

function BattingCard({
  team,
}: CardProps) {
  const batting = team.batting.stats;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6">

      <div className="flex items-center gap-5">

        {team.team.logoUrl && (
          <Image
            src={team.team.logoUrl}
            alt={team.team.name}
            width={56}
            height={56}
            className="rounded-full bg-white p-1"
          />
        )}

        <div>

          <p className="text-sm text-zinc-500">
            {team.team.name}
          </p>

          <h3 className="mt-1 text-2xl font-bold">
            Lineup
          </h3>

          <p className="mt-2 text-yellow-400">
            Grade {team.batting.grade}
          </p>

        </div>

        <div className="ml-auto text-right">

          <p className="text-xs uppercase tracking-widest text-zinc-500">
            XSI
          </p>

          <p className="mt-2 text-5xl font-black text-yellow-400">
            {team.batting.score}
          </p>

        </div>

      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">

        <Stat
          label="AVG"
          value={batting.battingAverage}
        />

        <Stat
          label="OBP"
          value={batting.onBasePercentage}
        />

        <Stat
          label="SLG"
          value={batting.sluggingPercentage}
        />

        <Stat
          label="OPS"
          value={batting.onBasePlusSlugging}
        />

        <Stat
          label="RUNS"
          value={batting.runs}
        />

        <Stat
          label="HITS"
          value={batting.hits}
        />

        <Stat
          label="HR"
          value={batting.homeRuns}
        />

        <Stat
          label="RBI"
          value={batting.runsBattedIn}
        />

        <Stat
          label="BB"
          value={batting.walks}
        />

        <Stat
          label="SO"
          value={batting.strikeouts}
        />

      </div>

    </div>
  );
}

type StatProps = {
  label: string;
  value: string | number | null;
};

function Stat({
  label,
  value,
}: StatProps) {
  return (
    <div className="rounded-xl bg-zinc-950 p-4">

      <p className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-white">
        {value ?? "-"}
      </p>

    </div>
  );
}