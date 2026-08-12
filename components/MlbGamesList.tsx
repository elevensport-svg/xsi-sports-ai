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
       * confidence / xsi 暫時維持時間排序，
       * 下一步接分析資料後再正式依數值排序。
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
    <div>
      {/* 排序狀態 */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          目前排序：
          <span className="ml-1 font-bold text-yellow-400">
            {getSortLabel(
              sortMode,
            )}
          </span>
        </p>

        {(sortMode ===
          "confidence" ||
          sortMode ===
            "xsi") && (
          <span className="rounded-full border border-yellow-500/20 bg-yellow-400/5 px-3 py-1 text-[10px] font-bold text-yellow-400">
            AI 排序資料準備中
          </span>
        )}
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
  if (sortMode === "confidence") {
    return "AI 信心度";
  }

  if (sortMode === "xsi") {
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
      className="group block w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-yellow-400/50 hover:bg-zinc-800 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-yellow-500/20 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-400">
          MLB
        </span>

        <p className="min-w-0 text-right text-xs text-zinc-500">
          {formatTaiwanGameTime(
            game.gameDate,
          )}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-start gap-2">
        <TeamRow
          label="客隊"
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
        />

        <div className="flex h-full items-center justify-center pt-16">
          <span className="text-sm font-black text-yellow-400">
            VS
          </span>
        </div>

        <TeamRow
          label="主隊"
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
        />
      </div>

      <div className="mt-6 border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-500">
          Game ID：
          {game.gamePk}
        </p>

        <div className="mt-4 flex w-full items-center justify-center rounded-xl bg-yellow-400 px-4 py-3 text-sm font-black text-black transition group-hover:bg-yellow-300">
          查看完整 AI 分析 →
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
};

function TeamRow({
  label,
  teamName,
  teamLogo,
  pitcherName,
}: TeamRowProps) {
  return (
    <div className="min-w-0 text-center">
      <p className="text-[10px] font-bold text-zinc-500">
        {label}
      </p>

      <div className="mt-3 flex justify-center">
        <div className="relative h-16 w-16 sm:h-20 sm:w-20">
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

      <p className="mt-3 break-words text-base font-black leading-snug text-white sm:text-lg">
        {teamName}
      </p>

      <div className="mt-3 rounded-xl bg-zinc-800 px-2 py-3">
        <p className="text-[10px] text-zinc-500">
          預計先發
        </p>

        <p className="mt-1 break-words text-xs font-bold leading-snug text-white sm:text-sm">
          {pitcherName}
        </p>
      </div>
    </div>
  );
}
