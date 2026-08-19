import type {
  HeadToHeadGame,
  HeadToHeadSummary,
} from "../../lib/api/head-to-head";

import {
  getMlbTeamLogo,
} from "../../lib/teams/mlb";

type Props = {
  teamAId: number;
  teamAName: string;
  teamBId: number;
  teamBName: string;
  summary: HeadToHeadSummary;
};

function formatDate(
  value: string,
): string {
  const date =
    new Date(
      value,
    );

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
  ).format(
    date,
  );
}

function TeamSummary({
  teamId,
  teamName,
  wins,
  averageRuns,
  accent,
}: {
  teamId: number;
  teamName: string;
  wins: number;
  averageRuns: number;
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
        text-center
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
          opacity-35
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
            mx-auto
            flex
            h-20
            w-20
            items-center
            justify-center
            rounded-[24px]
            border
            border-white
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
              h-16
              w-16
              object-contain
            "
          />
        </div>

        <p
          className="
            mt-4
            text-lg
            font-black
            text-[#4a4038]
          "
        >
          {teamName}
        </p>

        <div
          className="
            mt-4
            flex
            items-end
            justify-center
            gap-2
          "
        >
          <p
            className={`
              text-4xl
              font-black
              ${
                isYellow
                  ? "text-[#c98213]"
                  : "text-[#54829a]"
              }
            `}
          >
            {wins}
          </p>

          <p
            className="
              pb-1
              text-sm
              font-bold
              text-[#9c9187]
            "
          >
            勝
          </p>
        </div>

        <div
          className="
            mt-4
            rounded-[18px]
            border
            border-white
            bg-white/85
            p-3
            shadow-sm
          "
        >
          <p
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.16em]
              text-[#a0958b]
            "
          >
            平均得分
          </p>

          <p
            className="
              mt-2
              text-xl
              font-black
              text-[#4a4038]
            "
          >
            {averageRuns}
          </p>
        </div>
      </div>
    </div>
  );
}

function GameRow({
  game,
}: {
  game: HeadToHeadGame;
}) {
  const awayWon =
    game.winnerTeamId ===
    game.awayTeamId;

  const homeWon =
    game.winnerTeamId ===
    game.homeTeamId;

  return (
    <div
      className="
        grid
        gap-4
        rounded-[22px]
        border
        border-[#eee3d6]
        bg-white
        p-4
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:shadow-md
        md:grid-cols-[90px_1fr_auto_1fr]
        md:items-center
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <span>
          📅
        </span>

        <p
          className="
            text-xs
            font-bold
            text-[#a0958b]
          "
        >
          {formatDate(
            game.date,
          )}
        </p>
      </div>

      {/* Away */}

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
            shrink-0
            items-center
            justify-center
            rounded-[15px]
            bg-[#fff8df]
          "
        >
          <img
            src={
              getMlbTeamLogo(
                game.awayTeamId,
              )
            }
            alt={
              game.awayTeamName
            }
            className="
              h-9
              w-9
              object-contain
            "
          />
        </div>

        <div className="min-w-0">
          <p
            className={`
              break-words
              ${
                awayWon
                  ? "font-black text-[#4d8a6c]"
                  : "font-bold text-[#625950]"
              }
            `}
          >
            {
              game.awayTeamName
            }
          </p>

          <p
            className="
              mt-1
              text-[10px]
              font-bold
              text-[#aaa096]
            "
          >
            AWAY・客隊
          </p>
        </div>
      </div>

      {/* Score */}

      <div
        className="
          flex
          items-center
          justify-center
        "
      >
        <div
          className="
            rounded-[18px]
            bg-[#fff7df]
            px-4
            py-2.5
            text-center
          "
        >
          <p
            className="
              whitespace-nowrap
              text-2xl
              font-black
              text-[#4a4038]
              md:text-3xl
            "
          >
            {game.awayScore}

            <span
              className="
                mx-3
                text-[#cdbda8]
              "
            >
              -
            </span>

            {game.homeScore}
          </p>
        </div>
      </div>

      {/* Home */}

      <div
        className="
          flex
          items-center
          gap-3
          md:justify-end
        "
      >
        <div
          className="
            min-w-0
            md:text-right
          "
        >
          <p
            className={`
              break-words
              ${
                homeWon
                  ? "font-black text-[#4d8a6c]"
                  : "font-bold text-[#625950]"
              }
            `}
          >
            {
              game.homeTeamName
            }
          </p>

          <p
            className="
              mt-1
              text-[10px]
              font-bold
              text-[#aaa096]
            "
          >
            HOME・主隊
          </p>
        </div>

        <div
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-[15px]
            bg-[#eef9ff]
          "
        >
          <img
            src={
              getMlbTeamLogo(
                game.homeTeamId,
              )
            }
            alt={
              game.homeTeamName
            }
            className="
              h-9
              w-9
              object-contain
            "
          />
        </div>
      </div>
    </div>
  );
}

export default function H2HCard({
  teamAId,
  teamAName,
  teamBId,
  teamBName,
  summary,
}: Props) {
  const totalGames =
    summary.games.length;

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
          bg-[#fff0a8]/30
          blur-2xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-16
          top-20
          h-48
          w-48
          rounded-full
          bg-[#dff5ff]/40
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
              bg-[#f2edff]
              text-2xl
              shadow-sm
            "
          >
            🤝
          </div>

          <div>
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.22em]
                text-[#8d79b1]
              "
            >
              HEAD TO HEAD
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
              近 {totalGames || 10} 次交手
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-[#978a7f]
              "
            >
              顯示兩隊近期直接對戰結果、勝場與平均得分。
            </p>
          </div>
        </div>

        {totalGames ===
        0 ? (
          <div
            className="
              mt-7
              rounded-[26px]
              border
              border-dashed
              border-[#e5d9ca]
              bg-[#fffdf9]
              p-8
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-[22px]
                bg-[#f2edff]
                text-3xl
              "
            >
              🤔
            </div>

            <p
              className="
                mt-4
                font-black
                text-[#655b53]
              "
            >
              目前沒有近期交手資料
            </p>

            <p
              className="
                mt-2
                text-sm
                text-[#a0958b]
              "
            >
              XSI 小助手暫時找不到這兩隊的近期交手紀錄。
            </p>
          </div>
        ) : (
          <>
            {/* Team Summary */}

            <div
              className="
                mt-7
                grid
                gap-4
                md:grid-cols-2
              "
            >
              <TeamSummary
                teamId={
                  teamAId
                }
                teamName={
                  teamAName
                }
                wins={
                  summary.teamAWins
                }
                averageRuns={
                  summary.teamAAverageRuns
                }
                accent="yellow"
              />

              <TeamSummary
                teamId={
                  teamBId
                }
                teamName={
                  teamBName
                }
                wins={
                  summary.teamBWins
                }
                averageRuns={
                  summary.teamBAverageRuns
                }
                accent="blue"
              />
            </div>

            {/* Latest */}

            {summary.latestGame && (
              <div
                className="
                  mt-6
                  rounded-[26px]
                  border
                  border-[#efdca8]
                  bg-[#fffaf0]
                  p-5
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
                      rounded-[15px]
                      bg-[#fff0bd]
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
                        tracking-[0.16em]
                        text-[#ad7b22]
                      "
                    >
                      LATEST MATCH
                    </p>

                    <p
                      className="
                        mt-1
                        font-black
                        text-[#655b53]
                      "
                    >
                      最近一次交手
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <GameRow
                    game={
                      summary.latestGame
                    }
                  />
                </div>
              </div>
            )}

            {/* History */}

            <div className="mt-8">
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
                    rounded-[15px]
                    bg-[#eef9ff]
                  "
                >
                  📚
                </div>

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
                    MATCH HISTORY
                  </p>

                  <p
                    className="
                      mt-1
                      font-black
                      text-[#4a4038]
                    "
                  >
                    歷史交手比分
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-4
                  space-y-3
                "
              >
                {summary.games.map(
                  (
                    game,
                  ) => (
                    <GameRow
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
            </div>
          </>
        )}
      </div>
    </section>
  );
}