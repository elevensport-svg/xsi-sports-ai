import GameCard from "./GameCard";
import {
  formatTaiwanGameTime,
  getTomorrowMlbGames,
} from "../lib/api/mlb";
import {
  getMlbTeamLogo,
  getMlbTeamName,
} from "../lib/teams/mlb";

export default async function MlbTomorrowGames() {
  const games = await getTomorrowMlbGames();

  if (games.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-8">
        <p className="font-bold text-yellow-400">
          目前查不到明日 MLB 賽程
        </p>

        <p className="mt-2 text-sm text-zinc-400">
          可能是休兵日、賽程尚未更新，或 MLB API 暫時無法連線。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-3">
      {games.map((game) => {
        const awayTeamId = game.teams.away.team.id;
        const homeTeamId = game.teams.home.team.id;

        return (
          <GameCard
            key={game.gamePk}
            gamePk={game.gamePk}
            league="MLB"
            awayTeam={getMlbTeamName(awayTeamId)}
            homeTeam={getMlbTeamName(homeTeamId)}
            awayTeamLogo={getMlbTeamLogo(awayTeamId)}
            homeTeamLogo={getMlbTeamLogo(homeTeamId)}
            awayPitcher={
              game.teams.away.probablePitcher?.fullName ?? "尚未公布"
            }
            homePitcher={
              game.teams.home.probablePitcher?.fullName ?? "尚未公布"
            }
            time={formatTaiwanGameTime(game.gameDate)}
            status={game.status.detailedState}
          />
        );
      })}
    </div>
  );
}