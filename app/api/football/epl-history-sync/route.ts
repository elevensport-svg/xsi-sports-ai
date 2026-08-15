import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";

const SEASON = "2025/26";
const LEAGUE = "英超";
const SOURCE = "football-data.co.uk";
const CSV_URL = "https://www.football-data.co.uk/mmz4281/2526/E0.csv";

type CsvRow = Record<string, string>;

type FootballHistoryRow = {
  external_id: string;
  league: string;
  season: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: string;
  source: string;
  home_odds: number | null;
  draw_odds: number | null;
  away_odds: number | null;
  updated_at: string;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = (values[index] ?? "").trim();
    });

    return row;
  });
}

function toNumber(value?: string): number | null {
  if (!value?.trim()) return null;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMatchDate(dateText: string, timeText?: string) {
  const parts = dateText.trim().split("/");

  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);

  let year = Number(parts[2]);

  if (year < 100) {
    year += 2000;
  }

  if (![day, month, year].every(Number.isFinite)) {
    return null;
  }

  let hour = 12;
  let minute = 0;

  if (timeText && /^\d{1,2}:\d{2}$/.test(timeText.trim())) {
    const [hourText, minuteText] = timeText.trim().split(":");
    hour = Number(hourText);
    minute = Number(minuteText);
  }

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0,
    ),
  );

  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : null;
}

function pickOdds(
  row: CsvRow,
  side: "home" | "draw" | "away",
) {
  const keys =
    side === "home"
      ? ["AvgH", "B365H"]
      : side === "draw"
        ? ["AvgD", "B365D"]
        : ["AvgA", "B365A"];

  for (const key of keys) {
    const value = toNumber(row[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function buildHistoryRow(
  row: CsvRow,
): FootballHistoryRow | null {
  const homeTeam = row.HomeTeam?.trim();
  const awayTeam = row.AwayTeam?.trim();

  const homeScore = toNumber(row.FTHG);
  const awayScore = toNumber(row.FTAG);

  const matchDate = parseMatchDate(
    row.Date ?? "",
    row.Time,
  );

  if (
    !homeTeam ||
    !awayTeam ||
    homeScore === null ||
    awayScore === null ||
    !matchDate
  ) {
    return null;
  }

  const dateKey = matchDate.slice(0, 10);

  return {
    external_id:
      `E0_2526_${dateKey}_${slugify(homeTeam)}_${slugify(awayTeam)}`,

    league: LEAGUE,
    season: SEASON,
    match_date: matchDate,
    home_team: homeTeam,
    away_team: awayTeam,
    home_score: homeScore,
    away_score: awayScore,
    status: "finished",
    source: SOURCE,

    home_odds: pickOdds(row, "home"),
    draw_odds: pickOdds(row, "draw"),
    away_odds: pickOdds(row, "away"),

    updated_at: new Date().toISOString(),
  };
}

/*
 * 預覽：
 * /api/football/epl-history-sync
 *
 * 正式：
 * /api/football/epl-history-sync?confirm=1
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const confirm =
      url.searchParams.get("confirm") === "1";

    console.log("======================================");
    console.log("🏴 EPL 2025/26 History Sync");
    console.log(`Source：${CSV_URL}`);

    const response = await fetch(CSV_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Football-Data EPL CSV 下載失敗：${response.status}`,
      );
    }

    const csvText = await response.text();
    const csvRows = parseCsv(csvText);

    const rawRows = csvRows
      .map(buildHistoryRow)
      .filter(
        (row): row is FootballHistoryRow =>
          row !== null,
      );

    const uniqueMap =
      new Map<string, FootballHistoryRow>();

    for (const row of rawRows) {
      uniqueMap.set(
        row.external_id,
        row,
      );
    }

    const rows =
      Array.from(uniqueMap.values());

    const duplicateCount =
      rawRows.length -
      rows.length;

    const completeOdds =
      rows.filter(
        (row) =>
          row.home_odds !== null &&
          row.draw_odds !== null &&
          row.away_odds !== null,
      ).length;

    if (!confirm) {
      return NextResponse.json({
        success: true,
        preview: true,
        message:
          "安全預覽，尚未寫入 football_match_history。確認後加上 ?confirm=1",
        league: LEAGUE,
        season: SEASON,
        csvRows: csvRows.length,
        finishedRows: rawRows.length,
        uniqueRows: rows.length,
        duplicateCount,
        completeOdds,
        sample: rows.slice(0, 10),
      });
    }

    const supabase =
      createAdminClient();

    const { error } =
      await supabase
        .from("football_match_history")
        .upsert(
          rows,
          {
            onConflict:
              "external_id",
          },
        );

    if (error) {
      throw new Error(
        `寫入 football_match_history 失敗：${error.message}`,
      );
    }

    console.log(
      `✅ EPL 歷史賽果寫入：${rows.length}`,
    );

    console.log(
      `💰 1X2 Odds 完整：${completeOdds}`,
    );

    console.log("======================================");

    return NextResponse.json({
      success: true,
      preview: false,
      league: LEAGUE,
      season: SEASON,
      csvRows: csvRows.length,
      finishedRows: rawRows.length,
      uniqueRows: rows.length,
      duplicateCount,
      completeOdds,
      saved: rows.length,
    });
  } catch (error) {
    console.error(
      "❌ EPL History Sync Error：",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}