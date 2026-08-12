import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic =
  "force-dynamic";

const SEASON =
  "2025/26";

const SOURCE =
  "football-data.co.uk";

type LeagueConfig = {
  code: string;
  league: string;
};

const LEAGUES:
  LeagueConfig[] = [
    {
      code:
        "E0",
      league:
        "英超",
    },
    {
      code:
        "SP1",
      league:
        "西甲",
    },
    {
      code:
        "I1",
      league:
        "義甲",
    },
    {
      code:
        "D1",
      league:
        "德甲",
    },
    {
      code:
        "F1",
      league:
        "法甲",
    },
  ];

type CsvMatch = {
  Div: string;
  Date: string;
  Time?: string;
  HomeTeam: string;
  AwayTeam: string;
  FTHG: string;
  FTAG: string;
  FTR?: string;

  AvgH?: string;
  AvgD?: string;
  AvgA?: string;

  AvgCH?: string;
  AvgCD?: string;
  AvgCA?: string;

  B365H?: string;
  B365D?: string;
  B365A?: string;

  B365CH?: string;
  B365CD?: string;
  B365CA?: string;
};

type HistoryRow = {
  external_id: string;
  league: string;
  season: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  home_odds:
    number | null;
  draw_odds:
    number | null;
  away_odds:
    number | null;
  status: string;
  source: string;
  updated_at: string;
};

function parseCsvLine(
  line: string,
) {
  const values:
    string[] = [];

  let current =
    "";

  let insideQuotes =
    false;

  for (
    let i =
      0;
    i <
      line.length;
    i +=
      1
  ) {
    const char =
      line[i];

    if (
      char === '"'
    ) {
      if (
        insideQuotes &&
        line[
          i + 1
        ] === '"'
      ) {
        current +=
          '"';

        i +=
          1;
      } else {
        insideQuotes =
          !insideQuotes;
      }

      continue;
    }

    if (
      char === "," &&
      !insideQuotes
    ) {
      values.push(
        current.trim(),
      );

      current =
        "";

      continue;
    }

    current +=
      char;
  }

  values.push(
    current.trim(),
  );

  return values;
}

function parseCsv(
  csv: string,
): CsvMatch[] {
  const lines =
    csv
      .replace(
        /^\uFEFF/,
        "",
      )
      .split(
        /\r?\n/,
      )
      .filter(
        (
          line,
        ) =>
          line
            .trim()
            .length >
          0,
      );

  if (
    lines.length <
    2
  ) {
    return [];
  }

  const headers =
    parseCsvLine(
      lines[0],
    );

  return lines
    .slice(
      1,
    )
    .map(
      (
        line,
      ) => {
        const values =
          parseCsvLine(
            line,
          );

        const row:
          Record<
            string,
            string
          > = {};

        headers.forEach(
          (
            header,
            index,
          ) => {
            row[
              header
            ] =
              values[
                index
              ] ??
              "";
          },
        );

        return row as unknown as CsvMatch;
      },
    );
}

function parseScore(
  value:
    string | undefined,
) {
  if (
    value ===
      undefined ||
    value.trim() ===
      ""
  ) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return null;
  }

  return parsed;
}

function parseOdds(
  value:
    string | undefined,
) {
  if (
    value ===
      undefined ||
    value.trim() ===
      ""
  ) {
    return null;
  }

  const parsed =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      parsed,
    ) ||
    parsed <=
      1
  ) {
    return null;
  }

  return parsed;
}

