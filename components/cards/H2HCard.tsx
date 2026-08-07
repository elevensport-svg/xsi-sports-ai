import type {
  HeadToHeadGame,
  HeadToHeadSummary,
} from "../../lib/api/head-to-head";
import { getMlbTeamLogo } from "../../lib/teams/mlb";

type Props = {
  teamAId: number;
  teamAName: string;
  teamBId: number;
  teamBName: string;
  summary: HeadToHeadSummary;
};

function formatDate(value: string): string {
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

function TeamSummary({
  teamId,
  teamName,
  wins,
  averageRuns,
}: {
  teamId: number;
  teamName: string;
  wins: number;
  averageRuns: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
      <img
        src={getMlbTeamLogo(teamId)}
        alt={teamName}
        className="mx-auto h-16 w-16 object-contain"
      />

      <p className="mt-3 text-lg font-black text-white">
        {teamName}
      </p>

      <p className="mt-3 text-4xl font-black text-yellow-400">
        {wins}
      </p>

      <p className="mt-1 text-sm text-zinc-500">
        勝
      </p>

      <div className="mt-4 rounded-xl bg-zinc-950 p-3">
        <p className="text-xs text-zinc-500">
          平均得分
        </p>

        <p className="mt-1 text-xl font-black text-white">
          {averageRuns}
        </p>
      </div>
    </div>
  );
}

function GameRow({
  game,
}: {
  game: HeadToHeadGame;
}) {
  const awayWon =
    game.winnerTeamId === game.awayTeamId;

  const homeWon =
    game.winnerTeamId === game.homeTeamId;

  return (
    <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:grid-cols-[90px_1fr_auto_1fr] md:items-center">
      <p className="text-sm text-zinc-500">
        {formatDate(game.date)}
      </p>

      <div className="flex items-center gap-3">
        <img
          src={getMlbTeamLogo(game.awayTeamId)}
          alt={game.awayTeamName}
          className="h-9 w-9 object-contain"
        />

        <div>
          <p
            className={
              awayWon
                ? "font-black text-emerald-400"
                : "font-bold text-white"
            }
          >
            {game.awayTeamName}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            客隊
          </p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-3xl font-black text-white">
          {game.awayScore}
          <span className="mx-3 text-zinc-600">
            -
          </span>
          {game.homeScore}
        </p>
      </div>

      <div className="flex items-center gap-3 md:justify-end">
        <div className="md:text-right">
          <p
            className={
              homeWon
                ? "font-black text-emerald-400"
                : "font-bold text-white"
            }
          >
            {game.homeTeamName}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            主隊
          </p>
        </div>

        <img
          src={getMlbTeamLogo(game.homeTeamId)}
          alt={game.homeTeamName}
          className="h-9 w-9 object-contain"
        />
      </div>
    </div>
  );
}

export default function H2HCard({
  teamAId,
  teamAName,
  teamBId,
  teamBName,
  summary,
}: Props) {
  const totalGames = summary.games.length;

  return (
    <section className="mt-10 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6 md:p-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
          Head to Head
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          近 {totalGames || 10} 次交手
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          顯示兩隊近期直接對戰結果、勝場與平均得分。
        </p>
      </div>

      {totalGames === 0 ? (
        <div className="mt-6 rounded-2xl bg-zinc-900 p-6 text-zinc-500">
          目前沒有近期交手資料。
        </div>
      ) : (
        <>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <TeamSummary
              teamId={teamAId}
              teamName={teamAName}
              wins={summary.teamAWins}
              averageRuns={summary.teamAAverageRuns}
            />

            <TeamSummary
              teamId={teamBId}
              teamName={teamBName}
              wins={summary.teamBWins}
              averageRuns={summary.teamBAverageRuns}
            />
          </div>

          {summary.latestGame && (
            <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-400/5 p-5">
              <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
                最近一次交手
              </p>

              <div className="mt-4">
                <GameRow game={summary.latestGame} />
              </div>
            </div>
          )}

          <div className="mt-8">
            <p className="font-black text-white">
              歷史交手比分
            </p>

            <div className="mt-4 space-y-3">
              {summary.games.map((game) => (
                <GameRow
                  key={game.gamePk}
                  game={game}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}