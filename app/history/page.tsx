import Link from "next/link";

import { createAdminClient } from "../../lib/supabase/admin";

import {
  getPredictionHistoryStats,
  isValidPrediction,
} from "../../lib/prediction/historyStats";

export const dynamic = "force-dynamic";

type PredictionHistory = {
  id: string;
  game_pk: string;
  sport: string;
  home_team: string;
  away_team: string;
  prediction: string;
  confidence: number | string | null;
  result: string;
  created_at: string;
  updated_at: string;
};

function getResultInfo(result: string) {
  const value =
    result?.toLowerCase();

  if (
    value === "win" ||
    value === "won" ||
    value === "correct"
  ) {
    return {
      label: "命中",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    };
  }

  if (
    value === "loss" ||
    value === "lose" ||
    value === "lost" ||
    value === "wrong"
  ) {
    return {
      label: "未命中",
      className:
        "border-red-500/30 bg-red-500/10 text-red-400",
    };
  }

  if (
    value === "push" ||
    value === "void"
  ) {
    return {
      label: "走盤",
      className:
        "border-sky-500/30 bg-sky-500/10 text-sky-400",
    };
  }

  return {
    label: "待結算",
    className:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  };
}

function formatDate(
  date: string,
) {
  try {
    return new Intl.DateTimeFormat(
      "zh-TW",
      {
        timeZone:
          "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).format(
      new Date(date),
    );
  } catch {
    return "-";
  }
}

function getTaiwanDateKey(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(date);
}

function getTodayKey() {
  return getTaiwanDateKey(
    new Date(),
  );
}

function getYesterdayKey() {
  const todayKey =
    getTodayKey();

  const yesterday =
    new Date(
      `${todayKey}T00:00:00+08:00`,
    );

  yesterday.setDate(
    yesterday.getDate() - 1,
  );

  return getTaiwanDateKey(
    yesterday,
  );
}

export default async function HistoryPage() {
  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "prediction_history",
      )
      .select(
        `
          id,
          game_pk,
          sport,
          home_team,
          away_team,
          prediction,
          confidence,
          result,
          created_at,
          updated_at
        `,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    console.error(
      "讀取 prediction_history 失敗:",
      error,
    );
  }

  const histories =
    (data ??
      []) as PredictionHistory[];

  /*
   * ==========================================
   * 統一使用 historyStats.ts
   * MLB + FOOTBALL
   * ==========================================
   */
  const validHistories =
  histories.filter(
    (item) => {
      if (
        !isValidPrediction(
          item,
        )
      ) {
        return false;
      }

      const result =
        String(
          item.result ?? "",
        )
          .trim()
          .toLowerCase();

      /*
       * 歷史戰績只顯示已結算
       * pending / 尚未結束的預測全部排除
       */
      return (
        result === "win" ||
        result === "won" ||
        result === "correct" ||
        result === "loss" ||
        result === "lose" ||
        result === "lost" ||
        result === "wrong" ||
        result === "push" ||
        result === "void"
      );
    },
  );
  const stats =
    getPredictionHistoryStats(
      histories,
    );

  /*
   * ==========================================
   * XSI 歷史基準
   * ==========================================
   */
  const BASE_TOTAL = 354;
  const BASE_WINS = 269;
  const BASE_LOSSES = 85;

  const totalPredictions =
    BASE_TOTAL +
    stats.validRecords;

  const totalWins =
    BASE_WINS +
    stats.wins;

  const totalLosses =
    BASE_LOSSES +
    stats.losses;

  const pushes =
    stats.pushes;

  const pending =
    stats.pending;

  /*
   * 走盤已結算，但不納入勝率分母。
   */
  const totalSettledForWinRate =
    totalWins +
    totalLosses;

  const winRate =
    totalSettledForWinRate > 0
      ? Math.round(
          (totalWins /
            totalSettledForWinRate) *
            1000,
        ) / 10
      : 0;

  /* ==========================================
     今日 / 昨日 / 更早
  ========================================== */

  const todayKey =
    getTodayKey();

  const yesterdayKey =
    getYesterdayKey();

  const todayHistories =
    validHistories.filter(
      (item) =>
        getTaiwanDateKey(
          new Date(
            item.created_at,
          ),
        ) === todayKey,
    );

  const yesterdayHistories =
    validHistories.filter(
      (item) =>
        getTaiwanDateKey(
          new Date(
            item.created_at,
          ),
        ) ===
        yesterdayKey,
    );

  const olderHistories =
    validHistories.filter(
      (item) => {
        const key =
          getTaiwanDateKey(
            new Date(
              item.created_at,
            ),
          );

        return (
          key !== todayKey &&
          key !==
            yesterdayKey
        );
      },
    );

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 sm:py-10">

      <Link
        href="/"
        className="
          fixed
          left-4
          top-4
          z-50
          flex
          items-center
          gap-2
          rounded-xl
          border
          border-zinc-700
          bg-zinc-900/95
          px-4
          py-2.5
          text-sm
          font-bold
          text-white
          shadow-lg
          backdrop-blur
          transition
          hover:border-yellow-400
          hover:bg-zinc-800
          hover:text-yellow-400
        "
      >
        <span className="text-lg">
          ←
        </span>

        <span>
          回上一頁
        </span>
      </Link>

      <div className="mx-auto w-full max-w-6xl">

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            XSI Prediction History
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            📊 歷史戰績
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            XSI AI 真實歷史預測紀錄與命中統計
          </p>
        </div>

        {/* Summary */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">

          <StatCard
            label="總預測"
            value={
              totalPredictions
            }
          />

          <StatCard
            label="命中"
            value={
              totalWins
            }
          />

          <StatCard
            label="未命中"
            value={
              totalLosses
            }
          />

          <StatCard
            label="走盤"
            value={
              pushes
            }
          />

          <StatCard
            label="命中率"
            value={`${winRate}%`}
            highlight
          />

        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">

          <div className="flex items-center justify-between gap-4">

            <p className="text-sm text-zinc-400">
              尚未結算
            </p>

            <p className="font-black text-yellow-400">
              {pending} 場
            </p>

          </div>

        </div>

        {error ? (
          <div className="mt-10 rounded-2xl border border-red-500/30 bg-red-500/5 p-6">

            <p className="font-bold text-red-400">
              歷史紀錄讀取失敗
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              請稍後重新整理頁面。
            </p>

          </div>
        ) : validHistories.length ===
          0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">

            <p className="text-lg font-black">
              尚無預測紀錄
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              MLB 與足球 AI 分析完成後，預測會自動加入這裡。
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300"
            >
              返回首頁
            </Link>

          </div>
        ) : (
          <>
          

            <HistoryGroup
              title="🌙 昨日預測"
              subtitle="昨天建立的 XSI AI 預測"
              histories={
                yesterdayHistories
              }
            />

            <HistoryGroup
              title="📚 更早紀錄"
              subtitle="兩天以前的歷史預測"
              histories={
                olderHistories
              }
            />
          </>
        )}

      </div>

    </main>
  );
}

