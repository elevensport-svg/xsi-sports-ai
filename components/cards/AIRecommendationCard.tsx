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

  selectedTeamName: string;

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
    awayScore >
    homeScore
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

  selectedTeamName,

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
          JSON.parse(
            stored,
          );

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

    setSettingsLoaded(
      true,
    );
  }, []);

  /*
   * ==========================================
   * 模型方向統一
   * ==========================================
   */

  const selectedTeam =
    selectedTeamName;

  const selectedXsi =
    selectedTeamName ===
    awayTeamName
      ? awayXsi
      : selectedTeamName ===
          homeTeamName
        ? homeXsi
        : awayXsi.total >=
            homeXsi.total
          ? awayXsi
          : homeXsi;

  const isTie =
    false;

  const scoreDifference =
    Math.abs(
      awayXsi.total -
        homeXsi.total,
    );

  const confidence =
    selectedXsi.confidence;

  const stars =
    getStars(
      confidence,
    );

  const betLevel =
    getBetLevel(
      confidence,
    );

  const belowUserThreshold =
    settingsLoaded &&
    confidence <
      minConfidence;

  function formatRecommendation(
    teamName: string,
    recommendation: string,
  ): string {
    if (
      recommendation ===
      "獨贏"
    ) {
      return `${teamName} 獨贏`;
    }

    if (
      recommendation ===
      "受讓 +1.5"
    ) {
      return `${teamName} 受讓 +1.5`;
    }

    if (
      recommendation ===
      "讓分"
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

  const safeConfidence =
    Math.max(
      0,
      Math.min(
        confidence,
        100,
      ),
    );

  const safeThreshold =
    Math.max(
      0,
      Math.min(
        minConfidence,
        100,
      ),
    );

  /*
   * ==========================================
   * FREE USER
   * ==========================================
   */

  if (!isVip) {
    return (
      <section
        className="
          relative
          overflow-hidden
          rounded-[32px]
          border
          border-[#eee0cd]
          bg-white
          shadow-[0_14px_38px_rgba(95,75,55,0.08)]
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -left-16
            -top-16
            h-48
            w-48
            rounded-full
            bg-[#fff0a8]/35
            blur-2xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -right-16
            top-10
            h-48
            w-48
            rounded-full
            bg-[#dff5ff]/45
            blur-2xl
          "
        />

        <div className="relative p-6 md:p-8">
          {/* HEADER */}

          <div className="flex items-start gap-4">
            <div
              className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-[20px]
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
                XSI AI FINAL ANALYSIS
              </p>

              <h2
                className="
                  mt-2
                  text-2xl
                  font-black
                  text-[#4a4038]
                  md:text-3xl
                "
              >
                AI 最終分析
              </h2>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-[#978a7f]
                "
              >
                XSI 綜合投手、打線、牛棚、近況與市場資料進行最終推演。
              </p>
            </div>
          </div>

          {/* LOCK */}

          <div
            className="
              mt-7
              overflow-hidden
              rounded-[28px]
              border
              border-[#eadfce]
              bg-gradient-to-br
              from-[#fffaf0]
              via-[#fffdf9]
              to-[#f2fbff]
              p-6
              md:p-8
            "
          >
            <div className="text-center">
              <div
                className="
                  mx-auto
                  flex
                  h-20
                  w-20
                  items-center
                  justify-center
                  rounded-[26px]
                  bg-[#fff0bd]
                  text-4xl
                  shadow-sm
                "
              >
                🔒
              </div>

              <h3
                className="
                  mt-5
                  text-2xl
                  font-black
                  text-[#4a4038]
                  md:text-3xl
                "
              >
                XSI VIP AI 分析
              </h3>

              <p
                className="
                  mx-auto
                  mt-3
                  max-w-xl
                  text-sm
                  leading-6
                  text-[#978a7f]
                "
              >
                解鎖完整 AI 推演、球隊優勢、
                XSI 差距與市場分析
              </p>
            </div>

            <div
              className="
                mt-8
                grid
                gap-3
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >
              {[
                {
                  icon: "🎯",
                  label:
                    "AI 最終推薦",
                },
                {
                  icon: "⚾",
                  label:
                    "投手分析",
                },
                {
                  icon: "🔥",
                  label:
                    "打線分析",
                },
                {
                  icon: "🛡️",
                  label:
                    "牛棚分析",
                },
                {
                  icon: "📈",
                  label:
                    "市場盤口",
                },
                {
                  icon: "⭐",
                  label:
                    "AI 風險評估",
                },
              ].map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.label
                    }
                    className="
                      rounded-[20px]
                      border
                      border-[#eee3d6]
                      bg-white
                      p-4
                      shadow-sm
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <div
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-[14px]
                          bg-[#fff8df]
                          text-lg
                        "
                      >
                        {
                          item.icon
                        }
                      </div>

                      <p
                        className="
                          text-sm
                          font-black
                          text-[#70655c]
                        "
                      >
                        {
                          item.label
                        }
                      </p>
                    </div>

                    <p
                      className="
                        mt-3
                        text-[10px]
                        font-bold
                        text-[#b0a59b]
                      "
                    >
                      🔒 VIP ONLY
                    </p>
                  </div>
                ),
              )}
            </div>

            <a
              href={
                LINE_URL
              }
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-8
                flex
                w-full
                items-center
                justify-center
                rounded-full
                bg-[#ffd35a]
                px-6
                py-4
                text-center
                text-base
                font-black
                text-[#5b4315]
                shadow-sm
                transition
                hover:-translate-y-0.5
                hover:bg-[#ffc83d]
                hover:shadow-md
              "
            >
              ✨ 升級 VIP 查看完整 AI 分析
            </a>
          </div>
        </div>
      </section>
    );
  }

  /*
   * ==========================================
   * VIP USER
   * ==========================================
   */

  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[32px]
        border
        border-[#eee0cd]
        bg-white
        shadow-[0_14px_38px_rgba(95,75,55,0.08)]
      "
    >
      {/* Decorations */}

      <div
        className="
          pointer-events-none
          absolute
          -left-16
          -top-16
          h-48
          w-48
          rounded-full
          bg-[#fff0a8]/35
          blur-2xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-16
          top-12
          h-48
          w-48
          rounded-full
          bg-[#dff5ff]/45
          blur-2xl
        "
      />

      <div className="relative p-6 md:p-8">
        {/* ======================================
            HEADER
        ====================================== */}

        <div
          className="
            flex
            flex-col
            gap-4
            md:flex-row
            md:items-center
            md:justify-between
          "
        >
          <div className="flex items-start gap-4">
            <div
              className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-[20px]
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
                XSI AI FINAL ANALYSIS
              </p>

              <h2
                className="
                  mt-2
                  text-2xl
                  font-black
                  text-[#4a4038]
                  md:text-3xl
                "
              >
                AI 最終分析
              </h2>

              <p
                className="
                  mt-2
                  text-sm
                  text-[#978a7f]
                "
              >
                模型最終整合結果 ✨
              </p>
            </div>
          </div>

          <span
            className="
              self-start
              rounded-full
              border
              border-[#efdca8]
              bg-[#fff8df]
              px-4
              py-2
              text-xs
              font-black
              text-[#b77b18]
              md:self-auto
            "
          >
            ⭐ VIP ANALYSIS
          </span>
        </div>

        {/* ======================================
            MAIN RESULT
        ====================================== */}

        <div
          className="
            mt-7
            grid
            gap-5
            lg:grid-cols-[1.3fr_0.7fr]
          "
        >
          {/* Recommendation */}

          <div
            className={`
              relative
              overflow-hidden
              rounded-[28px]
              border
              p-6
              shadow-sm
              ${
                belowUserThreshold
                  ? "border-[#e5dfd7] bg-[#faf8f5]"
                  : "border-[#efdca8] bg-gradient-to-br from-[#fff8df] via-[#fffaf0] to-white"
              }
            `}
          >
            <div
              className="
                pointer-events-none
                absolute
                -right-12
                -top-12
                h-40
                w-40
                rounded-full
                bg-[#ffe694]/30
              "
            />

            <div className="relative">
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.18em]
                      text-[#a89580]
                    "
                  >
                    FINAL DIRECTION
                  </p>

                  <p
                    className="
                      mt-2
                      text-sm
                      font-bold
                      text-[#978a7f]
                    "
                  >
                    AI 最終方向
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-[18px]
                    bg-white
                    text-2xl
                    shadow-sm
                  "
                >
                  🎯
                </div>
              </div>

              <h3
                className={`
                  mt-6
                  break-words
                  text-3xl
                  font-black
                  leading-tight
                  md:text-4xl
                  ${
                    belowUserThreshold
                      ? "text-[#9e958d]"
                      : "text-[#c98213]"
                  }
                `}
              >
                {
                  finalRecommendation
                }
              </h3>

              <p
                className={`
                  mt-5
                  text-3xl
                  tracking-[0.12em]
                  ${
                    belowUserThreshold
                      ? "text-[#d2cbc4]"
                      : "text-[#f2b632]"
                  }
                `}
              >
                {stars}
              </p>

              <div
                className="
                  mt-6
                  flex
                  flex-wrap
                  gap-3
                "
              >
                <span
                  className={`
                    rounded-full
                    px-4
                    py-2
                    text-sm
                    font-black
                    ${
                      belowUserThreshold
                        ? "bg-[#eeeae5] text-[#978f88]"
                        : "bg-[#ffe694] text-[#9f6910]"
                    }
                  `}
                >
                  ⭐ 信心 {confidence}%
                </span>

                <span
                  className="
                    rounded-full
                    border
                    border-[#e8ded1]
                    bg-white
                    px-4
                    py-2
                    text-sm
                    font-black
                    text-[#766b62]
                  "
                >
                  {belowUserThreshold
                    ? "⚠️ 未達設定門檻"
                    : `✨ ${betLevel}`}
                </span>

                <span
                  className="
                    rounded-full
                    border
                    border-[#dcecf4]
                    bg-[#f1faff]
                    px-4
                    py-2
                    text-sm
                    font-black
                    text-[#668595]
                  "
                >
                  🛡️ 風險：
                  {
                    selectedXsi.risk
                  }
                </span>
              </div>

              {/* User Threshold */}

              <div
                className="
                  mt-6
                  rounded-[20px]
                  border
                  border-[#eee3d6]
                  bg-white/80
                  p-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >
                  <span
                    className="
                      text-xs
                      font-bold
                      text-[#978a7f]
                    "
                  >
                    🎚️ 你的最低推薦門檻
                  </span>

                  <span
                    className="
                      text-sm
                      font-black
                      text-[#c98213]
                    "
                  >
                    {minConfidence}%
                  </span>
                </div>

                <div
                  className="
                    mt-3
                    h-2
                    overflow-hidden
                    rounded-full
                    bg-[#f1ece5]
                  "
                >
                  <div
                    className="
                      h-full
                      rounded-full
                      bg-gradient-to-r
                      from-[#ffd65f]
                      to-[#ffad42]
                    "
                    style={{
                      width: `${safeThreshold}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================
              RIGHT INFO
          ====================================== */}

          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-1
            "
          >
            {/* Leading Team */}

            <div
              className="
                relative
                overflow-hidden
                rounded-[26px]
                border
                border-[#dcecf4]
                bg-[#f1faff]
                p-5
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.16em]
                      text-[#7c96a3]
                    "
                  >
                    LEADING TEAM
                  </p>

                  <p
                    className="
                      mt-2
                      text-xs
                      font-bold
                      text-[#8c999f]
                    "
                  >
                    模型領先球隊
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-[16px]
                    bg-white
                    text-xl
                    shadow-sm
                  "
                >
                  🏆
                </div>
              </div>

              <p
                className="
                  mt-5
                  break-words
                  text-2xl
                  font-black
                  text-[#54829a]
                "
              >
                {isTie
                  ? "雙方相同"
                  : selectedTeam}
              </p>
            </div>

            {/* XSI Difference */}

            <div
              className="
                relative
                overflow-hidden
                rounded-[26px]
                border
                border-[#e2eee6]
                bg-[#f3fff8]
                p-5
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.16em]
                      text-[#789486]
                    "
                  >
                    XSI DIFFERENCE
                  </p>

                  <p
                    className="
                      mt-2
                      text-xs
                      font-bold
                      text-[#8c9b93]
                    "
                  >
                    XSI 綜合差距
                  </p>
                </div>

                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-[16px]
                    bg-white
                    text-xl
                    shadow-sm
                  "
                >
                  📊
                </div>
              </div>

              <p
                className="
                  mt-5
                  text-4xl
                  font-black
                  text-[#628a75]
                "
              >
                {scoreDifference.toFixed(
                  1,
                )}
              </p>

              <p
                className="
                  mt-2
                  text-[10px]
                  font-bold
                  text-[#98a79f]
                "
              >
                XSI POINTS
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            CONFIDENCE BAR
        ====================================== */}

        <div
          className="
            mt-5
            rounded-[24px]
            border
            border-[#eee3d6]
            bg-[#fffdf9]
            p-5
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div>
              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-[#a0958b]
                "
              >
                MODEL CONFIDENCE
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-black
                  text-[#655b53]
                "
              >
                🤖 AI 模型信心度
              </p>
            </div>

            <p
              className="
                text-2xl
                font-black
                text-[#c98213]
              "
            >
              {safeConfidence}%
            </p>
          </div>

          <div
            className="
              mt-4
              h-3
              overflow-hidden
              rounded-full
              bg-[#f2ede6]
            "
          >
            <div
              className="
                h-full
                rounded-full
                bg-gradient-to-r
                from-[#ffd65f]
                via-[#ffc247]
                to-[#ff9f43]
              "
              style={{
                width: `${safeConfidence}%`,
              }}
            />
          </div>
        </div>

        {/* ======================================
            REASONS
        ====================================== */}

        <div
          className="
            mt-6
            rounded-[28px]
            border
            border-[#eee3d6]
            bg-[#fffdf9]
            p-6
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
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
                bg-[#e9fff5]
                text-xl
              "
            >
              💡
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-[#8c9d92]
                "
              >
                AI REASONS
              </p>

              <p
                className="
                  mt-1
                  text-lg
                  font-black
                  text-[#4a4038]
                "
              >
                AI 判斷依據
              </p>
            </div>
          </div>

          <div
            className="
              mt-5
              grid
              gap-3
              md:grid-cols-2
            "
          >
            {reasons.map(
              (
                reason,
                index,
              ) => (
                <div
                  key={`${reason}-${index}`}
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-[20px]
                    border
                    border-[#e5eee8]
                    bg-white
                    p-4
                    shadow-sm
                  "
                >
                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-[12px]
                      bg-[#e9fff5]
                      text-sm
                      font-black
                      text-[#5c8c73]
                    "
                  >
                    ✓
                  </div>

                  <p
                    className="
                      pt-1
                      text-sm
                      font-bold
                      leading-6
                      text-[#746960]
                    "
                  >
                    {reason}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>

        {/* ======================================
            DISCLAIMER
        ====================================== */}

        <div
          className="
            mt-5
            rounded-[20px]
            border
            border-[#eee3d6]
            bg-[#faf8f5]
            px-5
            py-4
          "
        >
          <p
            className="
              text-xs
              leading-6
              text-[#9e958d]
            "
          >
            💡 此結果依先發投手、打線、牛棚、近期狀態及市場盤口模型計算，僅供賽事研究參考。
          </p>
        </div>
      </div>
    </section>
  );
}