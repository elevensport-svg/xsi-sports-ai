type Props = {
  score: number;
  grade: string;
  isVip: boolean;

  details?: {
    label: string;
    value: number;
  }[];
};

function getLevel(
  score: number,
) {
  if (score >= 90) {
    return "A+";
  }

  if (score >= 80) {
    return "A";
  }

  if (score >= 70) {
    return "B";
  }

  if (score >= 60) {
    return "C";
  }

  return "D";
}

function getStars(
  score: number,
) {
  if (score >= 90) {
    return "★★★★★";
  }

  if (score >= 80) {
    return "★★★★☆";
  }

  if (score >= 70) {
    return "★★★☆☆";
  }

  return "★★☆☆☆";
}

function getValueLabel(
  score: number,
) {
  if (score >= 90) {
    return "超高價值";
  }

  if (score >= 80) {
    return "高價值";
  }

  if (score >= 70) {
    return "值得關注";
  }

  if (score >= 60) {
    return "一般觀察";
  }

  return "保守觀察";
}

export default function ValueScoreCard({
  score,
  grade,
  isVip,
  details = [],
}: Props) {
  const displayGrade =
    grade ||
    getLevel(
      score,
    );

  const valueLabel =
    getValueLabel(
      score,
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
          top-16
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
            gap-5
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
              ⭐
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
                XSI VALUE SCORE
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
                XSI 價值評分
              </h2>

              <p
                className="
                  mt-2
                  text-sm
                  text-[#978a7f]
                "
              >
                🤖 AI 模型綜合評估
              </p>
            </div>
          </div>

          {/* 評價標籤 */}

          <div
            className="
              rounded-full
              border
              border-[#efdca8]
              bg-[#fff8df]
              px-5
              py-2.5
              text-sm
              font-black
              text-[#b77b18]
              shadow-sm
            "
          >
            ✨ {valueLabel}
          </div>
        </div>

        {/* ======================================
            SCORE AREA
        ====================================== */}

        <div
          className="
            mt-7
            grid
            gap-5
            lg:grid-cols-[1.2fr_1fr]
          "
        >
          {/* 左側分數 */}

          <div
            className="
              relative
              overflow-hidden
              rounded-[28px]
              border
              border-[#f0dfb5]
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
                bg-[#ffe998]/35
              "
            />

            <div className="relative">
              <p
                className="
                  text-xs
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-[#a89580]
                "
              >
                AI VALUE SCORE
              </p>

              <div
                className="
                  mt-4
                  flex
                  flex-wrap
                  items-end
                  gap-5
                "
              >
                <p
                  className="
                    text-7xl
                    font-black
                    leading-none
                    tracking-tight
                    text-[#c98213]
                    sm:text-8xl
                  "
                >
                  {score}
                </p>

                <div className="pb-2">
                  <p
                    className="
                      text-xs
                      font-bold
                      text-[#a0958b]
                    "
                  >
                    綜合評級
                  </p>

                  <div
                    className="
                      mt-2
                      inline-flex
                      items-center
                      rounded-[16px]
                      bg-[#ffe694]
                      px-4
                      py-2
                      text-xl
                      font-black
                      text-[#9f6910]
                    "
                  >
                    {displayGrade}
                  </div>
                </div>
              </div>

              {/* 分數條 */}

              <div className="mt-6">
                <div
                  className="
                    mb-2
                    flex
                    items-center
                    justify-between
                    text-[10px]
                    font-bold
                    text-[#a0958b]
                  "
                >
                  <span>
                    XSI 評分
                  </span>

                  <span>
                    {score}/100
                  </span>
                </div>

                <div
                  className="
                    h-3
                    overflow-hidden
                    rounded-full
                    bg-white
                    shadow-inner
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
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          score,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 右側星級 */}

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
                -right-10
                -top-10
                h-32
                w-32
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
                  gap-3
                "
              >
                <div>
                  <p
                    className="
                      text-xs
                      font-black
                      uppercase
                      tracking-[0.16em]
                      text-[#7892a0]
                    "
                  >
                    VALUE RATING
                  </p>

                  <p
                    className="
                      mt-2
                      text-lg
                      font-black
                      text-[#4a4038]
                    "
                  >
                    價值星級
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
                  🌟
                </div>
              </div>

              <p
                className="
                  mt-7
                  break-all
                  text-3xl
                  tracking-[0.12em]
                  text-[#f2b632]
                  sm:text-4xl
                "
              >
                {getStars(
                  score,
                )}
              </p>

              <p
                className="
                  mt-5
                  text-sm
                  leading-6
                  text-[#8b969c]
                "
              >
                星級依照 XSI
                綜合價值分數自動產生。
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            非 VIP
        ====================================== */}

        {!isVip ? (
          <div
            className="
              mt-7
              overflow-hidden
              rounded-[28px]
              border
              border-[#eadfce]
              bg-[#fffdf9]
              p-6
            "
          >
            <div
              className="
                flex
                flex-col
                gap-5
                lg:flex-row
                lg:items-center
                lg:justify-between
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
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-[18px]
                    bg-[#fff0bd]
                    text-xl
                  "
                >
                  🔒
                </div>

                <div>
                  <p
                    className="
                      text-lg
                      font-black
                      text-[#4a4038]
                    "
                  >
                    XSI VIP 進階分析
                  </p>

                  <p
                    className="
                      mt-2
                      text-sm
                      text-[#978a7f]
                    "
                  >
                    解鎖完整 AI 模型拆解
                  </p>
                </div>
              </div>

              <a
                href="https://lin.ee/r8t6pBB4"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-full
                  bg-[#ffd35a]
                  px-6
                  py-3
                  text-sm
                  font-black
                  text-[#5b4315]
                  shadow-sm
                  transition
                  hover:-translate-y-0.5
                  hover:bg-[#ffc83d]
                  hover:shadow-md
                "
              >
                ✨ 升級 VIP 查看完整分析
              </a>
            </div>

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
                  icon: "⚾",
                  label:
                    "投手優勢",
                },
                {
                  icon: "🛡️",
                  label:
                    "牛棚深度",
                },
                {
                  icon: "📈",
                  label:
                    "市場價值",
                },
                {
                  icon: "🤖",
                  label:
                    "AI 分析建議",
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
                      <span
                        className="
                          flex
                          h-9
                          w-9
                          items-center
                          justify-center
                          rounded-[13px]
                          bg-[#fff8df]
                        "
                      >
                        {
                          item.icon
                        }
                      </span>

                      <span
                        className="
                          text-sm
                          font-black
                          text-[#766a60]
                        "
                      >
                        {
                          item.label
                        }
                      </span>
                    </div>

                    <p
                      className="
                        mt-3
                        text-[10px]
                        font-bold
                        text-[#b1a69d]
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
          /* ======================================
              VIP 詳細資料
          ====================================== */

          <div className="mt-7">
            <div
              className="
                mb-4
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
                  rounded-[15px]
                  bg-[#e9fff5]
                  text-lg
                "
              >
                🔍
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
                  VALUE BREAKDOWN
                </p>

                <p
                  className="
                    mt-1
                    text-lg
                    font-black
                    text-[#4a4038]
                  "
                >
                  XSI 優勢分析
                </p>
              </div>
            </div>

            {details.length >
            0 ? (
              <div
                className="
                  grid
                  gap-3
                  md:grid-cols-2
                "
              >
                {details.map(
                  (
                    item,
                  ) => (
                    <div
                      key={
                        item.label
                      }
                      className="
                        rounded-[22px]
                        border
                        border-[#eee3d6]
                        bg-[#fffdf9]
                        p-5
                        shadow-sm
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
                            font-bold
                            text-[#776b61]
                          "
                        >
                          {
                            item.label
                          }
                        </span>

                        <span
                          className="
                            rounded-[14px]
                            bg-[#fff0bd]
                            px-3
                            py-2
                            text-lg
                            font-black
                            text-[#c98213]
                          "
                        >
                          +
                          {
                            item.value
                          }
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div
                className="
                  rounded-[22px]
                  border
                  border-dashed
                  border-[#e7dac8]
                  bg-[#fffdf9]
                  p-5
                  text-sm
                  font-bold
                  text-[#a0958b]
                "
              >
                🤖 詳細模型拆解資料準備中
              </div>
            )}

            {/* AI Summary */}

            <div
              className="
                mt-6
                flex
                flex-col
                gap-4
                rounded-[24px]
                border
                border-[#dcefe4]
                bg-[#f3fff8]
                p-5
                sm:flex-row
                sm:items-center
                sm:justify-between
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
                    bg-white
                    text-xl
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
                      tracking-[0.14em]
                      text-[#8c9d92]
                    "
                  >
                    AI MODEL SUMMARY
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-bold
                      text-[#7b8b81]
                    "
                  >
                    AI 模型總結
                  </p>
                </div>
              </div>

              <p
                className="
                  text-lg
                  font-black
                  text-[#4a4038]
                "
              >
                模型評價：
                <span
                  className="
                    ml-2
                    text-[#c98213]
                  "
                >
                  {score >=
                  85
                    ? "高價值方向 ✨"
                    : "觀察方向 👀"}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}