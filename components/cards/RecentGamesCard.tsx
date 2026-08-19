import type {
  RecentGameResult,
  RecentGamesSummary,
} from "../../lib/api/recent-games";

import {
  getMlbTeamLogo,
} from "../../lib/teams/mlb";

type Props = {
  awayTeamName: string;
  homeTeamName: string;
  awaySummary: RecentGamesSummary;
  homeSummary: RecentGamesSummary;
};

function formatGameDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "--";
  }

  return new Intl.DateTimeFormat(
    "zh-TW",
    {
      timeZone:
        "Asia/Taipei",
      month:
        "2-digit",
      day:
        "2-digit",
    },
  ).format(date);
}

function ResultBadge({
  result,
}: {
  result:
    RecentGameResult["result"];
}) {
  const isWin =
    result === "W";

  return (
    <span
      className={`
        inline-flex
        h-8
        w-8
        items-center
        justify-center
        rounded-full
        text-xs
        font-black
        shadow-sm
        ${
          isWin
            ? "bg-[#dff8eb] text-[#478166]"
            : "bg-[#ffe6ea] text-[#a95f70]"
        }
      `}
    >
      {result}
    </span>
  );
}

function GameItem({
  game,
}: {
  game: RecentGameResult;
}) {
  const isWin =
    game.result === "W";

  return (
    <div
      className="
        min-w-[205px]
        rounded-[24px]
        border
        border-[#eee3d6]
        bg-white
        p-4
        shadow-[0_7px_20px_rgba(95,75,55,0.06)]
        transition
        duration-200
        hover:-translate-y-1
        hover:shadow-[0_12px_26px_rgba(95,75,55,0.10)]
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
        <ResultBadge
          result={
            game.result
          }
        />

        <span
          className="
            rounded-full
            bg-[#faf6f0]
            px-2.5
            py-1
            text-[10px]
            font-bold
            text-[#a0958b]
          "
        >
          📅{" "}
          {formatGameDate(
            game.date,
          )}
        </span>
      </div>

      {/* Opponent */}

      <div
        className="
          mt-4
          flex
          items-center
          gap-3
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
            rounded-[16px]
            bg-[#f6f2ed]
          "
        >
          <img
            src={
              getMlbTeamLogo(
                game.opponentId,
              )
            }
            alt={
              game.opponentName
            }
            className="
              h-10
              w-10
              object-contain
            "
          />
        </div>

        <div className="min-w-0">
          <p
            className="
              truncate
              text-sm
              font-black
              text-[#554c45]
            "
          >
            {
              game.opponentName
            }
          </p>

          <p
            className="
              mt-1
              text-[10px]
              font-bold
              text-[#a79b91]
            "
          >
            {game.isHome
              ? "🏠 主場"
              : "✈️ 客場"}
          </p>
        </div>
      </div>

      {/* Score */}

      <div
        className="
          mt-5
          rounded-[18px]
          bg-[#fffaf3]
          p-3
        "
      >
        <div
          className="
            flex
            items-end
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
                tracking-[0.14em]
                text-[#a0958b]
              "
            >
              SCORE
            </p>

            <p
              className="
                mt-1
                text-3xl
                font-black
                text-[#4a4038]
              "
            >
              {
                game.teamScore
              }

              <span
                className="
                  mx-2
                  text-[#d2c5b8]
                "
              >
                -
              </span>

              {
                game.opponentScore
              }
            </p>
          </div>

          <span
            className={`
              rounded-full
              px-3
              py-1.5
              text-xs
              font-black
              ${
                isWin
                  ? "bg-[#e7fff2] text-[#498168]"
                  : "bg-[#fff0f3] text-[#a96375]"
              }
            `}
          >
            {isWin
              ? "✨ 勝"
              : "🌧️ 敗"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value:
    | string
    | number;
  accent:
    | "yellow"
    | "green"
    | "pink"
    | "purple";
}) {
  const styles = {
    yellow: {
      bg:
        "bg-[#fff8df]",
      icon:
        "bg-[#fff0bd]",
      text:
        "text-[#c98213]",
    },

    green: {
      bg:
        "bg-[#edfff6]",
      icon:
        "bg-[#d9f8e9]",
      text:
        "text-[#4c8268]",
    },

    pink: {
      bg:
        "bg-[#fff1f5]",
      icon:
        "bg-[#ffe0e8]",
      text:
        "text-[#a96276]",
    },

    purple: {
      bg:
        "bg-[#f4f0ff]",
      icon:
        "bg-[#e7dfff]",
      text:
        "text-[#74649a]",
    },
  };

  const style =
    styles[accent];

  return (
    <div
      className={`
        rounded-[18px]
        p-4
        ${style.bg}
      `}
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <p
          className="
            text-[10px]
            font-black
            text-[#9e9288]
          "
        >
          {label}
        </p>

        <span
          className={`
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-[11px]
            text-sm
            ${style.icon}
          `}
        >
          {icon}
        </span>
      </div>

      <p
        className={`
          mt-3
          text-2xl
          font-black
          ${style.text}
        `}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryBox({
  teamName,
  summary,
  accent,
}: {
  teamName: string;
  summary: RecentGamesSummary;
  accent:
    | "yellow"
    | "blue";
}) {
  const isYellow =
    accent ===
    "yellow";

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
          h-24
          w-24
          rounded-full
          opacity-30
          ${
            isYellow
              ? "bg-[#ffe694]"
              : "bg-[#cfeeff]"
          }
        `}
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
                text-[10px]
                font-black
                uppercase
                tracking-[0.16em]
                text-[#a0958b]
              "
            >
              {isYellow
                ? "AWAY TEAM"
                : "HOME TEAM"}
            </p>

            <p
              className="
                mt-2
                text-lg
                font-black
                text-[#4a4038]
              "
            >
              {teamName}
            </p>
          </div>

          <div
            className={`
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-[16px]
              text-xl
              ${
                isYellow
                  ? "bg-[#fff0bd]"
                  : "bg-[#dff4ff]"
              }
            `}
          >
            {isYellow
              ? "⚾"
              : "🧢"}
          </div>
        </div>

        <div
          className="
            mt-5
            grid
            grid-cols-2
            gap-3
            md:grid-cols-4
          "
        >
          <SummaryMetric
            icon="🏆"
            label="近10場"
            value={`${summary.wins}-${summary.losses}`}
            accent="yellow"
          />

          <SummaryMetric
            icon="🔥"
            label="平均得分"
            value={
              summary.averageRunsScored
            }
            accent="green"
          />

          <SummaryMetric
            icon="🛡️"
            label="平均失分"
            value={
              summary.averageRunsAllowed
            }
            accent="pink"
          />

          <SummaryMetric
            icon="⚡"
            label="目前連續"
            value={
              summary.streak
            }
            accent="purple"
          />
        </div>
      </div>
    </div>
  );
}

function TeamRecentGames({
  teamName,
  summary,
  accent,
}: {
  teamName: string;
  summary: RecentGamesSummary;
  accent:
    | "yellow"
    | "blue";
}) {
  const isYellow =
    accent ===
    "yellow";

  return (
    <div
      className="
        rounded-[26px]
        border
        border-[#eee3d6]
        bg-[#fffdf9]
        p-5
      "
    >
      <div
        className="
          flex
          flex-wrap
          items-end
          justify-between
          gap-4
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
            className={`
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-[15px]
              ${
                isYellow
                  ? "bg-[#fff0bd]"
                  : "bg-[#dff4ff]"
              }
            `}
          >
            {isYellow
              ? "⚾"
              : "🧢"}
          </div>

          <div>
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.15em]
                text-[#a0958b]
              "
            >
              RECENT FORM
            </p>

            <h3
              className="
                mt-1
                text-lg
                font-black
                text-[#4a4038]
              "
            >
              {teamName}
            </h3>
          </div>
        </div>

        <span
          className={`
            rounded-full
            px-4
            py-2
            text-xs
            font-black
            ${
              isYellow
                ? "bg-[#fff7da] text-[#af7718]"
                : "bg-[#eef9ff] text-[#5a8296]"
            }
          `}
        >
          {summary.wins} 勝{" "}
          {summary.losses} 敗
        </span>
      </div>

      {summary.games.length >
      0 ? (
        <div
          className="
            mt-5
            flex
            gap-4
            overflow-x-auto
            pb-3
          "
        >
          {summary.games.map(
            (
              game,
            ) => (
              <GameItem
                key={
                  game.gamePk
                }
                game={
                  game
                }
              />
            ),
          )}
        </div>
      ) : (
        <div
          className="
            mt-5
            rounded-[22px]
            border
            border-dashed
            border-[#e6dacb]
            bg-white
            p-6
            text-center
          "
        >
          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-[20px]
              bg-[#fff5d9]
              text-2xl
            "
          >
            🤔
          </div>

          <p
            className="
              mt-3
              text-sm
              font-black
              text-[#746960]
            "
          >
            目前沒有近10場比分資料
          </p>
        </div>
      )}
    </div>
  );
}

export default function RecentGamesCard({
  awayTeamName,
  homeTeamName,
  awaySummary,
  homeSummary,
}: Props) {
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
          bg-[#e8fff3]/55
          blur-2xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-16
          top-14
          h-48
          w-48
          rounded-full
          bg-[#dff5ff]/45
          blur-2xl
        "
      />

      <div
        className="
          relative
          p-6
          md:p-8
        "
      >
        {/* Header */}

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
              bg-[#e9fff5]
              text-2xl
              shadow-sm
            "
          >
            📈
          </div>

          <div>
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.22em]
                text-[#59846e]
              "
            >
              RECENT 10 GAMES
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
              近期戰況
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-[#978a7f]
              "
            >
              顯示兩隊近期比賽結果、對手、主客場及得失分。
            </p>
          </div>
        </div>

        {/* Summary */}

        <div
          className="
            mt-7
            grid
            gap-4
            lg:grid-cols-2
          "
        >
          <SummaryBox
            teamName={
              awayTeamName
            }
            summary={
              awaySummary
            }
            accent="yellow"
          />

          <SummaryBox
            teamName={
              homeTeamName
            }
            summary={
              homeSummary
            }
            accent="blue"
          />
        </div>

        {/* Recent Games */}

        <div
          className="
            mt-7
            space-y-6
          "
        >
          <TeamRecentGames
            teamName={
              awayTeamName
            }
            summary={
              awaySummary
            }
            accent="yellow"
          />

          <TeamRecentGames
            teamName={
              homeTeamName
            }
            summary={
              homeSummary
            }
            accent="blue"
          />
        </div>
      </div>
    </section>
  );
}