import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic =
  "force-dynamic";

/* ==========================================
   XSI Football Historical Import

   用法：

   /api/football/sync/history-import?season=2023/24

   /api/football/sync/history-import?season=2024/25

   /api/football/sync/history-import?season=2025/26

   西甲：
   SP1 = Spanish La Liga
========================================== */

const LEAGUE =
  "西甲";

const SOURCE =
  "football-data.co.uk";

/* ==========================================
   Supported Seasons
========================================== */

const SEASON_MAP: Record<
  string,
  {
    code: string;
    csvUrl: string;
  }
> = {
  "2023/24": {
    code:
      "2324",

    csvUrl:
      "https://www.football-data.co.uk/mmz4281/2324/SP1.csv",
  },

  "2024/25": {
    code:
      "2425",

    csvUrl:
      "https://www.football-data.co.uk/mmz4281/2425/SP1.csv",
  },

  "2025/26": {
    code:
      "2526",

    csvUrl:
      "https://www.football-data.co.uk/mmz4281/2526/SP1.csv",
  },
};

/* ==========================================
   CSV Row
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

  /* Average Odds */
  AvgH?: string;
  AvgD?: string;
  AvgA?: string;

  /* Closing Average Odds */
  AvgCH?: string;
  AvgCD?: string;
  AvgCA?: string;

  /* Bet365 */
  B365H?: string;
  B365D?: string;
  B365A?: string;

  /* Bet365 Closing */
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
      char ===
      '"'
    ) {
      if (
        insideQuotes &&
        line[
          i + 1
        ] ===
          '"'
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

/* ==========================================
   Score Parser
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
   Historical Odds Priority

   1. AvgCH / AvgCD / AvgCA
   2. AvgH / AvgD / AvgA
   3. B365CH / B365CD / B365CA
   4. B365H / B365D / B365A
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
   Football-Data Date

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
  seasonCode,
  date,
  homeTeam,
  awayTeam,
}: {
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
    seasonCode,
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
========================================== */

export async function GET(
  request:
    NextRequest,
) {
  try {
    const season =
      request.nextUrl
        .searchParams
        .get(
          "season",
        )
        ?.trim();

    if (
      !season
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "請指定 season，例如 ?season=2024/25",

          supportedSeasons:
            Object.keys(
              SEASON_MAP,
            ),
        },
        {
          status:
            400,
        },
      );
    }

    const config =
      SEASON_MAP[
        season
      ];

    if (
      !config
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            `不支援賽季：${season}`,

          supportedSeasons:
            Object.keys(
              SEASON_MAP,
            ),
        },
        {
          status:
            400,
        },
      );
    }

    console.log(
      "======================================",
    );

    console.log(
      "⚽ Football Historical Import",
    );

    console.log(
      `${LEAGUE} ${season}`,
    );

    console.log(
      `🌐 ${config.csvUrl}`,
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

    const response =
      await fetch(
        config.csvUrl,
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
      return NextResponse.json(
        {
          success:
            false,

          message:
            `Football-Data CSV HTTP ${response.status}`,

          url:
            config.csvUrl,
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
       Parse
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
       Build Rows
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
            seasonCode:
              config.code,

            date:
              matchDate,

            homeTeam,

            awayTeam,
          }),

        league:
          LEAGUE,

        season,

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
      `💰 Odds Complete：${oddsComplete}`,
    );

    console.log(
      `⚠️ Odds Missing：${oddsMissing}`,
    );

    console.log(
      "💰 Odds Sources：",
      oddsSourceCount,
    );

    console.log(
      `⏭️ Skipped：${skipped}`,
    );

    if (
      rows.length ===
      0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "CSV 有下載，但沒有可匯入的已完賽資料",

          csvRows:
            matches.length,

          skipped,
        },
        {
          status:
            400,
        },
      );
    }

       /* ======================================
       STEP 5
       Stable Batch Upsert + Retry
    ====================================== */

    const BATCH_SIZE =
      25;

    const MAX_RETRIES =
      5;

    const sleep = (
      ms: number,
    ) =>
      new Promise<void>(
        (
          resolve,
        ) => {
          setTimeout(
            resolve,
            ms,
          );
        },
      );

    let synced =
      0;

    const totalBatches =
      Math.ceil(
        rows.length /
          BATCH_SIZE,
      );

    console.log(
      "======================================",
    );

    console.log(
      `📥 Import Start：${rows.length} matches`,
    );

    console.log(
      `📦 Batch Size：${BATCH_SIZE}`,
    );

    console.log(
      `📦 Total Batches：${totalBatches}`,
    );

    console.log(
      "======================================",
    );

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

      const batchNumber =
        Math.floor(
          i /
            BATCH_SIZE,
        ) +
        1;

      let batchSuccess =
        false;

      let lastError =
        "";

      for (
        let attempt =
          1;
        attempt <=
          MAX_RETRIES;
        attempt +=
          1
      ) {
        try {
          console.log(
            `📤 Batch ${batchNumber}/${totalBatches}｜Attempt ${attempt}/${MAX_RETRIES}`,
          );

          const {
            error:
              upsertError,
          } =
            await supabase
              .from(
                "football_match_history",
              )
              .upsert(
                batch,
                {
                  onConflict:
                    "external_id",

                  ignoreDuplicates:
                    false,
                },
              );

          if (
            upsertError
          ) {
            throw new Error(
              upsertError.message,
            );
          }

          batchSuccess =
            true;

          synced +=
            batch.length;

          console.log(
            `✅ Batch ${batchNumber}/${totalBatches} Success`,
          );

          console.log(
            `📊 Progress：${synced}/${rows.length}`,
          );

          break;
        } catch (
          error
        ) {
          lastError =
            error instanceof
            Error
              ? error.message
              : String(
                  error,
                );

          console.error(
            `⚠️ Batch ${batchNumber}/${totalBatches} Failed｜Attempt ${attempt}/${MAX_RETRIES}`,
          );

          console.error(
            lastError,
          );

          if (
            attempt <
            MAX_RETRIES
          ) {
            const waitMs =
              attempt *
              3000;

            console.log(
              `⏳ ${waitMs / 1000} 秒後重新連線...`,
            );

            await sleep(
              waitMs,
            );
          }
        }
      }

      if (
        !batchSuccess
      ) {
        console.error(
          `❌ Batch ${batchNumber}/${totalBatches} 最終失敗`,
        );

        return NextResponse.json(
          {
            success:
              false,

            message:
              `Batch ${batchNumber} 在 ${MAX_RETRIES} 次嘗試後仍失敗`,

            error:
              lastError,

            season,

            synced,

            total:
              rows.length,

            batchNumber,

            totalBatches,
          },
          {
            status:
              500,
          },
        );
      }

      /*
       * 每一批成功後稍微休息，
       * 避免連續打 Supabase。
       */
      if (
        batchNumber <
        totalBatches
      ) {
        await sleep(
          500,
        );
      }
    }

    console.log(
      "======================================",
    );

    console.log(
      `✅ All Batches Complete：${synced}/${rows.length}`,
    );

    console.log(
      "======================================",
    );

    /* ======================================
       STEP 6
       Verify
    ====================================== */

    const {
      count,
      error:
        countError,
    } =
      await supabase
        .from(
          "football_match_history",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        )
        .eq(
          "league",
          LEAGUE,
        )
        .eq(
          "season",
          season,
        );

    if (
      countError
    ) {
      console.warn(
        "⚠️ Verify Count Error：",
        countError,
      );
    }

    /* ======================================
       STEP 7
       Complete
    ====================================== */

    console.log(
      "======================================",
    );

    console.log(
      `🎉 ${LEAGUE} ${season} Historical Import Complete`,
    );

    console.log(
      `⚽ Imported：${synced}`,
    );

    console.log(
      `📊 DB Count：${count ?? "unknown"}`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        true,

      league:
        LEAGUE,

      season,

      source:
        SOURCE,

      csvUrl:
        config.csvUrl,

      csvRows:
        matches.length,

      finishedMatches:
        rows.length,

      imported:
        synced,

      databaseCount:
        count ??
        null,

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
            (
              row,
            ) => ({
              externalId:
                row.external_id,

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
  } catch (
    error
  ) {
    console.error(
      "❌ Football Historical Import Error：",
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