function getHistoricalOdds(
  match:
    CsvMatch,
) {
  const closingAverage = {
    home:
      parseOdds(
        match.AvgCH,
      ),

    draw:
      parseOdds(
        match.AvgCD,
      ),

    away:
      parseOdds(
        match.AvgCA,
      ),
  };

  if (
    closingAverage.home !==
      null &&
    closingAverage.draw !==
      null &&
    closingAverage.away !==
      null
  ) {
    return {
      ...closingAverage,

      source:
        "AvgC",
    };
  }

  const average = {
    home:
      parseOdds(
        match.AvgH,
      ),

    draw:
      parseOdds(
        match.AvgD,
      ),

    away:
      parseOdds(
        match.AvgA,
      ),
  };

  if (
    average.home !==
      null &&
    average.draw !==
      null &&
    average.away !==
      null
  ) {
    return {
      ...average,

      source:
        "Avg",
    };
  }

  const bet365Closing = {
    home:
      parseOdds(
        match.B365CH,
      ),

    draw:
      parseOdds(
        match.B365CD,
      ),

    away:
      parseOdds(
        match.B365CA,
      ),
  };

  if (
    bet365Closing.home !==
      null &&
    bet365Closing.draw !==
      null &&
    bet365Closing.away !==
      null
  ) {
    return {
      ...bet365Closing,

      source:
        "B365C",
    };
  }

  const bet365 = {
    home:
      parseOdds(
        match.B365H,
      ),

    draw:
      parseOdds(
        match.B365D,
      ),

    away:
      parseOdds(
        match.B365A,
      ),
  };

  if (
    bet365.home !==
      null &&
    bet365.draw !==
      null &&
    bet365.away !==
      null
  ) {
    return {
      ...bet365,

      source:
        "B365",
    };
  }

  return {
    home:
      null,

    draw:
      null,

    away:
      null,

    source:
      "none",
  };
}

