"use client";

import {
  useEffect,
  useState,
} from "react";

import WinProbabilityCard from "../cards/WinProbabilityCard";
import ValueScoreCard from "../cards/ValueScoreCard";
import BetAdvisorCard from "../cards/BetAdvisorCard";
import AIRecommendationCard from "../cards/AIRecommendationCard";
import H2HCard from "../cards/H2HCard";
import RecentGamesCard from "../cards/RecentGamesCard";
import MarketCard from "../cards/MarketCard";

import {
  getMlbTeamLogo,
} from "../../lib/teams/mlb";

import {
  formatTaiwanGameTime,
} from "../../lib/api/mlb";

type Props = {
  data: any;
};

type MobileMode =
  | "compact"
  | "full";

export default function MobileGameAnalysis({
  data,
}: Props) {
  const [
    mobileMode,
    setMobileMode,
  ] = useState<MobileMode>(
    "full",
  );

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
          parsed.mobileMode ===
            "compact" ||
          parsed.mobileMode ===
            "full"
        ) {
          setMobileMode(
            parsed.mobileMode,
          );
        }
      }
    } catch (error) {
      console.error(
        "讀取手機分析設定失敗:",
        error,
      );
    }

    setSettingsLoaded(true);
  }, []);

  const {
    membership,
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

    winProbability,

    valueScore,

    betAdvisor,

    selectedTeamName,

    awayXsi,
    homeXsi,

    marketScore,
    marketData,

    headToHeadGames,

    awayRecentGames,
    homeRecentGames,
  } = data;

  const isCompact =
    settingsLoaded &&
    mobileMode === "compact";

  return (
    <main className="min-h-screen bg-zinc-950 px-3 py-4 pb-28 text-white">
      <div className="mx-auto w-full max-w-xl">
        {/* =========================
            GAME HEADER
        ========================= */}
        <section className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-yellow-400">
              MLB 賽事分析
            </p>

            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-[10px] font-bold text-zinc-400">
              {isCompact
                ? "精簡模式"
                : "完整模式"}
            </span>
          </div>

          <h1 className="mt-3 text-xl font-black leading-snug sm:text-2xl">
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

          <div className="mt-6 grid grid-cols-[1fr_28px_1fr] items-center gap-2">
            <TeamBox
              side="客隊"
              teamId={awayTeamId}
              teamName={
                awayTeamName
              }
              pitcher={
                awayPitcher
              }
              score={
                awayPitcherScore
              }
            />

            <div className="flex items-center justify-center text-lg font-black text-yellow-400">
              VS
            </div>

            <TeamBox
              side="主隊"
              teamId={homeTeamId}
              teamName={
                homeTeamName
              }
              pitcher={
                homePitcher
              }
              score={
                homePitcherScore
              }
            />
          </div>
        </section>

        {/* =========================
            勝率
        ========================= */}
        <div className="mt-5">
          <WinProbabilityCard
            awayTeamName={
              awayTeamName
            }
            homeTeamName={
              homeTeamName
            }
            awayProbability={
              winProbability.awayWinProbability
            }
            homeProbability={
              winProbability.homeWinProbability
            }
            isVip={
              membership.isVip
            }
          />
        </div>

        {/* =========================
            Value Score
        ========================= */}
        <div className="mt-5">
          <ValueScoreCard
            score={
              valueScore.score
            }
            grade={
              valueScore.grade
            }
            isVip={
              membership.isVip
            }
          />
        </div>

        {/* =========================
            AI 最終建議
        ========================= */}
        <div className="mt-5">
          <AIRecommendationCard
            isVip={
              membership.isVip
            }
            awayTeamName={
              awayTeamName
            }
            homeTeamName={
              homeTeamName
            }
            selectedTeamName={
              selectedTeamName
            }
            awayXsi={
              awayXsi
            }
            homeXsi={
              homeXsi
            }
            awayPitchScore={
              awayPitcherScore.score
            }
            homePitchScore={
              homePitcherScore.score
            }
            awayBatScore={
              awayBattingScore.score
            }
            homeBatScore={
              homeBattingScore.score
            }
            awayBullpenScore={
              awayBullpenScore.score
            }
            homeBullpenScore={
              homeBullpenScore.score
            }
            awayFormScore={
              awayFormScore.score
            }
            homeFormScore={
              homeFormScore.score
            }
            awayMarketScore={
              marketScore.away.score
            }
            homeMarketScore={
              marketScore.home.score
            }
          />
        </div>

        {/* =========================
            完整模式才顯示
        ========================= */}
        {!isCompact && (
          <>
            <div className="mt-5">
              <BetAdvisorCard
                isVip={
                  membership.isVip
                }
                recommendation={
                  betAdvisor.recommendation
                }
                confidence={
                  betAdvisor.confidence
                }
                score={
                  betAdvisor.score
                }
                reasons={
                  betAdvisor.reasons
                }
                risk={
                  betAdvisor.risk
                }
                awayTeamName={
                  awayTeamName
                }
                homeTeamName={
                  homeTeamName
                }
                selectedTeamName={
                  selectedTeamName
                }
              />
            </div>

            <div className="mt-5">
              <H2HCard
                teamAId={
                  awayTeamId
                }
                teamAName={
                  awayTeamName
                }
                teamBId={
                  homeTeamId
                }
                teamBName={
                  homeTeamName
                }
                summary={
                  headToHeadGames
                }
              />
            </div>

            <div className="mt-5">
              <RecentGamesCard
                awayTeamName={
                  awayTeamName
                }
                homeTeamName={
                  homeTeamName
                }
                awaySummary={
                  awayRecentGames
                }
                homeSummary={
                  homeRecentGames
                }
              />
            </div>

            <div className="mt-5">
              <MarketCard
                market={
                  marketData
                }
                scores={
                  marketScore
                }
              />
            </div>
          </>
        )}
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
  const pitchScore =
    Number(
      score?.score ?? 0,
    );

  return (
    <div className="min-w-0 rounded-2xl bg-zinc-800 p-2.5 text-center">
      <p className="text-[10px] text-zinc-400">
        {side}
      </p>

      <img
        src={
          getMlbTeamLogo(
            teamId,
          )
        }
        alt={
          teamName
        }
        className="mx-auto mt-3 h-14 w-14 object-contain"
      />

      <h2 className="mt-2 min-h-[34px] break-words text-xs font-black leading-4">
        {teamName}
      </h2>

      <div className="mt-3 rounded-xl bg-zinc-900 p-2.5">
        <p className="text-[9px] text-zinc-400">
          先發投手
        </p>

        <p className="mt-2 truncate text-xs font-bold">
          {pitcher?.fullName ??
            "尚未公布"}
        </p>

        <p className="mt-3 text-3xl font-black text-yellow-400">
          {pitchScore}
        </p>
      </div>
    </div>
  );
}