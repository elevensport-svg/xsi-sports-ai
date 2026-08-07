import type { AIReport } from "@/lib/xsi/report";

type Props = {
  report: AIReport;
};

export default function AIReportSection({
  report,
}: Props) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900">

      <header className="border-b border-zinc-800 px-8 py-6">

        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-yellow-400">
          XSI AI REPORT
        </p>

        <h2 className="mt-3 text-3xl font-black text-white">
          {report.headline}
        </h2>

        <p className="mt-4 max-w-4xl leading-7 text-zinc-400">
          {report.summary}
        </p>

      </header>

      <div className="grid gap-6 p-8 lg:grid-cols-2">

        <ReportCard
          title="Matchup"
          content={report.matchup}
        />

        <ReportCard
          title="Prediction"
          content={report.prediction}
        />

        <ReportCard
          title="Starting Pitcher"
          content={report.pitching}
        />

        <ReportCard
          title="Batting"
          content={report.batting}
        />

        <ReportCard
          title="Bullpen"
          content={report.bullpen}
        />

        <ReportCard
          title="Recent Form"
          content={report.recentForm}
        />

      </div>

      <div className="grid gap-6 border-t border-zinc-800 p-8 lg:grid-cols-[2fr_1fr]">

        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">

          <h3 className="text-lg font-bold">
            AI Recommendation
          </h3>

          <p className="mt-5 leading-8 text-zinc-300">
            {report.recommendation}
          </p>

          <div className="mt-8 grid gap-3">

            {report.factors.map((factor) => (
              <div
                key={factor}
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-300"
              >
                {factor}
              </div>
            ))}

          </div>

        </div>

        <div className="flex flex-col gap-5">

          <SideCard
            title="Confidence"
            value={report.confidence}
          />

          <SideCard
            title="Risk"
            value={report.risk}
          />

        </div>

      </div>

    </section>
  );
}

type ReportCardProps = {
  title: string;
  content: string;
};

function ReportCard({
  title,
  content,
}: ReportCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-black/30 p-6">

      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow-400">
        {title}
      </p>

      <p className="mt-5 leading-8 text-zinc-300">
        {content}
      </p>

    </article>
  );
}

type SideCardProps = {
  title: string;
  value: string;
};

function SideCard({
  title,
  value,
}: SideCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-6">

      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow-400">
        {title}
      </p>

      <p className="mt-5 text-lg font-semibold leading-8 text-white">
        {value}
      </p>

    </div>
  );
}