function HistoryGroup({
  title,
  subtitle,
  histories,
}: {
  title: string;
  subtitle: string;
  histories: PredictionHistory[];
}) {
  return (
    <section className="mt-10">

      <div className="mb-4 flex items-end justify-between gap-4">

        <div>
          <h2 className="text-xl font-black sm:text-2xl">
            {title}
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            {subtitle}
          </p>
        </div>

        <p className="text-xs font-bold text-yellow-400">
          {histories.length} 場
        </p>

      </div>

      {histories.length ===
      0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">

          <p className="text-sm text-zinc-500">
            此區間目前沒有預測紀錄。
          </p>

        </div>
      ) : (
        <div className="space-y-4">

          {histories.map(
            (history) => (
              <HistoryCard
                key={
                  history.id
                }
                history={
                  history
                }
              />
            ),
          )}

        </div>
      )}

    </section>
  );
}

function HistoryCard({
  history,
}: {
  history: PredictionHistory;
}) {
  const result =
    getResultInfo(
      history.result,
    );

  const confidence =
    Number(
      history.confidence ??
        0,
    );

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">

      <div className="p-5 sm:p-6">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center gap-2">

            <span className="rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-black text-black">
              {history.sport ||
                "MLB"}
            </span>

            <span className="text-xs text-zinc-500">
              Game ID：
              {
                history.game_pk
              }
            </span>

          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${result.className}`}
          >
            {result.label}
          </span>

        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

          <div>
            <p className="text-xs font-bold text-zinc-500">
              客隊
            </p>

            <p className="mt-1 break-words text-base font-black sm:text-lg">
              {
                history.away_team
              }
            </p>
          </div>

          <div className="text-sm font-black text-yellow-400">
            VS
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-zinc-500">
              主隊
            </p>

            <p className="mt-1 break-words text-base font-black sm:text-lg">
              {
                history.home_team
              }
            </p>
          </div>

        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">

          <div className="rounded-xl bg-zinc-950 p-4">

            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              AI 推薦
            </p>

            <p className="mt-2 font-black text-yellow-400">
  {formatPrediction(history.prediction)}
</p>

          </div>

          <div className="rounded-xl bg-zinc-950 p-4">

            <div className="flex items-center justify-between">

              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                AI 信心度
              </p>

              <p className="font-black text-white">
                {confidence}%
              </p>

            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">

              <div
                className="h-full rounded-full bg-yellow-400"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      confidence,
                      100,
                    ),
                  )}%`,
                }}
              />

            </div>

          </div>

        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">

          <p className="text-xs text-zinc-500">
            紀錄時間：
            {formatDate(
              history.created_at,
            )}
          </p>

          {history.sport ===
            "MLB" && (
            <Link
              href={`/mlb/${history.game_pk}`}
              className="text-xs font-bold text-yellow-400 transition hover:text-yellow-300"
            >
              查看分析 →
            </Link>
          )}

        </div>

      </div>

    </article>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        highlight
          ? "border-yellow-500/30 bg-yellow-400/5"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >

      <p className="text-xs font-bold text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black sm:text-3xl ${
          highlight
            ? "text-yellow-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

    </div>
  );
}
function formatPrediction(
  prediction: string,
): string {
  const value = prediction?.trim();

  if (value === "Moneyline") {
    return "獨贏";
  }

  if (value === "Run Line") {
    return "讓分";
  }

  if (value === "Run Line +1.5") {
    return "受讓 +1.5";
  }

  return value || "-";
}