import { getPitcherSeasonStats } from "../../../lib/api/pitcher";
import {
  formatTaiwanGameTime,
  getMlbGamesByTaiwanDate,
  getTaiwanTomorrow,
} from "../../../lib/api/mlb";
import {
  getMlbTeamLogo,
  getMlbTeamName,
} from "../../../lib/teams/mlb";
import { calculatePitcherScore } from "../../../lib/xsi/pitcher";

type PageProps = {
  params: Promise<{
    gamePk: string;
  }>;
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
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function PitcherScoreCard({
  score,
  grade,
  reasons,
}: {
  score: number;
  grade: string;
  reasons: string[];
}) {
  return (
    <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-400/5 p-4 text-left">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
            XSI Pitch
          </p>

          <p className="mt-1 text-sm text-zinc-400">{grade}</p>
        </div>

        <p className="text-4xl font-black text-yellow-400">{score}</p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-yellow-400"
          style={{ width: `${score}%` }}
        />
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {reasons.map((reason) => (
            <p key={reason} className="text-xs text-zinc-500">
              • {reason}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function GamePage({ params }: PageProps) {
  const { gamePk } = await params;
  const games = await getMlbGamesByTaiwanDate(getTaiwanTomorrow());

  const game = games.find((item) => String(item.gamePk) === gamePk);

  if (!game) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] p-10 text-white">
        <div className="mx-auto max-w-6xl">
          <a
            href="/"
            className="inline-block rounded-lg border border-yellow-500/30 px-4 py-2 text-yellow-400"
          >
            ← 返回明日賽事
          </a>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-zinc-900 p-8">
            <h1 className="text-3xl font-bold">找不到這場比賽</h1>

            <p className="mt-3 text-zinc-400">Game ID：{gamePk}</p>
          </div>
        </div>
      </main>
    );
  }

  const awayTeamId = game.teams.away.team.id;
  const homeTeamId = game.teams.home.team.id;

  const awayTeamName = getMlbTeamName(awayTeamId);
  const homeTeamName = getMlbTeamName(homeTeamId);

  const awayPitcher = game.teams.away.probablePitcher;
  const homePitcher = game.teams.home.probablePitcher;

  const [awayPitcherStats, homePitcherStats] = await Promise.all([
    getPitcherSeasonStats(awayPitcher?.id),
    getPitcherSeasonStats(homePitcher?.id),
  ]);

  const awayPitcherScore = calculatePitcherScore(awayPitcherStats);
  const homePitcherScore = calculatePitcherScore(homePitcherStats);

  const pitcherLeader =
    awayPitcherScore.score === homePitcherScore.score
      ? "雙方投手評分相同"
      : awayPitcherScore.score > homePitcherScore.score
        ? `${awayTeamName}先發投手較有優勢`
        : `${homeTeamName}先發投手較有優勢`;

  const scoreDifference = Math.abs(
    awayPitcherScore.score - homePitcherScore.score,
  );

  const riskLevel =
    scoreDifference >= 15 ? "較低" : scoreDifference >= 8 ? "中等" : "較高";

  return (
    <main className="min-h-screen bg-[#0b0b0b] p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <a
          href="/"
          className="inline-block rounded-lg border border-yellow-500/30 px-4 py-2 text-yellow-400 transition hover:bg-yellow-400 hover:text-black"
        >
          ← 返回明日賽事
        </a>

        <section className="mt-8 rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6 md:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-yellow-400">
              MLB 賽事分析
            </p>

            <h1 className="text-3xl font-bold md:text-4xl">
              {awayTeamName} vs {homeTeamName}
            </h1>

            <p className="text-zinc-400">
              比賽時間：{formatTaiwanGameTime(game.gameDate)}
            </p>

            <p className="text-sm text-zinc-500">Game ID：{gamePk}</p>
          </div>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_auto_1fr]">
            {/* 客隊 */}
            <div className="rounded-2xl bg-zinc-800 p-6 text-center">
              <p className="text-sm text-zinc-500">客隊</p>

              <img
                src={getMlbTeamLogo(awayTeamId)}
                alt={`${awayTeamName} Logo`}
                className="mx-auto mt-4 h-28 w-28 object-contain"
              />

              <h2 className="mt-4 text-2xl font-bold">{awayTeamName}</h2>

              <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">預計先發投手</p>

                <p className="mt-2 text-xl font-bold">
                  {awayPitcher?.fullName ?? "尚未公布"}
                </p>

                <PitcherScoreCard
                  score={awayPitcherScore.score}
                  grade={awayPitcherScore.grade}
                  reasons={awayPitcherScore.reasons}
                />

                {awayPitcherStats ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <StatItem label="ERA" value={awayPitcherStats.era} />
                    <StatItem label="WHIP" value={awayPitcherStats.whip} />
                    <StatItem
                      label="勝敗"
                      value={`${awayPitcherStats.wins}-${awayPitcherStats.losses}`}
                    />
                    <StatItem
                      label="三振"
                      value={awayPitcherStats.strikeOuts}
                    />
                    <StatItem
                      label="保送"
                      value={awayPitcherStats.walks}
                    />
                    <StatItem
                      label="投球局數"
                      value={awayPitcherStats.inningsPitched}
                    />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">
                    暫無本季投手數據
                  </p>
                )}
              </div>
            </div>

            <div className="pt-10 text-center text-3xl font-black text-yellow-400">
              VS
            </div>

            {/* 主隊 */}
            <div className="rounded-2xl bg-zinc-800 p-6 text-center">
              <p className="text-sm text-zinc-500">主隊</p>

              <img
                src={getMlbTeamLogo(homeTeamId)}
                alt={`${homeTeamName} Logo`}
                className="mx-auto mt-4 h-28 w-28 object-contain"
              />

              <h2 className="mt-4 text-2xl font-bold">{homeTeamName}</h2>

              <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">預計先發投手</p>

                <p className="mt-2 text-xl font-bold">
                  {homePitcher?.fullName ?? "尚未公布"}
                </p>

                <PitcherScoreCard
                  score={homePitcherScore.score}
                  grade={homePitcherScore.grade}
                  reasons={homePitcherScore.reasons}
                />

                {homePitcherStats ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <StatItem label="ERA" value={homePitcherStats.era} />
                    <StatItem label="WHIP" value={homePitcherStats.whip} />
                    <StatItem
                      label="勝敗"
                      value={`${homePitcherStats.wins}-${homePitcherStats.losses}`}
                    />
                    <StatItem
                      label="三振"
                      value={homePitcherStats.strikeOuts}
                    />
                    <StatItem
                      label="保送"
                      value={homePitcherStats.walks}
                    />
                    <StatItem
                      label="投球局數"
                      value={homePitcherStats.inningsPitched}
                    />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500">
                    暫無本季投手數據
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-xl bg-zinc-800 p-5">
              <p className="text-sm text-zinc-400">
                XSI Pitch 投手比較
              </p>

              <p className="mt-2 text-3xl font-bold text-yellow-400">
                {awayPitcherScore.score}：{homePitcherScore.score}
              </p>

              <p className="mt-2 text-sm text-zinc-500">{pitcherLeader}</p>
            </div>

            <div className="rounded-xl bg-zinc-800 p-5">
              <p className="text-sm text-zinc-400">推薦方向</p>

              <p className="mt-2 text-xl font-bold">
                {scoreDifference >= 8 ? pitcherLeader : "投手優勢不明顯"}
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                目前只依先發投手模組判斷
              </p>
            </div>

            <div className="rounded-xl bg-zinc-800 p-5">
              <p className="text-sm text-zinc-400">風險等級</p>

              <p className="mt-2 text-2xl font-bold">{riskLevel}</p>

              <p className="mt-2 text-sm text-zinc-500">
                投手評分差距：{scoreDifference} 分
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}