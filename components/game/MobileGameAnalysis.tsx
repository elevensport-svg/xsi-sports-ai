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
          JSON.parse(
            stored,
          );

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

    setSettingsLoaded(
      true,
    );
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
    mobileMode ===
      "compact";

  return (
    <main
      className="
        min-h-screen
        overflow-x-hidden
        bg-[#fffaf4]
        px-3
        py-4
        pb-28
        text-[#4a4038]
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-xl
        "
      >
        {/* =========================
            GAME HEADER
        ========================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[30px]
            border
            border-[#eee0cd]
            bg-white
            p-4
            shadow-[0_12px_32px_rgba(95,75,55,0.08)]
          "
        >
          {/* Decorations */}

          <div
            className="
              pointer-events-none
              absolute
              -left-14
              -top-14
              h-36
              w-36
              rounded-full
              bg-[#fff0a8]/45
              blur-2xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -right-12
              top-8
              h-36
              w-36
              rounded-full
              bg-[#dff5ff]/55
              blur-2xl
            "
          />

          <div className="relative">
            {/* Top */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-[13px]
                    bg-[#fff0bd]
                    text-lg
                  "
                >
                  ⚾
                </div>

                <div>
                  <p
                    className="
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.16em]
                      text-[#c68418]
                    "
                  >
                    XSI MLB
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      font-black
                      text-[#5c5148]
                    "
                  >
                    MLB 賽事分析
                  </p>
                </div>
              </div>

              <span
                className="
                  rounded-full
                  border
                  border-[#e7dccf]
                  bg-[#fffaf3]
                  px-3
                  py-1.5
                  text-[9px]
                  font-black
                  text-[#8d8177]
                "
              >
                {isCompact
                  ? "✨ 精簡模式"
                  : "🌟 完整模式"}
              </span>
            </div>

            {/* Match title */}

            <div
              className="
                mt-5
                text-center
              "
            >
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  text-[#aaa096]
                "
              >
                TODAY&apos;S MATCHUP
              </p>

              <h1
                className="
                  mt-2
                  text-lg
                  font-black
                  leading-snug
                  text-[#4a4038]
                  sm:text-xl
                "
              >
                {awayTeamName}

                <span
                  className="
                    mx-2
                    text-[#d59a27]
                  "
                >
                  VS
                </span>

                {homeTeamName}
              </h1>
            </div>

            {/* Time */}

            <div
              className="
                mt-4
                flex
                flex-wrap
                items-center
                justify-center
                gap-2
              "
            >
              <span
                className="
                  rounded-full
                  bg-[#eef9ff]
                  px-3
                  py-1.5
                  text-[10px]
                  font-bold
                  text-[#648293]
                "
              >
                🕐{" "}
                {formatTaiwanGameTime(
                  game.gameDate,
                )}
              </span>

              <span
                className="
                  rounded-full
                  bg-[#f7f3ff]
                  px-3
                  py-1.5
                  text-[10px]
                  font-bold
                  text-[#817396]
                "
              >
                🎟️ Game {game.gamePk}
              </span>
            </div>

            {/* Teams */}

            <div
              className="
                mt-6
                grid
                grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)]
                items-stretch
                gap-2
              "
            >
              <TeamBox
                side="客隊"
                teamId={
                  awayTeamId
                }
                teamName={
                  awayTeamName
                }
                pitcher={
                  awayPitcher
                }
                score={
                  awayPitcherScore
                }
                accent="yellow"
              />

              {/* VS */}

              <div
                className="
                  flex
                  items-center
                  justify-center
                "
              >
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#efdca8]
                    bg-white
                    text-[10px]
                    font-black
                    text-[#c98213]
                    shadow-sm
                  "
                >
                  VS
                </div>
              </div>

              <TeamBox
                side="主隊"
                teamId={
                  homeTeamId
                }
                teamName={
                  homeTeamName
                }
                pitcher={
                  homePitcher
                }
                score={
                  homePitcherScore
                }
                accent="blue"
              />
            </div>

            {/* Bottom */}

            <div
              className="
                mt-5
                rounded-[18px]
                border
                border-[#eee3d6]
                bg-[#fffdf9]
                px-4
                py-3
              "
            >
              <p
                className="
                  text-center
                  text-[10px]
                  leading-5
                  text-[#a0958b]
                "
              >
                🤖 XSI AI 將綜合投手、打線、牛棚、
                近期狀態與市場盤口進行分析
              </p>
            </div>
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
              winProbability
                .awayWinProbability
            }
            homeProbability={
              winProbability
                .homeWinProbability
            }
            isVip={
              membership.isVip
            }
          />
        </div>

        {/* =========================
            VALUE SCORE
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

/* ==========================================
   TEAM BOX
========================================== */

function TeamBox({
  side,
  teamId,
  teamName,
  pitcher,
  score,
  accent,
}: {
  side: string;
  teamId: number;
  teamName: string;
  pitcher: any;
  score: any;
  accent:
    | "yellow"
    | "blue";
}) {
  const pitchScore =
    Number(
      score?.score ??
        0,
    );

  const isYellow =
    accent ===
    "yellow";

  return (
    <div
      className={`
        relative
        min-w-0
        overflow-hidden
        rounded-[22px]
        border
        p-2.5
        text-center
        ${
          isYellow
            ? "border-[#f0dfb5] bg-[#fffaf0]"
            : "border-[#dcecf4] bg-[#f1faff]"
        }
      `}
    >
      {/* Decoration */}

      <div
        className={`
          pointer-events-none
          absolute
          -right-6
          -top-6
          h-16
          w-16
          rounded-full
          opacity-30
          ${
            isYellow
              ? "bg-[#ffe694]"
              : "bg-[#bfe8ff]"
          }
        `}
      />

      <div className="relative">
        {/* Side */}

        <span
          className={`
            inline-flex
            rounded-full
            px-2.5
            py-1
            text-[8px]
            font-black
            ${
              isYellow
                ? "bg-[#fff0bd] text-[#a66f14]"
                : "bg-[#dff4ff] text-[#5c8093]"
            }
          `}
        >
          {side}
        </span>

        {/* Logo */}

        <div
          className="
            mx-auto
            mt-3
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-[20px]
            bg-white
            shadow-sm
          "
        >
          <img
            src={
              getMlbTeamLogo(
                teamId,
              )
            }
            alt={
              teamName
            }
            className="
              h-14
              w-14
              object-contain
            "
          />
        </div>

        {/* Team */}

        <h2
          className="
            mt-3
            min-h-[36px]
            break-words
            text-xs
            font-black
            leading-[18px]
            text-[#4a4038]
          "
        >
          {teamName}
        </h2>

        {/* Pitcher */}

        <div
          className="
            mt-3
            rounded-[17px]
            border
            border-white
            bg-white/90
            p-2.5
            shadow-sm
          "
        >
          <p
            className="
              text-[8px]
              font-black
              uppercase
              tracking-[0.12em]
              text-[#aaa096]
            "
          >
            STARTER
          </p>

          <p
            className="
              mt-1
              text-[9px]
              font-bold
              text-[#9a8e84]
            "
          >
            先發投手
          </p>

          <p
            className="
              mt-2
              truncate
              text-[11px]
              font-black
              text-[#5b5149]
            "
          >
            {pitcher?.fullName ??
              "尚未公布"}
          </p>

          <div
            className="
              mt-3
              border-t
              border-[#f0e9e1]
              pt-2
            "
          >
            <p
              className="
                text-[8px]
                font-bold
                text-[#aaa096]
              "
            >
              XSI PITCH
            </p>

            <p
              className={`
                mt-1
                text-2xl
                font-black
                ${
                  isYellow
                    ? "text-[#c98213]"
                    : "text-[#54829a]"
                }
              `}
            >
              {pitchScore}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}