function parseMatchDate(
  dateValue:
    string,

  timeValue?:
    string,
) {
  const parts =
    dateValue
      .trim()
      .split(
        "/",
      );

  if (
    parts.length !==
    3
  ) {
    return null;
  }

  const day =
    Number(
      parts[0],
    );

  const month =
    Number(
      parts[1],
    );

  let year =
    Number(
      parts[2],
    );

  if (
    year <
    100
  ) {
    year +=
      year >=
        70
        ? 1900
        : 2000;
  }

  if (
    !Number.isFinite(
      day,
    ) ||
    !Number.isFinite(
      month,
    ) ||
    !Number.isFinite(
      year,
    )
  ) {
    return null;
  }

  let hour =
    12;

  let minute =
    0;

  if (
    timeValue &&
    timeValue.trim()
      .length >
      0
  ) {
    const timeParts =
      timeValue
        .trim()
        .split(
          ":",
        );

    if (
      timeParts.length >=
      2
    ) {
      const parsedHour =
        Number(
          timeParts[0],
        );

      const parsedMinute =
        Number(
          timeParts[1],
        );

      if (
        Number.isFinite(
          parsedHour,
        ) &&
        Number.isFinite(
          parsedMinute,
        )
      ) {
        hour =
          parsedHour;

        minute =
          parsedMinute;
      }
    }
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day,
        hour,
        minute,
        0,
      ),
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function normalizeSlug(
  value:
    string,
) {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function createExternalId({
  leagueCode,
  seasonCode,
  date,
  homeTeam,
  awayTeam,
}: {
  leagueCode:
    string;

  seasonCode:
    string;

  date:
    Date;

  homeTeam:
    string;

  awayTeam:
    string;
}) {
  const datePart =
    date
      .toISOString()
      .slice(
        0,
        10,
      );

  return [
    leagueCode,
    seasonCode,
    datePart,
    normalizeSlug(
      homeTeam,
    ),
    normalizeSlug(
      awayTeam,
    ),
  ].join(
    "_",
  );
}

function getSeasonCode(
  season:
    string,
) {
  return season
    .replace(
      "/",
      "",
    )
    .slice(
      2,
    );
}

async function upsertLeagueRows({
  supabase,
  league,
  rows,
}: {
  /*
   * 這支 route 沒有綁定 generated Database type。
   * 若使用 ReturnType<typeof createClient>，
   * TypeScript 可能把 table row 推成 never。
   */
  supabase:
    any;

  league:
    string;

  rows:
    HistoryRow[];
}) {
  const BATCH_SIZE =
    100;

  let upserted =
    0;

  for (
    let i =
      0;
    i <
      rows.length;
    i +=
      BATCH_SIZE
  ) {
    const batch =
      rows.slice(
        i,
        i +
          BATCH_SIZE,
      );

    const {
      error,
    } =
      await supabase
        .from(
          "football_match_history",
        )
        .upsert(
          batch as any[],
          {
            onConflict:
              "external_id",
          },
        );

    if (
      error
    ) {
      throw new Error(
        `${league} upsert 失敗：${error.message}`,
      );
    }

    upserted +=
      batch.length;

    console.log(
      `✅ ${league} Upsert：${upserted}/${rows.length}`,
    );
  }

  return upserted;
}

export async function GET() {
  try {
    console.log(
      "======================================",
    );

    console.log(
      "⚽ FIVE LEAGUES HISTORY SYNC",
    );

    console.log(
      `📅 Season：${SEASON}`,
    );

    console.log(
      "======================================",
    );

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env
        .SUPABASE_SECRET_KEY ??
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (
      !supabaseUrl ||
      !supabaseKey
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "找不到 Supabase 環境變數",
        },
        {
          status:
            500,
        },
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        supabaseKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        },
      );

    const seasonCode =
      getSeasonCode(
        SEASON,
      );

    const result:
      Array<{
        league: string;
        code: string;
        csvRows: number;
        finishedMatches: number;
        oddsComplete: number;
        oddsMissing: number;
        skipped: number;
        upserted: number;
      }> = [];

    for (
      const config
      of LEAGUES
    ) {
      console.log(
        "--------------------------------------",
      );

      console.log(
        `🌍 ${config.league} (${config.code})`,
      );

      const csvUrl =
        `https://www.football-data.co.uk/mmz4281/${seasonCode}/${config.code}.csv`;

      console.log(
        `🌐 Download：${csvUrl}`,
      );

      const response =
        await fetch(
          csvUrl,
          {
            cache:
              "no-store",

            headers: {
              "User-Agent":
                "Mozilla/5.0 XSI-Sports-AI",
            },
          },
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `${config.league} CSV HTTP ${response.status}`,
        );
      }

      const csv =
        await response.text();

      const matches =
        parseCsv(
          csv,
        );

      const rows:
        HistoryRow[] =
        [];

      let skipped =
        0;

      let oddsComplete =
        0;

      let oddsMissing =
        0;

      for (
        const match
        of matches
      ) {
        const homeTeam =
          match.HomeTeam
            ?.trim();

        const awayTeam =
          match.AwayTeam
            ?.trim();

        const homeScore =
          parseScore(
            match.FTHG,
          );

        const awayScore =
          parseScore(
            match.FTAG,
          );

        const matchDate =
          parseMatchDate(
            match.Date,
            match.Time,
          );

        if (
          !homeTeam ||
          !awayTeam ||
          !matchDate ||
          homeScore ===
            null ||
          awayScore ===
            null
        ) {
          skipped +=
            1;

          continue;
        }

        const odds =
          getHistoricalOdds(
            match,
          );

        if (
          odds.home !==
            null &&
          odds.draw !==
            null &&
          odds.away !==
            null
        ) {
          oddsComplete +=
            1;
        } else {
          oddsMissing +=
            1;
        }

        rows.push({
          external_id:
            createExternalId({
              leagueCode:
                config.code,

              seasonCode,

              date:
                matchDate,

              homeTeam,

              awayTeam,
            }),

          league:
            config.league,

          season:
            SEASON,

          match_date:
            matchDate
              .toISOString(),

          home_team:
            homeTeam,

          away_team:
            awayTeam,

          home_score:
            homeScore,

          away_score:
            awayScore,

          home_odds:
            odds.home,

          draw_odds:
            odds.draw,

          away_odds:
            odds.away,

          status:
            "finished",

          source:
            SOURCE,

          updated_at:
            new Date()
              .toISOString(),
        });
      }

      const upserted =
        await upsertLeagueRows({
          supabase,
          league:
            config.league,
          rows,
        });

      result.push({
        league:
          config.league,

        code:
          config.code,

        csvRows:
          matches.length,

        finishedMatches:
          rows.length,

        oddsComplete,

        oddsMissing,

        skipped,

        upserted,
      });

      console.log(
        `🎉 ${config.league} 完成：${upserted} 場`,
      );
    }

    const totalUpserted =
      result.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.upserted,
        0,
      );

    console.log(
      "======================================",
    );

    console.log(
      `🏁 FIVE LEAGUES COMPLETE：${totalUpserted}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        true,

      season:
        SEASON,

      totalUpserted,

      leagues:
        result,
    });
  } catch (
    error
  ) {
    console.error(
      "❌ Five Leagues History Sync Error：",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
            ? error.message
            : String(
                error,
              ),
      },
      {
          status:
          500,
      },
    );
  }
}