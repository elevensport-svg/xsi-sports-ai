"use client";

import {
  useEffect,
  useState,
} from "react";

type TeamXsi = {
  total: number;
  confidence: number;
  recommendation: string;
  risk: string;
};

type Props = {
  isVip: boolean;

  awayTeamName: string;
  homeTeamName: string;

  awayXsi: TeamXsi;
  homeXsi: TeamXsi;

  awayPitchScore: number;
  homePitchScore: number;

  awayBatScore: number;
  homeBatScore: number;

  awayBullpenScore: number;
  homeBullpenScore: number;

  awayFormScore: number;
  homeFormScore: number;

  awayMarketScore: number;
  homeMarketScore: number;
};

const LINE_URL =
  "https://lin.ee/r8t6pBB4";

function getStars(
  confidence: number,
): string {
  if (confidence >= 85) {
    return "★★★★★";
  }

  if (confidence >= 75) {
    return "★★★★☆";
  }

  if (confidence >= 65) {
    return "★★★☆☆";
  }

  if (confidence >= 55) {
    return "★★☆☆☆";
  }

  return "★☆☆☆☆";
}

function getBetLevel(
  confidence: number,
): string {
  if (confidence >= 85) {
    return "強力推薦";
  }

  if (confidence >= 75) {
    return "可以考慮";
  }

  if (confidence >= 65) {
    return "小注方向";
  }

  if (confidence >= 55) {
    return "保守觀望";
  }

  return "PASS";
}

function getAdvantageText(
  label: string,
  awayScore: number,
  homeScore: number,
  awayTeamName: string,
  homeTeamName: string,
): string {
  const difference =
    Math.abs(
      awayScore -
        homeScore,
    );

  if (difference < 3) {
    return `${label}：雙方差距不明顯`;
  }

  const leadingTeam =
    awayScore > homeScore
      ? awayTeamName
      : homeTeamName;

  return `${label}：${leadingTeam}領先 ${difference.toFixed(
    1,
  )} 分`;
}

export default function AIRecommendationCard({
  isVip,

  awayTeamName,
  homeTeamName,

  awayXsi,
  homeXsi,

  awayPitchScore,
  homePitchScore,

  awayBatScore,
  homeBatScore,

  awayBullpenScore,
  homeBullpenScore,

  awayFormScore,
  homeFormScore,

  awayMarketScore,
  homeMarketScore,
}: Props) {
  const [
    minConfidence,
    setMinConfidence,
  ] = useState(75);

  const [
    settingsLoaded,
    setSettingsLoaded,
  ] = useState(false);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          "xsi-settings",
        );

      if (stored) {
        const parsed =
          JSON.parse(stored);

        if (
          typeof parsed.minConfidence ===
          "number"
        ) {
          setMinConfidence(
            parsed.minConfidence,
          );
        }
      }
    } catch (error) {
      console.error(
        "讀取 XSI AI 設定失敗:",
        error,
      );
    }

    setSettingsLoaded(true);
  }, []);

  const isTie =
    awayXsi.total ===
    homeXsi.total;

  const selectedTeam =
    awayXsi.total >
    homeXsi.total
      ? awayTeamName
      : homeTeamName;

  const selectedXsi =
    awayXsi.total >=
    homeXsi.total
      ? awayXsi
      : homeXsi;

  const scoreDifference =
    Math.abs(
      awayXsi.total -
        homeXsi.total,
    );

  const confidence =
    selectedXsi.confidence;

  const stars =
    getStars(confidence);

  const betLevel =
    getBetLevel(confidence);

  const belowUserThreshold =
    settingsLoaded &&
    confidence <
      minConfidence;

  function formatRecommendation(
  teamName: string,
  recommendation: string,
): string {
  if (recommendation === "獨贏") {
    return `${teamName} 獨贏`;
  }

  if (
    recommendation === "受讓 +1.5"
  ) {
    return `${teamName} 受讓 +1.5`;
  }

  if (
    recommendation === "讓分"
  ) {
    return `${teamName} 讓分 -1.5`;
  }

  return `${teamName} ${recommendation}`;
}

