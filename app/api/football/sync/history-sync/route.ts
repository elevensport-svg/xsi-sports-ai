import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic =
  "force-dynamic";

/* ==========================================
   Football-Data.co.uk

   2025/26 西甲
   SP1 = Spanish La Liga
========================================== */

const CSV_URL =
  "https://www.football-data.co.uk/mmz4281/2526/SP1.csv";

const LEAGUE =
  "西甲";

const SEASON =
  "2025/26";

const SOURCE =
  "football-data.co.uk";

/* ==========================================
   CSV Row

   除了比分，
   加入歷史 1X2 賠率。

   優先使用：
   AvgCH / AvgCD / AvgCA
   = Closing Average Odds
========================================== */

type CsvMatch = {
  Div: string;

  Date: string;

  Time?: string;

  HomeTeam: string;

  AwayTeam: string;

  FTHG: string;

  FTAG: string;

  FTR?: string;

  /* 開盤 / 較早市場平均 */
  AvgH?: string;
  AvgD?: string;
  AvgA?: string;

  /* 收盤市場平均 */
  AvgCH?: string;
  AvgCD?: string;
  AvgCA?: string;

  /* Bet365 開盤 */
  B365H?: string;
  B365D?: string;
  B365A?: string;

  /* Bet365 收盤 */
  B365CH?: string;
  B365CD?: string;
  B365CA?: string;
};

/* ==========================================
   Supabase Row
========================================== */

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

/* ==========================================
   CSV Parser
========================================== */

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
      /*
       * CSV 中：
       * ""
       * 代表欄位內容中的 "
       */
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

