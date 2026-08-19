"use client";

import Image from "next/image";
import Link from "next/link";

import {
  formatTaiwanGameTime,
  type MlbScheduleGame,
} from "../lib/api/mlb";

import {
  getMlbTeamLogo,
  getMlbTeamName,
} from "../lib/teams/mlb";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Props = {
  games: MlbScheduleGame[];
};

type SortMode =
  | "time"
  | "confidence"
  | "xsi";

export default function MlbGamesList({
  games,
}: Props) {
  const [sortMode, setSortMode] =
    useState<SortMode>("time");

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          "xsi-settings",
        );

      if (!stored) {
        return;
      }

      const settings =
        JSON.parse(stored);

      if (
        settings.sortMode === "time" ||
        settings.sortMode ===
          "confidence" ||
        settings.sortMode === "xsi"
      ) {
        setSortMode(
          settings.sortMode,
        );
      }
    } catch (error) {
      console.error(
        "讀取賽事排序設定失敗:",
        error,
      );
    }
  }, []);

  const sortedGames =
    useMemo(() => {
      const result =
        [...games];

      /*
       * 目前 MLB Schedule API
       * 還沒有每場 AI 信心度與 XSI Value。
       *
       * confidence / xsi 暫時維持時間排序。
       */

      result.sort(
        (a, b) =>
          new Date(
            a.gameDate,
          ).getTime() -
          new Date(
            b.gameDate,
          ).getTime(),
      );

      return result;
    }, [games, sortMode]);

  return (
    <div className="w-full">
      {/* ======================================
          Sort Status
      ====================================== */}

      <div
        className="
          mb-5
          flex
          flex-wrap
          items-center
          justify-between
          gap-3
          rounded-[20px]
          border
          border-[#eee3d6]
          bg-white
          px-4
          py-3
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <span
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-[12px]
              bg-[#fff3c9]
            "
          >
            🗂️
          </span>

          <p
            className="
              text-xs
              font-bold
              text-[#9a8d82]
            "
          >
            目前排序：

            <span
              className="
                ml-1
                font-black
                text-[#c68418]
              "
            >
              {getSortLabel(
                sortMode,
              )}
            </span>
          </p>
        </div>

        {(sortMode ===
          "confidence" ||
          sortMode ===
            "xsi") && (
          <span
            className="
              rounded-full
              border
              border-[#efd98c]
              bg-[#fff7d9]
              px-3
              py-1
              text-[10px]
              font-black
              text-[#a6761c]
            "
          >
            🤖 AI 排序資料準備中
          </span>
        )}
      </div>

      {/* ======================================
          Games Grid
      ====================================== */}

      <div
        className="
          grid
          w-full
          min-w-0
          grid-cols-1
          gap-5
          md:grid-cols-2
          xl:grid-cols-3
        "
      >
        {sortedGames.map(
          (game) => (
            <GameItem
              key={
                game.gamePk
              }
              game={game}
            />
          ),
        )}
      </div>
    </div>
  );
}

function getSortLabel(
  sortMode: SortMode,
) {
  if (
    sortMode ===
    "confidence"
  ) {
    return "AI 信心度";
  }

  if (
    sortMode ===
    "xsi"
  ) {
    return "XSI 價值評分";
  }

  return "開賽時間";
}

type GameItemProps = {
  game: MlbScheduleGame;
};

function GameItem({
  game,
}: GameItemProps) {
  const awayTeamId =
    game.teams.away.team.id;

  const homeTeamId =
    game.teams.home.team.id;

  const awayTeamName =
    getMlbTeamName(
      awayTeamId,
    );

  const homeTeamName =
    getMlbTeamName(
      homeTeamId,
    );

  const awayTeamLogo =
    getMlbTeamLogo(
      awayTeamId,
    );

  const homeTeamLogo =
    getMlbTeamLogo(
      homeTeamId,
    );

  return (
    <Link
      href={`/mlb/${game.gamePk}`}
      className="
        group
        relative
        block
        w-full
        min-w-0
        overflow-hidden
        rounded-[28px]
        border
        border-[#eee0cd]
        bg-white
        p-4
        shadow-[0_9px_25px_rgba(95,75,55,0.07)]
        transition
        duration-200
        hover:-translate-y-1
        hover:border-[#f1cf70]
        hover:shadow-[0_16px_35px_rgba(95,75,55,0.13)]
        sm:p-5
      "
    >
      {/* 背景泡泡 */}

      <div
        className="
          pointer-events-none
          absolute
          -right-10
          -top-10
          h-28
          w-28
          rounded-full
          bg-[#dff5ff]/45
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-12
          -left-10
          h-28
          w-28
          rounded-full
          bg-[#fff0a8]/30
        "
      />

      <div className="relative">
        {/* ======================================
            Card Header
        ====================================== */}

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
            <span
              className="
                rounded-full
                bg-[#fff0bd]
                px-3
                py-1
                text-[10px]
                font-black
                tracking-wider
                text-[#9f711e]
              "
            >
              ⚾ MLB
            </span>

            <span
              className="
                hidden
                rounded-full
                bg-[#eef9ff]
                px-2.5
                py-1
                text-[9px]
                font-black
                text-[#578094]
                sm:block
              "
            >
              XSI MATCH
            </span>
          </div>

          <div
            className="
              flex
              items-center
              gap-1.5
              rounded-full
              border
              border-[#eee3d6]
              bg-[#fffdf9]
              px-3
              py-1.5
            "
          >
            <span
              className="
                text-[10px]
              "
            >
              ⏰
            </span>

            <p
              className="
                min-w-0
                text-right
                text-[10px]
                font-bold
                text-[#91857b]
                sm:text-xs
              "
            >
              {formatTaiwanGameTime(
                game.gameDate,
              )}
            </p>
          </div>
        </div>

        {/* ======================================
            Matchup
        ====================================== */}

        <div
          className="
            mt-5
            rounded-[24px]
            border
            border-[#f0e5d8]
            bg-gradient-to-r
            from-[#fff9e9]
            via-white
            to-[#edf9ff]
            p-3
            sm:p-4
          "
        >
          <div
            className="
              grid
              grid-cols-[minmax(0,1fr)_46px_minmax(0,1fr)]
              items-start
              gap-2
            "
          >
            <TeamRow
              label="AWAY・客隊"
              teamName={
                awayTeamName
              }
              teamLogo={
                awayTeamLogo
              }
              pitcherName={
                game.teams.away
                  .probablePitcher
                  ?.fullName ??
                "尚未公布"
              }
              accent="yellow"
            />

            {/* VS */}

            <div
              className="
                flex
                h-full
                flex-col
                items-center
                justify-center
                pt-14
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  border-[3px]
                  border-white
                  bg-gradient-to-br
                  from-[#ffd96d]
                  to-[#ffb94c]
                  text-xs
                  font-black
                  text-[#594217]
                  shadow-[0_7px_16px_rgba(255,185,76,0.28)]
                  transition
                  group-hover:scale-110
                "
              >
                VS
              </div>
            </div>

            <TeamRow
              label="HOME・主隊"
              teamName={
                homeTeamName
              }
              teamLogo={
                homeTeamLogo
              }
              pitcherName={
                game.teams.home
                  .probablePitcher
                  ?.fullName ??
                "尚未公布"
              }
              accent="blue"
            />
          </div>
        </div>

        {/* ======================================
            Footer
        ====================================== */}

        <div
          className="
            mt-4
            border-t
            border-dashed
            border-[#e9dfd4]
            pt-4
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
            <p
              className="
                text-[10px]
                font-bold
                text-[#aaa096]
              "
            >
              Game ID：
              {game.gamePk}
            </p>

            <span
              className="
                rounded-full
                bg-[#ecfff5]
                px-2.5
                py-1
                text-[9px]
                font-black
                text-[#4a856b]
              "
            >
              🤖 AI READY
            </span>
          </div>

          <div
            className="
              mt-4
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-full
              bg-gradient-to-r
              from-[#ffd666]
              to-[#ffc247]
              px-4
              py-3
              text-sm
              font-black
              text-[#4d3a13]
              shadow-[0_6px_15px_rgba(255,183,55,0.20)]
              transition
              group-hover:shadow-[0_9px_20px_rgba(255,183,55,0.28)]
            "
          >
            <span>
              🤖
            </span>

            <span>
              查看完整 AI 分析
            </span>

            <span
              className="
                transition
                group-hover:translate-x-1
              "
            >
              →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

type TeamRowProps = {
  label: string;
  teamName: string;
  teamLogo: string;
  pitcherName: string;

  accent:
    | "yellow"
    | "blue";
};

function TeamRow({
  label,
  teamName,
  teamLogo,
  pitcherName,
  accent,
}: TeamRowProps) {
  const logoBackground =
    accent === "yellow"
      ? "bg-[#fff8df] border-[#f0dfb5]"
      : "bg-[#f0faff] border-[#dcecf4]";

  const pitcherBackground =
    accent === "yellow"
      ? "bg-[#fff9e8] border-[#f1e3c3]"
      : "bg-[#f2faff] border-[#dfedf4]";

  return (
    <div
      className="
        min-w-0
        text-center
      "
    >
      <p
        className="
          text-[9px]
          font-black
          tracking-wide
          text-[#9d9186]
          sm:text-[10px]
        "
      >
        {label}
      </p>

      {/* Team Logo */}

      <div
        className="
          mt-3
          flex
          justify-center
        "
      >
        <div
          className={`
            flex
            h-[74px]
            w-[74px]
            items-center
            justify-center
            rounded-[22px]
            border
            shadow-sm
            transition
            duration-200
            group-hover:scale-[1.03]
            sm:h-[86px]
            sm:w-[86px]
            ${logoBackground}
          `}
        >
          <div
            className="
              relative
              h-14
              w-14
              sm:h-16
              sm:w-16
            "
          >
            <Image
              src={
                teamLogo
              }
              alt={
                teamName
              }
              fill
              sizes="80px"
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Team Name */}

      <p
        className="
          mt-3
          min-h-[44px]
          break-words
          text-sm
          font-black
          leading-snug
          text-[#4a4038]
          sm:text-base
        "
      >
        {teamName}
      </p>

      {/* Pitcher */}

      <div
        className={`
          mt-3
          min-h-[72px]
          rounded-[18px]
          border
          px-2
          py-3
          ${pitcherBackground}
        `}
      >
        <p
          className="
            text-[9px]
            font-bold
            text-[#a3988e]
          "
        >
          ⚾ 預計先發
        </p>

        <p
          className="
            mt-1.5
            break-words
            text-[11px]
            font-black
            leading-snug
            text-[#655a51]
            sm:text-xs
          "
        >
          {pitcherName}
        </p>
      </div>
    </div>
  );
}