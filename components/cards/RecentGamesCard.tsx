import type {
  RecentGameResult,
  RecentGamesSummary,
} from "../../lib/api/recent-games";
import { getMlbTeamLogo } from "../../lib/teams/mlb";

type Props = {
  awayTeamName: string;
  homeTeamName: string;
  awaySummary: RecentGamesSummary;
  homeSummary: RecentGamesSummary;
};

function formatGameDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function ResultBadge({
  result,
}: {
  result: RecentGameResult["result"];
}) {
  const isWin = result === "W";

  return (
    <span
      className={
        isWin
          ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-black text-emerald-400"
          : "inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-xs font-black text-red-400"
      }
    >
      {result}
    </span>
  );
}

function GameItem({
  game,
}: {
  game: RecentGameResult;
}) {
  return (
    <div className="min-w-[180px] rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <ResultBadge result={game.result} />

        <span className="text-xs text-zinc-500">
          {formatGameDate(game.date)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <img
          src={getMlbTeamLogo(game.opponentId)}
          alt={game.opponentName}
          className="h-10 w-10 object-contain"
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            {game.opponentName}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {game.isHome ? "主場" : "客場"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            比分
          </p>

          <p className="mt-1 text-3xl font-black text-white">
            {game.teamScore}
            <span className="mx-2 text-zinc-600">-</span>
            {game.opponentScore}
          </p>
        </div>

        <p
          className={
            game.result === "W"
              ? "text-sm font-black text-emerald-400"
              : "text-sm font-black text-red-400"
          }
        >
          {game.result === "W" ? "勝" : "敗"}
        </p>
      </div>
    </div>
  );
}

function SummaryBox({
  teamName,
  summary,
}: {
  teamName: string;
  summary: RecentGamesSummary;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">
        {teamName}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-zinc-950 p-4 text-center">
          <p className="text-xs text-zinc-500">
            近10場
          </p>

          <p className="mt-2 text-2xl font-black text-yellow-400">
            {summary.wins}-{summary.losses}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-950 p-4 text-center">
          <p className="text-xs text-zinc-500">
            平均得分
          </p>

          <p className="mt-2 text-2xl font-black text-white">
            {summary.averageRunsScored}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-950 p-4 text-center">
          <p className="text-xs text-zinc-500">
            平均失分
          </p>

          <p className="mt-2 text-2xl font-black text-white">
            {summary.averageRunsAllowed}
          </p>
        </div>

        <div className="rounded-xl bg-zinc-950 p-4 text-center">
          <p className="text-xs text-zinc-500">
            目前連續
          </p>

          <p className="mt-2 text-2xl font-black text-white">
            {summary.streak}
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamRecentGames({
  teamName,
  summary,
}: {
  teamName: string;
  summary: RecentGamesSummary;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            {teamName}
          </p>

          <h3 className="mt-1 text-2xl font-black text-white">
            近10場比分
          </h3>
        </div>

        <p className="text-sm font-black text-yellow-400">
          {summary.wins} 勝 {summary.losses} 敗
        </p>
      </div>

      {summary.games.length > 0 ? (
        <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
          {summary.games.map((game) => (
            <GameItem
              key={game.gamePk}
              game={game}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-zinc-900 p-6 text-zinc-500">
          目前沒有近10場比分資料。
        </div>
      )}
    </div>
  );
}

export default function RecentGamesCard({
  awayTeamName,
  homeTeamName,
  awaySummary,
  homeSummary,
}: Props) {
  return (
    <section className="mt-10 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6 md:p-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
          Recent 10 Games
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          近10場比分
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          顯示兩隊近期比賽結果、對手、主客場及得失分。
        </p>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <SummaryBox
          teamName={awayTeamName}
          summary={awaySummary}
        />

        <SummaryBox
          teamName={homeTeamName}
          summary={homeSummary}
        />
      </div>

      <div className="mt-8 space-y-10">
        <TeamRecentGames
          teamName={awayTeamName}
          summary={awaySummary}
        />

        <TeamRecentGames
          teamName={homeTeamName}
          summary={homeSummary}
        />
      </div>
    </section>
  );
}