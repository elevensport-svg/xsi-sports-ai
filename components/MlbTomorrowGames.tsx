import Image from "next/image";
import Link from "next/link";

import {
  formatTaiwanGameTime,
  getTomorrowMlbGames,
  type MlbScheduleGame,
} from "../lib/api/mlb";

import {
  getMlbTeamLogo,
  getMlbTeamName,
} from "../lib/teams/mlb";

export default async function MlbTomorrowGames() {
  const games = await getTomorrowMlbGames();

  if (games.length === 0) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-black text-white">
          目前查不到明日 MLB 賽程
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          可能是休兵日、賽程尚未更新，或 MLB API 暫時沒有資料。
        </p>
      </section>
    );
  }

  return (
    <section className="w-full min-w-0">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
          Tomorrow Schedule
        </p>

        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          明日 MLB 賽事
        </h2>
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <GameItem
            key={game.gamePk}
            game={game}
          />
        ))}
      </div>
    </section>
  );
}

type GameItemProps = {
  game: MlbScheduleGame;
};

function GameItem({
  game,
}: GameItemProps) {
  const awayTeamId =
    game.teams.away.team.id;

  const homeTeamId =
    game.teams.home.team.id;

  const awayTeamName =
    getMlbTeamName(awayTeamId);

  const homeTeamName =
    getMlbTeamName(homeTeamId);

  const awayTeamLogo =
    getMlbTeamLogo(awayTeamId);

  const homeTeamLogo =
    getMlbTeamLogo(homeTeamId);

  return (
    <Link
      href={`/mlb/${game.gamePk}`}
      className="group block w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-yellow-400/50 hover:bg-zinc-800 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-black">
          MLB
        </div>

        <p className="min-w-0 text-right text-xs text-zinc-500">
          {formatTaiwanGameTime(
            game.gameDate,
          )}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-start gap-2">
        <TeamRow
          label="客隊"
          teamName={awayTeamName}
          teamLogo={awayTeamLogo}
          pitcherName={
            game.teams.away
              .probablePitcher
              ?.fullName ??
            "尚未公布"
          }
        />

        <div className="flex h-full items-center justify-center pt-16">
          <span className="text-sm font-black text-yellow-400">
            VS
          </span>
        </div>

        <TeamRow
          label="主隊"
          teamName={homeTeamName}
          teamLogo={homeTeamLogo}
          pitcherName={
            game.teams.home
              .probablePitcher
              ?.fullName ??
            "尚未公布"
          }
        />
      </div>

      <div className="mt-6 border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-500">
          Game ID：{game.gamePk}
        </p>

        <div className="mt-4 flex w-full items-center justify-center rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black transition group-hover:bg-yellow-300">
          查看完整 AI 分析 →
        </div>
      </div>
    </Link>
  );
}

type TeamRowProps = {
  label: string;
  teamName: string;
  teamLogo: string;
  pitcherName: string;
};

function TeamRow({
  label,
  teamName,
  teamLogo,
  pitcherName,
}: TeamRowProps) {
  return (
    <div className="min-w-0 text-center">
      <p className="text-xs font-bold text-zinc-500">
        {label}
      </p>

      <div className="mt-3 flex justify-center">
        <div className="relative h-16 w-16 sm:h-20 sm:w-20">
          <Image
            src={teamLogo}
            alt={teamName}
            fill
            sizes="80px"
            className="object-contain"
          />
        </div>
      </div>

      <p className="mt-3 break-words text-base font-black leading-snug text-white sm:text-lg">
        {teamName}
      </p>

      <div className="mt-3 rounded-xl bg-zinc-800 px-2 py-3">
        <p className="text-[10px] text-zinc-500">
          預計先發
        </p>

        <p className="mt-1 break-words text-xs font-bold leading-snug text-white sm:text-sm">
          {pitcherName}
        </p>
      </div>
    </div>
  );
}