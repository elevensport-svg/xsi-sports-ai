type Props = {
  isVip: boolean;

  recommendation: string;
  confidence: number;
  score: number;

  reasons: string[];
  risk: string;

  awayTeamName: string;
  homeTeamName: string;

  /*
   * XSI 最終模型方向
   */
  selectedTeamName: string;
};

function getStars(
  confidence: number,
) {
  if (confidence >= 80) {
    return "★★★★★";
  }

  if (confidence >= 70) {
    return "★★★★☆";
  }

  if (confidence >= 60) {
    return "★★★☆☆";
  }

  return "★★☆☆☆";
}

function getConfidenceLabel(
  confidence: number,
) {
  if (confidence >= 85) {
    return "高信心";
  }

  if (confidence >= 75) {
    return "信心不錯";
  }

  if (confidence >= 65) {
    return "中等信心";
  }

  return "保守觀察";
}

/*
 * ==========================================
 * 推薦文字
 *
 * 球隊方向完全跟 selectedTeamName
 *
 * 不再：
 * 獨贏 = 主隊
 * 受讓 = 客隊
 * 讓分 = 主隊
 *
 * 避免跟 Win Probability / XSI 方向衝突
 * ==========================================
 */
function formatRecommendation(
  recommendation: string,
  selectedTeamName: string,
) {
  const text =
    recommendation.trim();

  /*
   * recommendation 已包含球隊名稱
   */
  if (
    text.includes(
      selectedTeamName,
    )
  ) {
    return text.replace(
      "讓分 +1.5",
      "受讓 +1.5",
    );
  }

  /*
   * 受讓
   */
  if (
    text ===
      "受讓 +1.5" ||
    text ===
      "Run Line +1.5"
  ) {
    return `${selectedTeamName} 受讓 +1.5`;
  }

  /*
   * 讓分
   */
  if (
    text === "讓分" ||
    text ===
      "讓分 -1.5" ||
    text ===
      "Run Line -1.5"
  ) {
    return `${selectedTeamName} 讓分 -1.5`;
  }

  /*
   * 獨贏
   */
  if (
    text === "獨贏" ||
    text === "Moneyline"
  ) {
    return `${selectedTeamName} 獨贏`;
  }

  /*
   * 其他格式
   */
  return `${selectedTeamName} ${text}`;
}

