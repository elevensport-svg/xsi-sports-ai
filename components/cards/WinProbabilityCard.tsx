type Props = {
  awayTeamName: string;
  homeTeamName: string;
  awayProbability: number;
  homeProbability: number;
  isVip: boolean;
};

function clampProbability(
  value: number,
): number {
  return Math.min(
    100,
    Math.max(
      0,
      value,
    ),
  );
}

function getConfidenceLabel(
  awayProbability: number,
  homeProbability: number,
): string {
  const difference =
    Math.abs(
      awayProbability -
        homeProbability,
    );

  if (
    difference >=
    35
  ) {
    return "明顯優勢";
  }

  if (
    difference >=
    22
  ) {
    return "優勢明確";
  }

  if (
    difference >=
    12
  ) {
    return "略有優勢";
  }

  if (
    difference >=
    5
  ) {
    return "接近五五波";
  }

  return "勢均力敵";
}

function ProbabilityRow({
  teamName,
  probability,
  isLeading,
  side,
}: {
  teamName: string;
  probability: number;
  isLeading: boolean;
  side:
    | "away"
    | "home";
}) {
  const safeProbability =
    clampProbability(
      probability,
    );

  const isAway =
    side ===
    "away";

  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-[26px]
        border
        p-5
        shadow-[0_8px_24px_rgba(95,75,55,0.06)]
        ${
          isLeading
            ? "border-[#efd47f] bg-[#fff8df]"
            : isAway
              ? "border-[#eee0cd] bg-[#fffaf0]"
              : "border-[#dcecf4] bg-[#f1faff]"
        }
      `}
    >
      {/* 裝飾泡泡 */}
      <div
        className={`
          pointer-events-none
          absolute
          -right-8
          -top-8
          h-24
          w-24
          rounded-full
          opacity-30
          ${
            isLeading
              ? "bg-[#ffd96a]"
              : isAway
                ? "bg-[#ffe99a]"
                : "bg-[#cfeeff]"
          }
        `}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9e9288]">
              {isAway
                ? "AWAY・客隊"
                : "HOME・主隊"}
            </p>

            <p className="mt-2 break-words text-base font-black text-[#4a4038] sm:text-lg">
              {teamName}
            </p>

            <p
              className={`
                mt-3
                text-4xl
                font-black
                tracking-tight
                sm:text-5xl
                ${
                  isLeading
                    ? "text-[#c98213]"
                    : isAway
                      ? "text-[#7c6a5b]"
                      : "text-[#5f879b]"
                }
              `}
            >
              {safeProbability.toFixed(
                1,
              )}
              %
            </p>
          </div>

          <div
            className={`
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-[18px]
              text-2xl
              shadow-sm
              ${
                isLeading
                  ? "bg-[#ffe694]"
                  : isAway
                    ? "bg-[#fff0bd]"
                    : "bg-[#dff4ff]"
              }
            `}
          >
            {isLeading
              ? "🏆"
              : isAway
                ? "⚾"
                : "🧢"}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span
              className={`
                rounded-full
                px-3
                py-1
                text-[10px]
                font-black
                ${
                  isLeading
                    ? "bg-[#ffe694] text-[#9b6812]"
                    : "bg-white text-[#9b9086]"
                }
              `}
            >
              {isLeading
                ? "✨ 模型領先"
                : "持續追趕"}
            </span>

            <span className="text-[10px] font-bold text-[#aaa096]">
              XSI Probability
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white shadow-inner">
            <div
              className={`
                h-full
                rounded-full
                transition-all
                duration-500
                ${
                  isLeading
                    ? "bg-gradient-to-r from-[#ffd65f] via-[#ffc247] to-[#ff9f43]"
                    : isAway
                      ? "bg-gradient-to-r from-[#f5d889] to-[#d9b768]"
                      : "bg-gradient-to-r from-[#bde8fb] to-[#7fc8ea]"
                }
              `}
              style={{
                width: `${safeProbability}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WinProbabilityCard({
  awayTeamName,
  homeTeamName,
  awayProbability,
  homeProbability,
}: Props) {
  const awayIsLeading =
    awayProbability >
    homeProbability;

  const homeIsLeading =
    homeProbability >
    awayProbability;

  const leadingTeam =
    awayProbability ===
    homeProbability
      ? "雙方相同"
      : awayIsLeading
        ? awayTeamName
        : homeTeamName;

  const confidenceLabel =
    getConfidenceLabel(
      awayProbability,
      homeProbability,
    );

  const totalProbability =
    (
      clampProbability(
        awayProbability,
      ) +
      clampProbability(
        homeProbability,
      )
    ).toFixed(
      1,
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

      <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-[#fff0a8]/30 blur-2xl" />

      <div className="pointer-events-none absolute -right-12 top-16 h-44 w-44 rounded-full bg-[#dff5ff]/45 blur-2xl" />

      <div className="relative p-6 md:p-8">
        {/* ======================================
            Header
        ====================================== */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
              📊
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
                XSI WIN PROBABILITY
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
                🤖 AI 勝率預測
              </h2>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-sm
                  leading-6
                  text-[#978a7f]
                "
              >
                綜合先發投手、打線、牛棚、近期狀態、
                市場盤口及歷史交手計算。
              </p>
            </div>
          </div>

          {/* 模型方向 */}

          <div
            className="
              rounded-[24px]
              border
              border-[#efdca8]
              bg-gradient-to-br
              from-[#fff9e4]
              to-[#fffdf8]
              px-5
              py-4
              shadow-sm
              md:min-w-[220px]
              md:text-right
            "
          >
            <div className="flex items-center gap-2 md:justify-end">
              <span className="text-lg">
                🧭
              </span>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a89680]">
                模型方向
              </p>
            </div>

            <p className="mt-2 text-xl font-black text-[#c98213]">
              {leadingTeam}
            </p>

            <div className="mt-2 flex md:justify-end">
              <span
                className="
                  rounded-full
                  bg-[#fff0bd]
                  px-3
                  py-1
                  text-[10px]
                  font-black
                  text-[#a16f17]
                "
              >
                {confidenceLabel}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================
            Probability Cards
        ====================================== */}

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          <ProbabilityRow
            teamName={
              awayTeamName
            }
            probability={
              awayProbability
            }
            isLeading={
              awayIsLeading
            }
            side="away"
          />

          <ProbabilityRow
            teamName={
              homeTeamName
            }
            probability={
              homeProbability
            }
            isLeading={
              homeIsLeading
            }
            side="home"
          />
        </div>

        {/* ======================================
            Footer
        ====================================== */}

        <div
          className="
            mt-6
            flex
            flex-col
            gap-4
            rounded-[24px]
            border
            border-[#eee3d6]
            bg-[#fffdf9]
            p-5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-3">
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
              ✅
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b9086]">
                勝率總和
              </p>

              <p className="mt-1 text-lg font-black text-[#4a4038]">
                {totalProbability}%
              </p>
            </div>
          </div>

          <p
            className="
              max-w-xl
              text-xs
              leading-5
              text-[#a0958b]
              sm:text-right
            "
          >
            💡 勝率為模型估算值，
            不代表實際比賽結果。
          </p>
        </div>
      </div>
    </section>
  );
}