const finalRecommendation =
  isTie ||
  confidence < 55
    ? "PASS，本場暫無明顯投注價值"
    : belowUserThreshold
      ? `未達你的推薦門檻（最低 ${minConfidence}%）`
      : formatRecommendation(
          selectedTeam,
          selectedXsi.recommendation,
        );

  const reasons = [
    getAdvantageText(
      "先發投手",
      awayPitchScore,
      homePitchScore,
      awayTeamName,
      homeTeamName,
    ),

    getAdvantageText(
      "球隊打線",
      awayBatScore,
      homeBatScore,
      awayTeamName,
      homeTeamName,
    ),

    getAdvantageText(
      "牛棚表現",
      awayBullpenScore,
      homeBullpenScore,
      awayTeamName,
      homeTeamName,
    ),

    getAdvantageText(
      "近期狀態",
      awayFormScore,
      homeFormScore,
      awayTeamName,
      homeTeamName,
    ),

    getAdvantageText(
      "市場盤口",
      awayMarketScore,
      homeMarketScore,
      awayTeamName,
      homeTeamName,
    ),
  ];

  // ==========================================
  // FREE USER
  // ==========================================

  if (!isVip) {
    return (
      <section className="mt-6 overflow-hidden rounded-2xl border border-yellow-500/20 bg-zinc-950">
        <div className="p-6 md:p-8">

          <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
            XSI AI 最終建議
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-8">

            <div className="text-center">

              <div className="text-4xl">
                🔒
              </div>

              <h2 className="mt-4 text-2xl font-black text-white md:text-3xl">
                XSI VIP AI 分析
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                升級 VIP 查看完整 AI 推演、球隊優勢、XSI 差距與市場分析
              </p>

            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="text-sm font-bold text-zinc-300">
                  🔒 AI 最終推薦
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="text-sm font-bold text-zinc-300">
                  🔒 投手分析
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="text-sm font-bold text-zinc-300">
                  🔒 打線分析
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="text-sm font-bold text-zinc-300">
                  🔒 牛棚分析
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="text-sm font-bold text-zinc-300">
                  🔒 市場盤口
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="text-sm font-bold text-zinc-300">
                  🔒 AI 風險評估
                </p>
              </div>

            </div>

            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 block w-full rounded-xl bg-yellow-400 px-6 py-4 text-center text-base font-black text-black transition hover:bg-yellow-300"
            >
              🔒 升級 VIP 查看完整 AI 分析
            </a>

          </div>

        </div>
      </section>
    );
  }

  // ==========================================
  // VIP USER
  // ==========================================

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-yellow-500/20 bg-zinc-950">
      <div className="p-6 md:p-8">

        <p className="text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
          XSI AI 最終建議
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">

          <div
            className={`rounded-2xl border p-6 ${
              belowUserThreshold
                ? "border-zinc-700 bg-zinc-900/60"
                : "border-yellow-500/20 bg-black/30"
            }`}
          >

            <p className="text-sm text-zinc-500">
              AI 最終建議
            </p>

            <h2
              className={`mt-3 text-3xl font-black md:text-4xl ${
                belowUserThreshold
                  ? "text-zinc-400"
                  : "text-white"
              }`}
            >
              {finalRecommendation}
            </h2>

            <p
              className={`mt-4 text-3xl tracking-widest ${
                belowUserThreshold
                  ? "text-zinc-600"
                  : "text-yellow-400"
              }`}
            >
              {stars}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">

              <span
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  belowUserThreshold
                    ? "bg-zinc-800 text-zinc-400"
                    : "bg-yellow-400 text-black"
                }`}
              >
                信心 {confidence}%
              </span>

              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-300">
                {belowUserThreshold
                  ? "未達設定門檻"
                  : betLevel}
              </span>

              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-300">
                風險：
                {selectedXsi.risk}
              </span>

            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">

              <div className="flex items-center justify-between gap-4">

                <span className="text-xs text-zinc-500">
                  你的最低推薦門檻
                </span>

                <span className="text-sm font-black text-yellow-400">
                  {minConfidence}%
                </span>

              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        minConfidence,
                        100,
                      ),
                    )}%`,
                  }}
                />
              </div>

            </div>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">

            <div className="rounded-2xl bg-zinc-900 p-5">

              <p className="text-xs text-zinc-500">
                領先球隊
              </p>

              <p className="mt-2 text-2xl font-black text-yellow-400">
                {isTie
                  ? "雙方相同"
                  : selectedTeam}
              </p>

            </div>

            <div className="rounded-2xl bg-zinc-900 p-5">

              <p className="text-xs text-zinc-500">
                XSI 綜合差距
              </p>

              <p className="mt-2 text-3xl font-black text-white">
                {scoreDifference.toFixed(
                  1,
                )}
              </p>

            </div>

          </div>

        </div>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-6">

          <p className="font-black text-yellow-400">
            AI 判斷依據
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">

            {reasons.map(
              (reason) => (
                <div
                  key={reason}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <p className="text-sm text-zinc-300">
                    ✓ {reason}
                  </p>
                </div>
              ),
            )}

          </div>

        </div>

        <p className="mt-5 text-xs leading-6 text-zinc-600">
          此結果依先發投手、打線、牛棚、近期狀態及市場盤口模型計算，僅供賽事研究參考。
        </p>

      </div>
    </section>
  );
}