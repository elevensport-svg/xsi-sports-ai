import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  getFootballGameById,
  formatTaiwanFootballTime,
} from "../../../lib/api/football";

import {
  getCurrentUserMembership,
} from "../../../lib/membership";

import {
  createAdminClient,
} from "../../../lib/supabase/admin";

export const dynamic =
  "force-dynamic";

type FootballGamePageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

type PredictionHistoryRow = {
  game_pk: string;
  sport: string;
  prediction: string;
  confidence: number | string | null;
  totals_prediction: string | null;
  totals_confidence: number | string | null;
  result: string | null;
};

function getLeagueIcon(
  league: string,
) {
  if (league === "英超") return "🏴";
  if (league === "西甲") return "🇪🇸";
  if (league === "義甲") return "🇮🇹";
  if (league === "德甲") return "🇩🇪";
  if (league === "法甲") return "🇫🇷";
  if (league === "歐冠") return "⭐";
  if (league === "歐霸") return "🏆";
  return "⚽";
}

function getRiskClass(
  risk:
    | "低風險"
    | "中等風險"
    | "高風險",
) {
  if (risk === "低風險") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }

  if (risk === "中等風險") {
    return "border-yellow-500/20 bg-yellow-400/10 text-yellow-400";
  }

  return "border-red-500/20 bg-red-500/10 text-red-400";
}

function getConfidence(
  value: number | string | null,
) {
  const number =
    Number(
      value ?? 0,
    );

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        number,
      ),
    ),
  );
}

function getRiskFromConfidence(
  confidence: number,
):
  | "低風險"
  | "中等風險"
  | "高風險" {
  if (confidence >= 82) {
    return "低風險";
  }

  if (confidence >= 68) {
    return "中等風險";
  }

  return "高風險";
}

export default async function FootballGamePage({
  params,
}: FootballGamePageProps) {
  const membership =
    await getCurrentUserMembership();

  if (!membership.isLoggedIn) {
    redirect("/login");
  }

  const resolvedParams =
    await params;

  const gameId =
    decodeURIComponent(
      resolvedParams.gameId,
    );

  const game =
    await getFootballGameById(
      gameId,
    );

  if (!game) {
    notFound();
  }

  const supabase =
    createAdminClient();

  const predictionResult =
    await supabase
      .from(
        "prediction_history",
      )
      .select(
        `
          game_pk,
          sport,
          prediction,
          confidence,
          totals_prediction,
          totals_confidence,
          result
        `,
      )
      .eq(
        "sport",
        "FOOTBALL",
      )
      .eq(
        "game_pk",
        gameId,
      )
      .maybeSingle();

  if (predictionResult.error) {
    console.error(
      "足球完整分析 prediction_history 讀取失敗：",
      predictionResult.error,
    );
  }

  const predictionHistory =
    (
      predictionResult.data ??
      null
    ) as PredictionHistoryRow | null;

  const officialRecommendation =
    String(
      predictionHistory?.prediction ??
        "尚未產生 AI 分析",
    ).trim();

  const officialConfidence =
    getConfidence(
      predictionHistory?.confidence ??
        null,
    );

  const officialRisk =
    getRiskFromConfidence(
      officialConfidence,
    );

  const totalsPrediction =
    predictionHistory?.totals_prediction
      ? String(
          predictionHistory.totals_prediction,
        ).trim()
      : null;

  const totalsConfidence =
    predictionHistory?.totals_confidence ===
        null ||
      predictionHistory?.totals_confidence ===
        undefined
      ? null
      : getConfidence(
          predictionHistory.totals_confidence,
        );

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-6 text-white sm:px-6 md:p-8">
      <div className="mx-auto w-full max-w-[1200px]">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/football"
            className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-400"
          >
            ← 回足球賽事
          </Link>

          <span className="rounded-full border border-yellow-500/20 bg-yellow-400/10 px-4 py-2 text-xs font-black text-yellow-400">
            {getLeagueIcon(
              game.leagueShortName,
            )}{" "}
            {game.leagueShortName}
          </span>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 bg-zinc-950/60 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                XSI FOOTBALL GAME ANALYSIS
              </p>

              <span className="text-xs font-bold text-zinc-500">
                {formatTaiwanFootballTime(
                  game.commenceTime,
                )}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div>
                <p className="text-xs font-bold text-zinc-500">
                  客隊
                </p>

                <h1 className="mt-2 text-xl font-black sm:text-3xl">
                  {game.awayTeam}
                </h1>
              </div>

              <div className="text-lg font-black text-yellow-400">
                VS
              </div>

              <div className="text-right">
                <p className="text-xs font-bold text-zinc-500">
                  主隊
                </p>

                <h1 className="mt-2 text-xl font-black sm:text-3xl">
                  {game.homeTeam}
                </h1>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-400/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
                OFFICIAL RECOMMENDATION
              </p>

              <h2 className="mt-3 text-3xl font-black">
                {officialRecommendation}
              </h2>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getRiskClass(
                officialRisk,
              )}`}
            >
              {officialRisk}
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-zinc-500">
                正式信心度
              </span>

              <span className="text-2xl font-black text-yellow-400">
                {officialConfidence}
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-yellow-400"
                style={{
                  width: `${officialConfidence}%`,
                }}
              />
            </div>
          </div>
        </section>

        {totalsPrediction && (
          <section className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-400/5 p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
              TOTALS
            </p>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">
                  {totalsPrediction}
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  大小球正式模型推薦
                </p>
              </div>

              {totalsConfidence !== null && (
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-500">
                    模型機率
                  </p>

                  <p className="mt-1 text-2xl font-black text-yellow-400">
                    {totalsConfidence}%
                  </p>
                </div>
              )}
            </div>

            {totalsConfidence !== null && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{
                    width:
                      `${totalsConfidence}%`,
                  }}
                />
              </div>
            )}
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400">
            ANALYSIS STATUS
          </p>

          <h2 className="mt-2 text-2xl font-black">
            正式預測資料
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            此頁直接讀取 prediction_history 的正式預測結果，不再於每次開啟頁面時重新執行完整 XSI 分析，因此載入速度會明顯提升。
          </p>
        </section>

      </div>
    </main>
  );
}