export default function BetAdvisorCard({
  isVip,

  recommendation,
  confidence,
  score,

  reasons,
  risk,

  awayTeamName,
  homeTeamName,

  selectedTeamName,
}: Props) {
  void awayTeamName;
  void homeTeamName;

  const displayRecommendation =
    formatRecommendation(
      recommendation,
      selectedTeamName,
    );

  const confidenceLabel =
    getConfidenceLabel(
      confidence,
    );

  const safeConfidence =
    Math.min(
      100,
      Math.max(
        0,
        confidence,
      ),
    );

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
      {/* 背景裝飾 */}

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
          <div
            className="
              flex
              items-start
              gap-4
            "
          >
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
              🎯
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
                XSI BET ADVISOR
              </p>

              <h2
                className="
                  mt-2
                  text-2xl
                  font-black
                  text-[#4a4038]
                  sm:text-3xl
                "
              >
                AI 策略分析
              </h2>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-[#978a7f]
                "
              >
                綜合 XSI 模型方向、信心度與市場價值進行分析。
              </p>
            </div>
          </div>

          {isVip && (
            <div
              className="
                inline-flex
                items-center
                gap-2
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
              ✨ VIP ANALYSIS
            </div>
          )}
        </div>

        {/* ======================================
            NON VIP
        ====================================== */}

        {!isVip ? (
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
              to-[#f4fbff]
              p-6
            "
          >
            <div
              className="
                flex
                flex-col
                items-center
                text-center
              "
            >
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-[22px]
                  bg-[#fff0bd]
                  text-3xl
                  shadow-sm
                "
              >
                🔒
              </div>

              <p
                className="
                  mt-4
                  text-xl
                  font-black
                  text-[#4a4038]
                "
              >
                VIP 策略分析
              </p>

              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-[#978a7f]
                "
              >
                解鎖 Moneyline、讓分、受讓價值比較
              </p>
            </div>

            {/* 鎖定項目 */}

            <div
              className="
                mt-6
                grid
                gap-3
                sm:grid-cols-2
                lg:grid-cols-4
              "
            >
              {[
                {
                  icon: "🏆",
                  title:
                    "最佳玩法",
                },
                {
                  icon: "📊",
                  title:
                    "盤口價值",
                },
                {
                  icon: "⭐",
                  title:
                    "AI 信心",
                },
                {
                  icon: "🛡️",
                  title:
                    "風險評估",
                },
              ].map(
                (
                  item,
                ) => (
                  <div
                    key={
                      item.title
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
                          text-[#6f645b]
                        "
                      >
                        {
                          item.title
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
          </div>
        ) : (
          <>
            {/* ======================================
                BEST PLAY + SCORE
            ====================================== */}

            <div
              className="
                mt-7
                grid
                gap-5
                lg:grid-cols-[1.3fr_0.7fr]
              "
            >
              {/* 最佳方向 */}

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-[28px]
                  border
                  border-[#efdca8]
                  bg-gradient-to-br
                  from-[#fff8df]
                  via-[#fffaf0]
                  to-white
                  p-6
                  shadow-sm
                "
              >
                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-10
                    -top-10
                    h-36
                    w-36
                    rounded-full
                    bg-[#ffe694]/40
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
                        AI BEST DIRECTION
                      </p>

                      <p
                        className="
                          mt-2
                          text-sm
                          font-bold
                          text-[#978a7f]
                        "
                      >
                        AI 最佳方向
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
                      🏆
                    </div>
                  </div>

                  <p
                    className="
                      mt-6
                      break-words
                      text-3xl
                      font-black
                      leading-tight
                      text-[#c98213]
                      sm:text-4xl
                    "
                  >
                    {
                      displayRecommendation
                    }
                  </p>

                  <div
                    className="
                      mt-5
                      flex
                      flex-wrap
                      items-center
                      gap-4
                    "
                  >
                    <p
                      className="
                        text-2xl
                        tracking-[0.12em]
                        text-[#f2b632]
                        sm:text-3xl
                      "
                    >
                      {
                        getStars(
                          confidence,
                        )
                      }
                    </p>

                    <span
                      className="
                        rounded-full
                        bg-white
                        px-3
                        py-1.5
                        text-[10px]
                        font-black
                        text-[#a6781f]
                        shadow-sm
                      "
                    >
                      ✨ {
                        confidenceLabel
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Score */}

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-[28px]
                  border
                  border-[#dcecf4]
                  bg-gradient-to-br
                  from-[#f1faff]
                  to-white
                  p-6
                  shadow-sm
                "
              >
                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-8
                    -top-8
                    h-28
                    w-28
                    rounded-full
                    bg-[#cfeeff]/45
                  "
                />

                <div className="relative">
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[10px]
                          font-black
                          uppercase
                          tracking-[0.16em]
                          text-[#7892a0]
                        "
                      >
                        AI SCORE
                      </p>

                      <p
                        className="
                          mt-2
                          text-sm
                          font-bold
                          text-[#8d9aa0]
                        "
                      >
                        信心評分
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
                      🤖
                    </div>
                  </div>

                  <p
                    className="
                      mt-5
                      text-6xl
                      font-black
                      leading-none
                      text-[#54829a]
                    "
                  >
                    {score}
                  </p>

                  <div
                    className="
                      mt-5
                      inline-flex
                      items-center
                      rounded-full
                      bg-white
                      px-3
                      py-1.5
                      text-xs
                      font-black
                      text-[#6f7f87]
                      shadow-sm
                    "
                  >
                    🛡️ 風險：
                    {risk}
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================
                CONFIDENCE
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
                    CONFIDENCE
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-black
                      text-[#655b53]
                    "
                  >
                    模型信心度
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
                    transition-all
                    duration-500
                  "
                  style={{
                    width: `${safeConfidence}%`,
                  }}
                />
              </div>
            </div>

            {/* ======================================
                AI REASONS
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
                    AI 判斷原因
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
                {reasons.length >
                0 ? (
                  reasons.map(
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
                  )
                ) : (
                  <div
                    className="
                      rounded-[20px]
                      border
                      border-dashed
                      border-[#e6dbcc]
                      bg-white
                      p-5
                      text-sm
                      font-bold
                      text-[#a0958b]
                      md:col-span-2
                    "
                  >
                    🤖 AI 判斷原因資料準備中
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}