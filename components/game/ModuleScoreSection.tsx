import type { XsiEngineResult } from "@/types/game";

type Props = {
  engine: XsiEngineResult;
};

export default function ModuleScoreSection({
  engine,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">

      <div className="mb-8">

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-400">
          Module Score
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          XSI Engine Breakdown
        </h2>

      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">

        <table className="w-full">

          <thead className="bg-zinc-950">

            <tr>

              <th className="px-6 py-4 text-left text-xs uppercase tracking-widest text-zinc-500">
                Module
              </th>

              <th className="px-6 py-4 text-center text-xs uppercase tracking-widest text-zinc-500">
                Away
              </th>

              <th className="px-6 py-4 text-center text-xs uppercase tracking-widest text-zinc-500">
                Home
              </th>

              <th className="px-6 py-4 text-center text-xs uppercase tracking-widest text-zinc-500">
                Weight
              </th>

              <th className="px-6 py-4 text-center text-xs uppercase tracking-widest text-zinc-500">
                Edge
              </th>

            </tr>

          </thead>

          <tbody>

            {engine.modules.map((module) => (
              <tr
                key={module.key}
                className="border-t border-zinc-800"
              >
                <td className="px-6 py-5 font-semibold">
                  {module.label}
                </td>

                <td className="px-6 py-5 text-center">
                  {module.awayScore.toFixed(1)}
                </td>

                <td className="px-6 py-5 text-center">
                  {module.homeScore.toFixed(1)}
                </td>

                <td className="px-6 py-5 text-center text-zinc-400">
                  {(module.weight * 100).toFixed(0)}%
                </td>

                <td className="px-6 py-5 text-center">

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      module.advantage === "away"
                        ? "bg-blue-500/20 text-blue-300"
                        : module.advantage === "home"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {module.advantage === "even"
                      ? "Even"
                      : module.advantage === "away"
                        ? "Away"
                        : "Home"}
                  </span>

                </td>

              </tr>
            ))}

          </tbody>

          <tfoot className="border-t border-zinc-700 bg-black/40">

            <tr>

              <td className="px-6 py-6 text-lg font-bold">
                Total
              </td>

              <td className="px-6 py-6 text-center text-2xl font-black text-yellow-400">
                {engine.away.totalScore.toFixed(1)}
              </td>

              <td className="px-6 py-6 text-center text-2xl font-black text-yellow-400">
                {engine.home.totalScore.toFixed(1)}
              </td>

              <td />

              <td className="px-6 py-6 text-center">

                <span className="rounded-full bg-yellow-500/20 px-4 py-2 font-semibold text-yellow-300">
                  {engine.leadingSide === "even"
                    ? "Even"
                    : engine.leadingSide === "away"
                      ? "Away"
                      : "Home"}
                </span>

              </td>

            </tr>

          </tfoot>

        </table>

      </div>

    </section>
  );
}