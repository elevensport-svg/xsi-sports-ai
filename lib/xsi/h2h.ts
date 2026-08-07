import type { HeadToHeadSummary } from "../api/head-to-head";

export type H2HScoreResult = {
  teamAScore: number;
  teamBScore: number;
  teamAGrade: string;
  teamBGrade: string;
};

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function getGrade(score: number): string {
  if (score >= 75) return "歷史交手明顯優勢";
  if (score >= 62) return "歷史交手略有優勢";
  if (score >= 45) return "歷史交手接近";
  return "歷史交手偏弱";
}

export function calculateH2HScore(
  summary: HeadToHeadSummary,
): H2HScoreResult {
  const totalGames = summary.games.length;

  if (totalGames === 0) {
    return {
      teamAScore: 50,
      teamBScore: 50,
      teamAGrade: "資料不足",
      teamBGrade: "資料不足",
    };
  }

  const teamAWinRate =
    summary.teamAWins / totalGames;

  const teamBWinRate =
    summary.teamBWins / totalGames;

  const runDifference =
    summary.teamAAverageRuns -
    summary.teamBAverageRuns;

  const teamAScore = clamp(
    50 +
      (teamAWinRate - teamBWinRate) * 30 +
      runDifference * 4,
  );

  const teamBScore = clamp(
    50 +
      (teamBWinRate - teamAWinRate) * 30 -
      runDifference * 4,
  );

  return {
    teamAScore: Number(teamAScore.toFixed(1)),
    teamBScore: Number(teamBScore.toFixed(1)),
    teamAGrade: getGrade(teamAScore),
    teamBGrade: getGrade(teamBScore),
  };
}