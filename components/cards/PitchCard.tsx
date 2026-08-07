import { getMlbTeamLogo } from "../../lib/teams/mlb";

type Props = {
  team: {
    id: number;
    name: string;
    pitch: {
      score: number;
      grade: string;
      reasons: string[];
    };
  };
  pitcherName?: string;
  pitcherStats: any;
};

function StatItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-zinc-950 p-3 text-center">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-base font-bold text-white md:text-lg">
        {value}
      </p>
    </div>
  );
}

export default function PitchCard({
  team,
  pitcherName,
  pitcherStats,
}: Props) {
  return (
    <div className="rounded-2xl bg-zinc-800 p-4 text-center md:p-6">

      <img
        src={getMlbTeamLogo(team.id)}
        alt={team.name}
        className="mx-auto h-20 w-20 object-contain md:h-28 md:w-28"
      />


      <h2 className="mt-4 text-xl font-bold md:text-2xl">
        {team.name}
      </h2>


      <div className="mt-5 rounded-xl border border-zinc-700 bg-zinc-900 p-4 md:mt-6 md:p-5">

        <p className="text-sm text-zinc-400">
          預計先發投手
        </p>


        <p className="mt-2 text-lg font-bold md:text-xl">
          {pitcherName ?? "尚未公布"}
        </p>


        <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-400/5 p-3 md:p-4">

          <div className="flex items-center justify-between gap-3">

            <div className="text-left">

              <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                XSI Pitch
              </p>

              <p className="mt-1 text-sm text-zinc-400">
                {team.pitch.grade}
              </p>

            </div>


            <p className="text-3xl font-black text-yellow-400 md:text-4xl">
              {team.pitch.score}
            </p>

          </div>


          <div className="mt-4 h-2 rounded-full bg-zinc-800">

            <div
              className="h-full rounded-full bg-yellow-400"
              style={{
                width: `${team.pitch.score}%`,
              }}
            />

          </div>


          <div className="mt-4 space-y-1 text-left">

            {team.pitch.reasons.map((reason) => (
              <p
                key={reason}
                className="text-xs text-zinc-500"
              >
                • {reason}
              </p>
            ))}

          </div>

        </div>


        {pitcherStats ? (

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">

            <StatItem
              label="ERA"
              value={pitcherStats.era}
            />

            <StatItem
              label="WHIP"
              value={pitcherStats.whip}
            />

            <StatItem
              label="勝敗"
              value={`${pitcherStats.wins}-${pitcherStats.losses}`}
            />

            <StatItem
              label="三振"
              value={pitcherStats.strikeOuts}
            />

            <StatItem
              label="保送"
              value={pitcherStats.walks}
            />

            <StatItem
              label="投球局數"
              value={pitcherStats.inningsPitched}
            />

          </div>

        ) : (

          <p className="mt-4 text-sm text-zinc-500">
            暫無本季投手數據
          </p>

        )}

      </div>

    </div>
  );
}