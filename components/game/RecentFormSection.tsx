import Image from "next/image";

import type { TeamGameAnalysis } from "@/types/game";

type Props = {
  away: TeamGameAnalysis;
  home: TeamGameAnalysis;
};

export default function RecentFormSection({
  away,
  home,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">

      <div className="mb-8">

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
          Recent Form
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Last 10 Games
        </h2>

      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        <RecentCard team={away} />

        <RecentCard team={home} />

      </div>

    </section>
  );
}

type CardProps = {
  team: TeamGameAnalysis;
};

function RecentCard({
  team,
}: CardProps) {
  const form = team.recentForm.stats;

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
            Recent Form
          </h3>

          <p className="mt-2 text-yellow-400">
            Grade {team.recentForm.grade}
          </p>

        </div>

        <div className="ml-auto text-right">

          <p className="text-xs uppercase tracking-widest text-zinc-500">
            XSI
          </p>

          <p className="mt-2 text-5xl font-black text-yellow-400">
            {team.recentForm.score}
          </p>

        </div>

      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">

        <Stat
          label="Record"
          value={`${form.wins}-${form.losses}`}
        />

        <Stat
          label="Win %"
          value={`${(form.winPercentage * 100).toFixed(1)}%`}
        />

        <Stat
          label="Runs"
          value={form.runsFor}
        />

        <Stat
          label="Allowed"
          value={form.runsAgainst}
        />

        <Stat
          label="Run Diff"
          value={form.runDifference}
        />

        <Stat
          label="Avg Runs"
          value={form.averageRunsFor.toFixed(2)}
        />

        <Stat
          label="Avg Allowed"
          value={form.averageRunsAgainst.toFixed(2)}
        />

        <Stat
          label="Streak"
          value={form.streak ?? "-"}
        />

      </div>

    </div>
  );
}

type StatProps = {
  label: string;
  value: string | number;
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
        {value}
      </p>

    </div>
  );
}