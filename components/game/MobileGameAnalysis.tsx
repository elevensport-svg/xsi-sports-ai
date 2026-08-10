"use client";

import { formatTaiwanGameTime } from "../../lib/api/mlb";
import { getMlbTeamLogo } from "../../lib/teams/mlb";

type Props = {
  data: any;
};

export default function MobileGameAnalysis({
  data,
}: Props) {
  const {
    game,

    awayTeamId,
    homeTeamId,

    awayTeamName,
    homeTeamName,

    awayPitcher,
    homePitcher,

    awayPitcherScore,
    homePitcherScore,

    awayBattingScore,
    homeBattingScore,

    awayBullpenScore,
    homeBullpenScore,

    awayFormScore,
    homeFormScore,

    marketScore,

    headToHeadGames,

    winProbability,

    valueScore,

    betAdvisor,
  } = data;

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 pb-28 text-white">
      <div className="mx-auto w-full max-w-xl">

        {/* =========================
            賽事資訊
        ========================= */}
        <section className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">
          <p className="text-xs font-black tracking-widest text-yellow-400">
            MLB 賽事分析
          </p>

          <h1 className="mt-3 text-2xl font-black leading-tight">
            {awayTeamName}

            <span className="mx-2 text-yellow-400">
              VS
            </span>

            {homeTeamName}
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            比賽時間：
            {formatTaiwanGameTime(
              game.gameDate,
            )}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Game ID：{game.gamePk}
          </p>

          {/* 兩隊 */}
          <div className="mt-8 flex w-full gap-2">
            <div className="w-1/2">
              <TeamBox
                side="客隊"
                teamId={awayTeamId}
                teamName={awayTeamName}
                pitcher={awayPitcher}
                score={awayPitcherScore}
              />
            </div>

            <div className="w-1/2">
              <TeamBox
                side="主隊"
                teamId={homeTeamId}
                teamName={homeTeamName}
                pitcher={homePitcher}
                score={homePitcherScore}
              />
            </div>
          </div>
        </section>

        {/* =========================
            勝率
        ========================= */}
        <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">
          <p className="text-xs font-bold text-yellow-400">
            XSI 勝率預測
          </p>

          <div className="mt-4 flex gap-2">
            <div className="w-1/2 rounded-xl bg-black p-3 text-center">
              <p className="truncate text-xs text-zinc-400">
                {awayTeamName}
              </p>

              <p className="mt-2 text-2xl font-black text-yellow-400">
                {
                  winProbability.awayWinProbability
                }
                %
              </p>
            </div>

            <div className="w-1/2 rounded-xl bg-black p-3 text-center">
              <p className="truncate text-xs text-zinc-400">
                {homeTeamName}
              </p>

              <p className="mt-2 text-2xl font-black text-yellow-400">
                {
                  winProbability.homeWinProbability
                }
                %
              </p>
            </div>
          </div>
        </section>

        {/* =========================
            Value Score
        ========================= */}
        <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">
          <p className="text-xs font-bold tracking-widest text-zinc-500">
            XSI VALUE SCORE
          </p>

          <p className="mt-2 text-5xl font-black text-yellow-400">
            {valueScore.score}
          </p>

          <p className="mt-3 text-lg font-black">
            {betAdvisor.recommendation}
          </p>
        </section>

        {/* =========================
            投手分析
        ========================= */}
        <AnalysisSection
          title="⚾ 投手分析"
          subtitle="XSI PITCH"
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awayScore={
            awayPitcherScore?.score ?? 0
          }
          homeScore={
            homePitcherScore?.score ?? 0
          }
          awayGrade={
            awayPitcherScore?.grade
          }
          homeGrade={
            homePitcherScore?.grade
          }
        />

        {/* =========================
            打線分析
        ========================= */}
        <AnalysisSection
          title="🏏 打線分析"
          subtitle="XSI BATTING"
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awayScore={
            awayBattingScore?.score ?? 0
          }
          homeScore={
            homeBattingScore?.score ?? 0
          }
          awayGrade={
            awayBattingScore?.grade
          }
          homeGrade={
            homeBattingScore?.grade
          }
        />

        {/* =========================
            牛棚分析
        ========================= */}
        <AnalysisSection
          title="🔥 牛棚分析"
          subtitle="XSI BULLPEN"
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awayScore={
            awayBullpenScore?.score ?? 0
          }
          homeScore={
            homeBullpenScore?.score ?? 0
          }
          awayGrade={
            awayBullpenScore?.grade
          }
          homeGrade={
            homeBullpenScore?.grade
          }
        />

        {/* =========================
            近期狀態
        ========================= */}
        <AnalysisSection
          title="📈 近期狀態"
          subtitle="RECENT FORM"
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awayScore={
            awayFormScore?.score ?? 0
          }
          homeScore={
            homeFormScore?.score ?? 0
          }
          awayGrade={
            awayFormScore?.grade
          }
          homeGrade={
            homeFormScore?.grade
          }
        />

        {/* =========================
            市場盤口
        ========================= */}
        <AnalysisSection
          title="💰 市場盤口"
          subtitle="MARKET"
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
          awayScore={
            marketScore?.away?.score ?? 50
          }
          homeScore={
            marketScore?.home?.score ?? 50
          }
          awayGrade={
            marketScore?.away?.grade
          }
          homeGrade={
            marketScore?.home?.grade
          }
        />

        {/* =========================
            歷史交手
        ========================= */}
        <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">
          <p className="text-xs font-bold text-yellow-400">
            🕘 歷史交手
          </p>

          <h2 className="mt-2 text-xl font-black">
            H2H 對戰紀錄
          </h2>

          <div className="mt-4 rounded-xl bg-black p-4">
            <p className="text-sm text-zinc-400">
              系統參考歷史交手場數
            </p>

            <p className="mt-2 text-3xl font-black text-yellow-400">
              {Array.isArray(
                headToHeadGames,
              )
                ? headToHeadGames.length
                : 0}
            </p>
          </div>
        </section>

        {/* =========================
            AI 最終建議
        ========================= */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-400/10 via-zinc-900 to-zinc-900 p-4">
          <p className="text-xs font-black tracking-[0.2em] text-yellow-400">
            XSI AI 最終建議
          </p>

          <div className="mt-5 rounded-2xl bg-black p-5">
            <p className="text-xs text-zinc-500">
              AI 推薦
            </p>

            <p className="mt-2 text-2xl font-black text-white">
              {betAdvisor.recommendation}
            </p>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                信心度
              </span>

              <span className="text-2xl font-black text-yellow-400">
                {betAdvisor.confidence}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-yellow-400"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      Number(
                        betAdvisor.confidence ??
                          0,
                      ),
                      100,
                    ),
                  )}%`,
                }}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniInfo
                label="風險"
                value={
                  betAdvisor.risk ??
                  "中"
                }
              />

              <MiniInfo
                label="AI 評分"
                value={
                  betAdvisor.score ??
                  "-"
                }
              />
            </div>
          </div>

          {Array.isArray(
            betAdvisor.reasons,
          ) &&
            betAdvisor.reasons.length >
              0 && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-bold text-zinc-500">
                  AI 分析理由
                </p>

                <div className="mt-3 space-y-2">
                  {betAdvisor.reasons.map(
                    (
                      reason: string,
                      index: number,
                    ) => (
                      <p
                        key={`${reason}-${index}`}
                        className="text-sm leading-6 text-zinc-300"
                      >
                        • {reason}
                      </p>
                    ),
                  )}
                </div>
              </div>
            )}
        </section>

      </div>
    </main>
  );
}

function TeamBox({
  side,
  teamId,
  teamName,
  pitcher,
  score,
}: any) {
  const safeScore =
    Number(score?.score ?? 0);

  return (
    <div className="min-w-0 rounded-2xl bg-zinc-800 p-2 text-center">
      <p className="text-[10px] text-zinc-400">
        {side}
      </p>

      <img
        src={getMlbTeamLogo(teamId)}
        alt={teamName}
        className="mx-auto mt-3 h-14 w-14 object-contain"
      />

      <h2 className="mt-2 truncate text-xs font-black">
        {teamName}
      </h2>

      <div className="mt-3 rounded-xl bg-zinc-950 p-2">
        <p className="text-[9px] text-zinc-500">
          先發投手
        </p>

        <p className="mt-2 truncate text-xs font-bold">
          {pitcher?.fullName ??
            "尚未公布"}
        </p>

        <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-400/5 p-2">
          <p className="text-left text-[9px] font-bold text-yellow-400">
            XSI 投手評分
          </p>

          <p className="text-3xl font-black text-yellow-400">
            {safeScore}
          </p>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-yellow-400"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    safeScore,
                    100,
                  ),
                )}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisSection({
  title,
  subtitle,
  awayTeamName,
  homeTeamName,
  awayScore,
  homeScore,
  awayGrade,
  homeGrade,
}: {
  title: string;
  subtitle: string;
  awayTeamName: string;
  homeTeamName: string;
  awayScore: number;
  homeScore: number;
  awayGrade?: string;
  homeGrade?: string;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">
      <p className="text-xs font-bold text-yellow-400">
        {title}
      </p>

      <p className="mt-1 text-[10px] tracking-widest text-zinc-600">
        {subtitle}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ScoreBox
          teamName={awayTeamName}
          score={awayScore}
          grade={awayGrade}
        />

        <ScoreBox
          teamName={homeTeamName}
          score={homeScore}
          grade={homeGrade}
        />
      </div>
    </section>
  );
}

function ScoreBox({
  teamName,
  score,
  grade,
}: {
  teamName: string;
  score: number;
  grade?: string;
}) {
  const safeScore =
    Math.max(
      0,
      Math.min(
        Number(score ?? 0),
        100,
      ),
    );

  return (
    <div className="rounded-xl bg-black p-3">
      <p className="truncate text-xs text-zinc-400">
        {teamName}
      </p>

      <div className="mt-3 flex items-end justify-between">
        <p className="text-3xl font-black text-yellow-400">
          {safeScore}
        </p>

        {grade && (
          <span className="text-xs font-bold text-zinc-500">
            {grade}
          </span>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-yellow-400"
          style={{
            width: `${safeScore}%`,
          }}
        />
      </div>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 p-3">
      <p className="text-[10px] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-white">
        {value}
      </p>
    </div>
  );
}