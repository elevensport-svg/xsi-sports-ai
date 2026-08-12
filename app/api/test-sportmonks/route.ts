import {
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

const BASE_URL =
  "https://api.sportmonks.com/v3/football";

type SportmonksTeam = {
  id: number;
  name: string;
  short_code?: string | null;
  country_id?: number | null;
};

type SportmonksFixture = {
  id: number;
  league_id: number;
  season_id: number;
  state_id: number;
  starting_at: string;
  name?: string;
};

/* ==========================================
   Sportmonks Fetch
========================================== */

async function sportmonksFetch(
  path: string,
) {
  const token =
    process.env
      .SPORTMONKS_API_TOKEN;

  if (!token) {
    throw new Error(
      "找不到 SPORTMONKS_API_TOKEN",
    );
  }

  const separator =
    path.includes("?")
      ? "&"
      : "?";

  const url =
    `${BASE_URL}${path}` +
    `${separator}api_token=${encodeURIComponent(
      token,
    )}`;

  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      `❌ Sportmonks HTTP ${response.status}`,
      data,
    );

    return {
      ok:
        false,

      status:
        response.status,

      data,
    };
  }

  return {
    ok:
      true,

    status:
      response.status,

    data,
  };
}

/* ==========================================
   正規化隊名
========================================== */

function normalizeTeamName(
  name: string,
) {
  return name
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /\bfootball club\b/g,
      "",
    )
    .replace(
      /\bfc\b/g,
      "",
    )
    .replace(
      /\bcf\b/g,
      "",
    )
    .replace(
      /\bdeportivo\b/g,
      "",
    )
    .replace(
      /[^a-z0-9]/g,
      "",
    )
    .trim();
}

/* ==========================================
   搜尋球隊
========================================== */

async function searchTeam(
  teamName: string,
) {
  console.log(
    "--------------------------------------",
  );

  console.log(
    `🔎 搜尋球隊：${teamName}`,
  );

  /*
   * Sportmonks team search
   */
  const result =
    await sportmonksFetch(
      `/teams/search/${encodeURIComponent(
        teamName,
      )}`,
    );

  if (!result.ok) {
    console.log(
      `❌ ${teamName} 搜尋 API 失敗`,
    );

    return {
      requestedName:
        teamName,

      found:
        false,

      reason:
        `HTTP ${result.status}`,

      team:
        null,

      fixtureAccess:
        false,

      fixtures:
        [],
    };
  }

  const teams:
    SportmonksTeam[] =
    Array.isArray(
      result.data?.data,
    )
      ? result.data.data
      : [];

  console.log(
    `搜尋結果：${teams.length} 支`,
  );

  if (
    teams.length ===
    0
  ) {
    console.log(
      `❌ ${teamName} 找不到`,
    );

    return {
      requestedName:
        teamName,

      found:
        false,

      reason:
        "搜尋結果為 0",

      team:
        null,

      fixtureAccess:
        false,

      fixtures:
        [],
    };
  }

  const target =
    normalizeTeamName(
      teamName,
    );

  /*
   * 優先完全匹配
   */
  let matched =
    teams.find(
      (team) =>
        normalizeTeamName(
          team.name,
        ) ===
        target,
    );

  /*
   * 第二層互相包含
   */
  if (!matched) {
    matched =
      teams.find(
        (team) => {
          const candidate =
            normalizeTeamName(
              team.name,
            );

          return (
            candidate.includes(
              target,
            ) ||
            target.includes(
              candidate,
            )
          );
        },
      );
  }

  /*
   * 最後只用第一筆做測試
   */
  if (!matched) {
    matched =
      teams[0];
  }

  console.log(
    `⚽ Match：${teamName} → ${matched.name} (${matched.id})`,
  );

  /* ========================================
     測試該 Team Fixtures 權限
  ======================================== */

  const fixtureResult =
    await sportmonksFetch(
      `/fixtures?filter=participantSearch:${matched.id}`,
    );

  if (
    !fixtureResult.ok
  ) {
    console.log(
      `⚠️ ${matched.name} 找得到球隊，但 Fixtures 無法存取`,
    );

    return {
      requestedName:
        teamName,

      found:
        true,

      reason:
        "Team found, fixtures unavailable",

      team: {
        id:
          matched.id,

        name:
          matched.name,
      },

      fixtureAccess:
        false,

      fixtures:
        [],
    };
  }

  const fixtures:
    SportmonksFixture[] =
    Array.isArray(
      fixtureResult.data
        ?.data,
    )
      ? fixtureResult.data.data
      : [];

  console.log(
    `📊 Fixtures 回傳：${fixtures.length} 場`,
  );

  return {
    requestedName:
      teamName,

    found:
      true,

    reason:
      fixtures.length >
      0
        ? "OK"
        : "Team found but fixtures = 0",

    team: {
      id:
        matched.id,

      name:
        matched.name,
    },

    fixtureAccess:
      fixtures.length >
      0,

    fixtures:
      fixtures
        .slice(
          0,
          5,
        )
        .map(
          (
            fixture,
          ) => ({
            id:
              fixture.id,

            leagueId:
              fixture.league_id,

            seasonId:
              fixture.season_id,

            stateId:
              fixture.state_id,

            startingAt:
              fixture.starting_at,

            name:
              fixture.name,
          }),
        ),
  };
}

/* ==========================================
   GET
========================================== */

export async function GET() {
  try {
    console.log(
      "======================================",
    );

    console.log(
      "🧪 Sportmonks 西甲權限測試",
    );

    /*
     * 故意分開測，
     * Terminal 比較容易看。
     */
    const alaves =
      await searchTeam(
        "Alavés",
      );

    const getafe =
      await searchTeam(
        "Getafe",
      );

    console.log(
      "======================================",
    );

    console.log(
      "📋 測試結果",
    );

    console.log(
      `Alavés：Team ${
        alaves.found
          ? "✅"
          : "❌"
      }｜Fixtures ${
        alaves.fixtureAccess
          ? "✅"
          : "❌"
      }`,
    );

    console.log(
      `Getafe：Team ${
        getafe.found
          ? "✅"
          : "❌"
      }｜Fixtures ${
        getafe.fixtureAccess
          ? "✅"
          : "❌"
      }`,
    );

    console.log(
      "======================================",
    );

    return NextResponse.json({
      success:
        true,

      tests: {
        alaves,
        getafe,
      },
    });
  } catch (error) {
    console.error(
      "❌ Sportmonks 測試失敗：",
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