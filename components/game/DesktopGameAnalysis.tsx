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

export default function DesktopGameAnalysis({
  data,
}: Props) {
  const {
    membership,
    game,

    awayTeamId,
    homeTeamId,

    awayTeamName,
    homeTeamName,

    selectedTeamName,

    awayPitcher,
    homePitcher,

    awayPitcherScore,
    homePitcherScore,

    awayBattingScore,
    homeBattingScore,

    awayFormScore,
    homeFormScore,

    awayBullpenScore,
    homeBullpenScore,

    winProbability,

    valueScore,

    betAdvisor,

    awayXsi,
    homeXsi,

    marketScore,
    marketData,

    headToHeadGames,

    awayRecentGames,
    homeRecentGames,
  } = data;

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#fffaf3]
        px-6
        pb-16
        pt-24
        text-[#4a4038]
      "
    >
      {/* ======================================
          Background Decorations
      ====================================== */}

      <div
        className="
          pointer-events-none
          absolute
          -left-32
          -top-20
          h-96
          w-96
          rounded-full
          bg-[#fff0a8]/25
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-32
          top-60
          h-96
          w-96
          rounded-full
          bg-[#dff5ff]/45
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          bottom-32
          left-1/3
          h-72
          w-72
          rounded-full
          bg-[#e5fff2]/40
          blur-3xl
        "
      />

      <div
        className="
          relative
          mx-auto
          max-w-[1400px]
        "
      >
        {/* ======================================
            GAME HEADER
        ====================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[34px]
            border
            border-[#eedfc9]
            bg-white
            shadow-[0_18px_50px_rgba(95,75,55,0.10)]
          "
        >
          {/* Header Decoration */}

          <div
            className="
              pointer-events-none
              absolute
              -right-20
              -top-20
              h-64
              w-64
              rounded-full
              bg-[#dff5ff]/45
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-24
              -left-10
              h-60
              w-60
              rounded-full
              bg-[#fff0a8]/30
            "
          />

          {/* ======================================
              Game Title
          ====================================== */}

          <div
            className="
              relative
              border-b
              border-[#f0e5d8]
              bg-gradient-to-r
              from-[#fff9e8]
              via-white
              to-[#edf9ff]
              px-8
              py-7
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-6
              "
            >
              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      rounded-full
                      bg-[#fff0bd]
                      px-3
                      py-1
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.2em]
                      text-[#9f711e]
                    "
                  >
                    ⚾ MLB GAME ANALYSIS
                  </span>

                  <span
                    className="
                      rounded-full
                      border
                      border-[#dcecf4]
                      bg-[#eef9ff]
                      px-3
                      py-1
                      text-[10px]
                      font-black
                      text-[#578094]
                    "
                  >
                    🤖 XSI AI
                  </span>
                </div>

                <h1
                  className="
                    mt-4
                    text-4xl
                    font-black
                    tracking-tight
                    text-[#4a4038]
                  "
                >
                  {awayTeamName}

                  <span
                    className="
                      mx-4
                      text-[#c98213]
                    "
                  >
                    VS
                  </span>

                  {homeTeamName}
                </h1>

                <div
                  className="
                    mt-4
                    flex
                    flex-wrap
                    items-center
                    gap-3
                  "
                >
                  <span
                    className="
                      rounded-full
                      bg-white
                      px-4
                      py-2
                      text-xs
                      font-bold
                      text-[#8f8378]
                      shadow-sm
                    "
                  >
                    🕒 比賽時間：
                    {formatTaiwanGameTime(
                      game.gameDate,
                    )}
                  </span>

                  <span
                    className="
                      rounded-full
                      bg-white
                      px-4
                      py-2
                      text-xs
                      font-bold
                      text-[#aaa096]
                      shadow-sm
                    "
                  >
                    🏷️ Game ID：
                    {game.gamePk}
                  </span>
                </div>
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-[22px]
                  border
                  border-[#eee3d5]
                  bg-white/80
                  px-4
                  py-3
                  shadow-sm
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-[16px]
                    bg-[#fff3c9]
                    text-xl
                  "
                >
                  🤖
                </div>

                <div>
                  <p
                    className="
                      text-xs
                      font-black
                      text-[#62574f]
                    "
                  >
                    XSI 小助手
                  </p>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      font-bold
                      text-[#a0958b]
                    "
                  >
                    AI 賽事研究中 ✨
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================
              Matchup
          ====================================== */}

          <div
            className="
              relative
              grid
              grid-cols-[1fr_100px_1fr]
              items-center
              gap-8
              p-8
            "
          >
            <TeamBox
              side="AWAY"
              label="客隊"
              accent="yellow"
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
            />

            {/* VS */}

            <div
              className="
                flex
                flex-col
                items-center
                justify-center
              "
            >
              <div
                className="
                  flex
                  h-20
                  w-20
                  items-center
                  justify-center
                  rounded-full
                  border-[5px]
                  border-white
                  bg-gradient-to-br
                  from-[#ffd96d]
                  to-[#ffb347]
                  text-2xl
                  font-black
                  text-[#5b4315]
                  shadow-[0_12px_28px_rgba(255,185,76,0.30)]
                "
              >
                VS
              </div>

              <span
                className="
                  mt-3
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  text-[#b0a59b]
                "
              >
                MATCHUP
              </span>
            </div>

            <TeamBox
              side="HOME"
              label="主隊"
              accent="blue"
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
            />
          </div>
        </section>

        {/* ======================================
            Analysis Label
        ====================================== */}

        <div
          className="
            mt-10
            flex
            items-center
            gap-4
          "
        >
          <div
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-[18px]
              bg-[#fff0bd]
              text-2xl
              shadow-sm
            "
          >
            🤖
          </div>

          <div>
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.22em]
                text-[#c68418]
              "
            >
              XSI AI ANALYSIS
            </p>

            <h2
              className="
                mt-1
                text-2xl
                font-black
                text-[#4a4038]
              "
            >
              AI 賽事研究報告
            </h2>
          </div>
        </div>

        {/* ======================================
            WIN PROBABILITY
        ====================================== */}

        <div className="mt-6">
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

        {/* ======================================
            VALUE SCORE
        ====================================== */}

        <div className="mt-6">
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

        {/* ======================================
            BET ADVISOR
        ====================================== */}

        <div className="mt-6">
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

        {/* ======================================
            AI 最終建議
        ====================================== */}

        <div className="mt-6">
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

        {/* ======================================
            H2H
        ====================================== */}

        <div className="mt-6">
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

        {/* ======================================
            RECENT GAMES
        ====================================== */}

        <div className="mt-6">
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

        {/* ======================================
            MARKET
        ====================================== */}

        <div className="mt-6">
          <MarketCard
            market={
              marketData
            }
            scores={
              marketScore
            }
          />
        </div>
      </div>
    </main>
  );
}

function TeamBox({
  side,
  label,
  accent,
  teamId,
  teamName,
  pitcher,
  score,
}: any) {
  const pitchScore =
    Number(
      score?.score ?? 0,
    );

  const isYellow =
    accent ===
    "yellow";

  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-[30px]
        border
        p-6
        text-center
        shadow-[0_10px_28px_rgba(95,75,55,0.07)]
        ${
          isYellow
            ? "border-[#f0dfb5] bg-[#fffaf0]"
            : "border-[#dcecf4] bg-[#f1faff]"
        }
      `}
    >
      <div
        className={`
          pointer-events-none
          absolute
          -right-8
          -top-8
          h-28
          w-28
          rounded-full
          opacity-40
          ${
            isYellow
              ? "bg-[#ffe99a]"
              : "bg-[#cfeeff]"
          }
        `}
      />

      <div className="relative">
        <div
          className="
            flex
            items-center
            justify-center
            gap-2
          "
        >
          <span
            className={`
              rounded-full
              px-3
              py-1
              text-[10px]
              font-black
              tracking-[0.18em]
              ${
                isYellow
                  ? "bg-[#fff0bd] text-[#a1721b]"
                  : "bg-[#dff4ff] text-[#557e92]"
              }
            `}
          >
            {side}
          </span>

          <span
            className="
              text-xs
              font-black
              text-[#9b9086]
            "
          >
            {label}
          </span>
        </div>

        {/* Team Logo */}

        <div
          className="
            mx-auto
            mt-5
            flex
            h-36
            w-36
            items-center
            justify-center
            rounded-[32px]
            border
            border-white
            bg-white
            shadow-[0_10px_25px_rgba(95,75,55,0.08)]
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
              h-28
              w-28
              object-contain
            "
          />
        </div>

        <h2
          className="
            mt-5
            text-2xl
            font-black
            tracking-tight
            text-[#4a4038]
          "
        >
          {teamName}
        </h2>

        {/* Pitcher */}

        <div
          className="
            mt-5
            rounded-[22px]
            border
            border-white
            bg-white/85
            p-5
            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              justify-center
              gap-2
            "
          >
            <span>
              ⚾
            </span>

            <p
              className="
                text-xs
                font-black
                text-[#9a8e83]
              "
            >
              先發投手
            </p>
          </div>

          <p
            className="
              mt-3
              text-xl
              font-black
              text-[#4a4038]
            "
          >
            {pitcher?.fullName ??
              "TBD"}
          </p>

          <div
            className="
              mt-5
              flex
              items-center
              justify-center
              gap-3
            "
          >
            <span
              className="
                text-xs
                font-bold
                text-[#a69a90]
              "
            >
              投手評分
            </span>

            <div
              className={`
                flex
                h-14
                min-w-14
                items-center
                justify-center
                rounded-[18px]
                px-3
                text-3xl
                font-black
                shadow-sm
                ${
                  isYellow
                    ? "bg-[#fff0bd] text-[#c98213]"
                    : "bg-[#dff4ff] text-[#54829a]"
                }
              `}
            >
              {pitchScore}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}