/* ==========================================
   CSV → Object
========================================== */

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
        (line) =>
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
      (line) => {
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

/* ==========================================
   Score Parser

   注意：
   Number("") 會變 0，
   所以不能直接拿來判斷比分。
========================================== */

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

/* ==========================================
   Odds Parser

   正常足球 decimal odds
   必須 > 1。
========================================== */

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

/* ==========================================
   取得歷史市場賠率

   Priority：

   1. Closing Average
      AvgCH / AvgCD / AvgCA

   2. Average
      AvgH / AvgD / AvgA

   3. Bet365 Closing
      B365CH / B365CD / B365CA

   4. Bet365
      B365H / B365D / B365A
========================================== */

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

/* ==========================================
   Football-Data 日期

   DD/MM/YYYY
   →
   ISO
========================================== */

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
      year >= 70
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

/* ==========================================
   External ID
========================================== */

function createExternalId({
  date,
  homeTeam,
  awayTeam,
}: {
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

  const normalize =
    (
      value:
        string,
    ) =>
      value
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

  return [
    "SP1",
    "2526",
    datePart,
    normalize(
      homeTeam,
    ),
    normalize(
      awayTeam,
    ),
  ].join(
    "_",
  );
}

/* ==========================================
   GET

   /api/football/sync/history-sync
========================================== */

export async function GET() {
  try {
    console.log(
      "======================================",
    );

    console.log(
      "⚽ Football History + Odds Sync",
    );

    console.log(
      `${LEAGUE} ${SEASON}`,
    );

    /* ======================================
       STEP 1
       Supabase
    ====================================== */

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

    /* ======================================
       STEP 2
       Download CSV
    ====================================== */

    console.log(
      `🌐 Download：${CSV_URL}`,
    );

    const response =
      await fetch(
        CSV_URL,
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
      console.error(
        `❌ CSV HTTP ${response.status}`,
      );

      return NextResponse.json(
        {
          success:
            false,

          message:
            `Football-Data CSV HTTP ${response.status}`,
        },
        {
          status:
            502,
        },
      );
    }

    const csv =
      await response.text();

    console.log(
      `📄 CSV Size：${csv.length}`,
    );

    /* ======================================
       STEP 3
       Parse CSV
    ====================================== */

    const matches =
      parseCsv(
        csv,
      );

    console.log(
      `📊 CSV Rows：${matches.length}`,
    );

    /* ======================================
       STEP 4
       建立歷史資料
    ====================================== */

    const rows:
      HistoryRow[] =
      [];

    let skipped =
      0;

    let oddsComplete =
      0;

    let oddsMissing =
      0;

    const oddsSourceCount:
      Record<
        string,
        number
      > = {};

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

      /*
       * 未完賽 /
       * 無比分 /
       * 無隊名
       * 都跳過。
       */
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

      oddsSourceCount[
        odds.source
      ] =
        (
          oddsSourceCount[
            odds.source
          ] ??
          0
        ) +
        1;

      rows.push({
        external_id:
          createExternalId({
            date:
              matchDate,

            homeTeam,

            awayTeam,
          }),

        league:
          LEAGUE,

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

    console.log(
      `✅ Finished Matches：${rows.length}`,
    );

    console.log(
      `💰 完整 1X2 賠率：${oddsComplete}`,
    );

    console.log(
      `⚠️ 缺少 1X2 賠率：${oddsMissing}`,
    );

    console.log(
      "Odds Sources：",
      oddsSourceCount,
    );

    console.log(
      `⏭️ Skipped：${skipped}`,
    );

    if (
      rows.length ===
      0
    ) {
      return NextResponse.json({
        success:
          false,

        message:
          "CSV 有下載成功，但沒有解析出任何已完賽資料",

        csvRows:
          matches.length,

        skipped,
      });
    }

    /* ======================================
   STEP 5
   依 日期 + 主隊 + 客隊
   更新歷史賠率

   不再依賴 external_id，
   避免舊資料 ID 格式不同。
====================================== */

let synced = 0;
let notFound = 0;

for (const row of rows) {
  const dateOnly =
    row.match_date.slice(0, 10);

  const startDate =
    `${dateOnly}T00:00:00.000Z`;

  const endDateObject =
    new Date(startDate);

  endDateObject.setUTCDate(
    endDateObject.getUTCDate() + 1,
  );

  const endDate =
    endDateObject.toISOString();

  const {
    data: updatedRows,
    error,
  } = await supabase
    .from("football_match_history")
    .update({
      home_odds: row.home_odds,
      draw_odds: row.draw_odds,
      away_odds: row.away_odds,
      updated_at: new Date().toISOString(),
    })
    .eq("league", LEAGUE)
    .eq("season", SEASON)
    .eq("home_team", row.home_team)
    .eq("away_team", row.away_team)
    .gte("match_date", startDate)
    .lt("match_date", endDate)
    .select("id");

  if (error) {
    console.error(
      "❌ Odds Update Error：",
      row.home_team,
      "vs",
      row.away_team,
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "歷史賠率更新失敗",
        error: error.message,
        synced,
        notFound,
      },
      {
        status: 500,
      },
    );
  }

  if (
    !updatedRows ||
    updatedRows.length === 0
  ) {
    notFound += 1;

    console.log(
      `⚠️ 找不到：${dateOnly} ${row.home_team} vs ${row.away_team}`,
    );

    continue;
  }

  synced += updatedRows.length;

console.log(
  `💰 Odds Updated：${synced}/${rows.length}｜${dateOnly} ${row.home_team} vs ${row.away_team}`,
);
}
console.log(
  `⚠️ Match Not Found：${notFound}`,
);

    /* ======================================
       STEP 6
       Complete
    ====================================== */

    console.log(
      "======================================",
    );

    console.log(
      `🎉 ${LEAGUE} ${SEASON} 歷史賽果 + 賠率同步完成`,
    );

    console.log(
      `⚽ Matches：${synced}`,
    );

    console.log(
      `💰 Odds Complete：${oddsComplete}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        true,

      league:
        LEAGUE,

      season:
        SEASON,

      csvRows:
        matches.length,

      finishedMatches:
        rows.length,

      synced,

      skipped,

      odds: {
        complete:
          oddsComplete,

        missing:
          oddsMissing,

        sources:
          oddsSourceCount,
      },

      sample:
        rows
          .slice(
            -5,
          )
          .map(
            (row) => ({
              date:
                row.match_date,

              homeTeam:
                row.home_team,

              awayTeam:
                row.away_team,

              score:
                `${row.home_score}-${row.away_score}`,

              odds: {
                home:
                  row.home_odds,

                draw:
                  row.draw_odds,

                away:
                  row.away_odds,
              },
            }),
          ),
    });
  } catch (error) {
    console.error(
      "❌ Football History Sync Error：",
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