import {
  getCurrentMlbSchedule,
  isMlbTomorrowSchedule,
} from "../lib/api/mlb";

import MlbGamesList from "./MlbGamesList";

export default async function MlbTomorrowGames() {
  const games =
    await getCurrentMlbSchedule();

  const isTomorrow =
    isMlbTomorrowSchedule();

  const englishTitle =
    isTomorrow
      ? "Tomorrow Schedule"
      : "Today Schedule";

  const chineseTitle =
    isTomorrow
      ? "明日 MLB 賽事"
      : "今日 MLB 賽事";

  const emptyTitle =
    isTomorrow
      ? "目前查不到明日 MLB 賽程"
      : "目前查不到今日 MLB 賽程";

  return (
    <section className="w-full min-w-0">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
          {englishTitle}
        </p>

        <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
          {chineseTitle}
        </h2>

        {games.length > 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            共 {games.length} 場賽事
          </p>
        )}

        <p className="mt-2 text-xs text-zinc-600">
          每日下午 3:00 自動切換隔日賽程
        </p>
      </div>

      {games.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="font-black text-white">
            {emptyTitle}
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            可能是休兵日、賽程尚未更新，
            或 MLB API 暫時沒有資料。
          </p>
        </div>
      ) : (
        <MlbGamesList
          games={games}
        />
      )}
    </section>
  );
}