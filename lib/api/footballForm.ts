import {
  createClient,
} from "@supabase/supabase-js";

/* ==========================================
   XSI Football Form

   資料來源：
   Supabase
   public.football_match_history

   不再即時呼叫：
   - API-Football
   - football-data.org API
   - Sportmonks

   流程：
   football_match_history
   ↓
   球隊名稱匹配
   ↓
   最近 N 場
   ↓
   W / D / L
   ↓
   GF / GA
   ↓
   Form Score
========================================== */

const HISTORY_FETCH_LIMIT =
  3000;

/* ==========================================
   Types
========================================== */

export type FootballRecentMatch = {
  fixtureId: number;

  date: string;

  homeTeam: {
    id: number;
    name: string;
  };

  awayTeam: {
    id: number;
    name: string;
  };

  homeGoals: number;
  awayGoals: number;

  result:
    | "win"
    | "draw"
    | "loss";

  venue:
    | "home"
    | "away";
};

export type FootballFormStats = {
  teamId:
    number | null;

  teamName:
    string;

  matchesPlayed:
    number;

  wins:
    number;

  draws:
    number;

  losses:
    number;

  goalsFor:
    number;

  goalsAgainst:
    number;

  averageGoalsFor:
    number;

  averageGoalsAgainst:
    number;

  goalDifference:
    number;

  formPoints:
    number;

  formScore:
    number;

  recentMatches:
    FootballRecentMatch[];
};

type FootballHistoryRow = {
  id:
    number;

  external_id:
    string;

  league:
    string;

  season:
    string | null;

  match_date:
    string;

  home_team:
    string;

  away_team:
    string;

  home_score:
    number;

  away_score:
    number;

  status:
    string;

  source:
    string | null;
};

/* ==========================================
   Supabase
========================================== */

function createSupabaseClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env
      .SUPABASE_SECRET_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !supabaseUrl
  ) {
    throw new Error(
      "找不到 NEXT_PUBLIC_SUPABASE_URL",
    );
  }

  if (
    !supabaseKey
  ) {
    throw new Error(
      "找不到 SUPABASE_SECRET_KEY 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return createClient(
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
}

/* ==========================================
   球隊名稱正規化

   Alavés
   →
   alaves

   Deportivo Alavés
   →
   alaves
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
      /\bdeportivo\b/g,
      "",
    )
    .replace(
      /\bathletic club\b/g,
      "athletic",
    )
    .replace(
      /\bclub de futbol\b/g,
      "",
    )
    .replace(
      /\bfc\b/g,
      "",
    )
    .replace(
      /\bafc\b/g,
      "",
    )
    .replace(
      /\bcf\b/g,
      "",
    )
    .replace(
      /\bac\b/g,
      "",
    )
    .replace(
      /\bclub\b/g,
      "",
    )
    .replace(
      /[^a-z0-9]/g,
      "",
    )
    .trim();
}

/* ==========================================
   常見隊名 Alias

   Odds / Football-Data CSV
   名稱有時不同。

   左邊與右邊都會 normalize。
========================================== */

const TEAM_ALIASES:
  Record<
    string,
    string[]
  > = {
  manchesterunited: [
    "manunited",
    "manutd",
  ],

  manchestercity: [
    "mancity",
  ],

  tottenhamhotspur: [
    "tottenham",
    "spurs",
  ],

  wolverhamptonwanderers: [
    "wolves",
    "wolverhampton",
  ],

  brightonandhovealbion: [
    "brighton",
  ],

  westhamunited: [
    "westham",
  ],

  newcastleunited: [
    "newcastle",
  ],

  nottinghamforest: [
    "nottmforest",
  ],

  crystalpalace: [
    "palace",
  ],

  realbetis: [
    "betis",
  ],

  athleticbilbao: [
    "athleticclub",
    "athletic",
  ],

  atleticodeMadrid: [
    "atleticomadrid",
    "atletico",
  ],

  deportivolaves: [
    "alaves",
  ],

  alaves: [
    "deportivoalaves",
  ],

  rayovallecano: [
    "vallecano",
  ],

  realvalladolid: [
    "valladolid",
  ],

  realoviedo: [
    "oviedo",
  ],

  gironafc: [
    "girona",
  ],
};

/* ==========================================
   Alias 清理

   Object key 也重新 normalize，
   避免大小寫或 typo 造成影響。
========================================== */

function getAliasSet(
  name: string,
) {
  const normalized =
    normalizeTeamName(
      name,
    );

  const aliases =
    new Set<string>();

  aliases.add(
    normalized,
  );

  for (
    const [
      key,
      values,
    ]
    of Object.entries(
      TEAM_ALIASES,
    )
  ) {
    const normalizedKey =
      normalizeTeamName(
        key,
      );

    const normalizedValues =
      values.map(
        normalizeTeamName,
      );

    if (
      normalizedKey ===
        normalized ||
      normalizedValues.includes(
        normalized,
      )
    ) {
      aliases.add(
        normalizedKey,
      );

      for (
        const value
        of normalizedValues
      ) {
        aliases.add(
          value,
        );
      }
    }
  }

  return aliases;
}

/* ==========================================
   隊名是否匹配
========================================== */

function teamNamesMatch(
  requestedName:
    string,

  databaseName:
    string,
) {
  const requestedAliases =
    getAliasSet(
      requestedName,
    );

  const databaseNormalized =
    normalizeTeamName(
      databaseName,
    );

  /*
   * Exact / Alias
   */
  if (
    requestedAliases.has(
      databaseNormalized,
    )
  ) {
    return true;
  }

  /*
   * Partial fallback

   * 避免：
   * Alaves
   * Deportivo Alaves
   */
  for (
    const alias
    of requestedAliases
  ) {
    if (
      alias.length <
      5 ||
      databaseNormalized.length <
      5
    ) {
      continue;
    }

    if (
      alias.includes(
        databaseNormalized,
      ) ||
      databaseNormalized.includes(
        alias,
      )
    ) {
      return true;
    }
  }

  return false;
}

/* ==========================================
   產生穩定 Team ID

   football_match_history 沒有 team_id。

   為了保持既有
   FootballRecentMatch 型別相容，
   用隊名產生 deterministic ID。
========================================== */

function createStableTeamId(
  teamName: string,
) {
  const normalized =
    normalizeTeamName(
      teamName,
    );

  let hash =
    0;

  for (
    let i =
      0;
    i <
    normalized.length;
    i +=
      1
  ) {
    hash =
      (
        (
          hash <<
          5
        ) -
        hash
      ) +
      normalized.charCodeAt(
        i,
      );

    hash |=
      0;
  }

  return Math.abs(
    hash,
  );
}

/* ==========================================
   對外保留：
   getFootballTeamId

   現在不再依賴外部 API Team ID。
========================================== */

export async function getFootballTeamId(
  teamName: string,
): Promise<number | null> {
  if (
    !teamName.trim()
  ) {
    return null;
  }

  return createStableTeamId(
    teamName,
  );
}

/* ==========================================
   從 Supabase 取得歷史賽事

   目前資料量仍小，
   一次取最近 3000 場後在 Node 端
   做 normalize + alias matching。

   這樣可以正確處理：
   Alavés ↔ Alaves
========================================== */

async function getFootballHistory() {
  const supabase =
    createSupabaseClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "football_match_history",
      )
      .select(
        [
          "id",
          "external_id",
          "league",
          "season",
          "match_date",
          "home_team",
          "away_team",
          "home_score",
          "away_score",
          "status",
          "source",
        ].join(
          ",",
        ),
      )
      .eq(
        "status",
        "finished",
      )
      .order(
        "match_date",
        {
          ascending:
            false,
        },
      )
      .limit(
        HISTORY_FETCH_LIMIT,
      );

  if (
    error
  ) {
    console.error(
      "❌ football_match_history 查詢失敗：",
      error,
    );

    return [];
  }

  return (
  data ??
  []
) as unknown as FootballHistoryRow[];
}

/* ==========================================
   找指定球隊最近 N 場
========================================== */

async function getTeamHistoryMatches(
  teamName:
    string,

  last:
    number,
) {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        20,
        last,
      ),
    );

  const history =
    await getFootballHistory();

  const matches =
    history
      .filter(
        (match) =>
          teamNamesMatch(
            teamName,
            match.home_team,
          ) ||
          teamNamesMatch(
            teamName,
            match.away_team,
          ),
      )
      .sort(
        (
          a,
          b,
        ) =>
          new Date(
            b.match_date,
          ).getTime() -
          new Date(
            a.match_date,
          ).getTime(),
      )
      .slice(
        0,
        safeLimit,
      );

  console.log(
    `⚽ Supabase Form：${teamName} 找到 ${matches.length} 場`,
  );

  return matches;
}

/* ==========================================
   History Row
   →
   FootballRecentMatch
========================================== */

function mapHistoryToRecentMatch(
  match:
    FootballHistoryRow,

  requestedTeamName:
    string,
): FootballRecentMatch {
  const isHome =
    teamNamesMatch(
      requestedTeamName,
      match.home_team,
    );

  const teamGoals =
    isHome
      ? match.home_score
      : match.away_score;

  const opponentGoals =
    isHome
      ? match.away_score
      : match.home_score;

  let result:
    | "win"
    | "draw"
    | "loss";

  if (
    teamGoals >
    opponentGoals
  ) {
    result =
      "win";
  } else if (
    teamGoals ===
    opponentGoals
  ) {
    result =
      "draw";
  } else {
    result =
      "loss";
  }

  return {
    fixtureId:
      match.id,

    date:
      match.match_date,

    homeTeam: {
      id:
        createStableTeamId(
          match.home_team,
        ),

      name:
        match.home_team,
    },

    awayTeam: {
      id:
        createStableTeamId(
          match.away_team,
        ),

      name:
        match.away_team,
    },

    homeGoals:
      match.home_score,

    awayGoals:
      match.away_score,

    result,

    venue:
      isHome
        ? "home"
        : "away",
  };
}

/* ==========================================
   對外：
   最近 N 場
========================================== */

export async function getFootballRecentMatches(
  teamName:
    string,

  last =
    5,
): Promise<FootballRecentMatch[]> {
  try {
    const matches =
      await getTeamHistoryMatches(
        teamName,
        last,
      );

    return matches.map(
      (match) =>
        mapHistoryToRecentMatch(
          match,
          teamName,
        ),
    );
  } catch (error) {
    console.error(
      `❌ ${teamName} 最近賽事取得失敗：`,
      error,
    );

    return [];
  }
}

/* ==========================================
   Form Score

   沿用原本 XSI 算法：

   戰績：
   最大 60

   Goal Difference：
   -20 ～ +20

   Base：
   20
========================================== */

function calculateFormScore({
  matchesPlayed,
  formPoints,
  goalsFor,
  goalsAgainst,
}: {
  matchesPlayed:
    number;

  formPoints:
    number;

  goalsFor:
    number;

  goalsAgainst:
    number;
}) {
  if (
    matchesPlayed ===
    0
  ) {
    /*
     * 只為了保持舊 interface。
     *
     * XSI 必須看：
     * matchesPlayed === 0
     *
     * 不能把 50 當成真正 Form。
     */
    return 50;
  }

  const maxPoints =
    matchesPlayed *
    3;

  const pointsRate =
    formPoints /
    maxPoints;

  const resultScore =
    pointsRate *
    60;

  const goalDifference =
    goalsFor -
    goalsAgainst;

  const goalDifferenceScore =
    Math.max(
      -20,
      Math.min(
        20,
        goalDifference *
          4,
      ),
    );

  const raw =
    20 +
    resultScore +
    goalDifferenceScore;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        raw,
      ),
    ),
  );
}

/* ==========================================
   Empty Form
========================================== */

function createEmptyForm(
  teamName:
    string,
): FootballFormStats {
  return {
    teamId:
      createStableTeamId(
        teamName,
      ),

    teamName,

    matchesPlayed:
      0,

    wins:
      0,

    draws:
      0,

    losses:
      0,

    goalsFor:
      0,

    goalsAgainst:
      0,

    averageGoalsFor:
      0,

    averageGoalsAgainst:
      0,

    goalDifference:
      0,

    formPoints:
      0,

    formScore:
      50,

    recentMatches:
      [],
  };
}

/* ==========================================
   完整 Form Stats
========================================== */

export async function getFootballFormStats(
  teamName:
    string,

  last =
    5,
): Promise<FootballFormStats> {
  try {
    const recentMatches =
      await getFootballRecentMatches(
        teamName,
        last,
      );

    if (
      recentMatches.length ===
      0
    ) {
      console.warn(
        `⚠️ ${teamName} 沒有可用歷史 Form 資料`,
      );

      return createEmptyForm(
        teamName,
      );
    }

    let wins =
      0;

    let draws =
      0;

    let losses =
      0;

    let goalsFor =
      0;

    let goalsAgainst =
      0;

    let formPoints =
      0;

    for (
      const match
      of recentMatches
    ) {
      const isHome =
        match.venue ===
        "home";

      const teamGoals =
        isHome
          ? match.homeGoals
          : match.awayGoals;

      const opponentGoals =
        isHome
          ? match.awayGoals
          : match.homeGoals;

      goalsFor +=
        teamGoals;

      goalsAgainst +=
        opponentGoals;

      if (
        match.result ===
        "win"
      ) {
        wins +=
          1;

        formPoints +=
          3;
      } else if (
        match.result ===
        "draw"
      ) {
        draws +=
          1;

        formPoints +=
          1;
      } else {
        losses +=
          1;
      }
    }

    const matchesPlayed =
      recentMatches.length;

    const averageGoalsFor =
      matchesPlayed >
      0
        ? Number(
            (
              goalsFor /
              matchesPlayed
            ).toFixed(
              2,
            ),
          )
        : 0;

    const averageGoalsAgainst =
      matchesPlayed >
      0
        ? Number(
            (
              goalsAgainst /
              matchesPlayed
            ).toFixed(
              2,
            ),
          )
        : 0;

    const goalDifference =
      goalsFor -
      goalsAgainst;

    const formScore =
      calculateFormScore({
        matchesPlayed,

        formPoints,

        goalsFor,

        goalsAgainst,
      });

    console.log(
      "======================================",
    );

    console.log(
      `⚽ ${teamName} Form｜Supabase`,
    );

    console.log(
      `最近 ${matchesPlayed} 場：${wins}勝 ${draws}和 ${losses}敗`,
    );

    console.log(
      `GF ${goalsFor}｜GA ${goalsAgainst}`,
    );

    console.log(
      `場均 GF ${averageGoalsFor}｜GA ${averageGoalsAgainst}`,
    );

    console.log(
      `🔥 Form Score：${formScore}`,
    );

    console.log(
      "======================================",
    );

    return {
      teamId:
        createStableTeamId(
          teamName,
        ),

      teamName,

      matchesPlayed,

      wins,

      draws,

      losses,

      goalsFor,

      goalsAgainst,

      averageGoalsFor,

      averageGoalsAgainst,

      goalDifference,

      formPoints,

      formScore,

      recentMatches,
    };
  } catch (error) {
    console.error(
      `❌ ${teamName} Form 計算失敗：`,
      error,
    );

    return createEmptyForm(
      teamName,
    );
  }
}

/* ==========================================
   主客隊一次取得
========================================== */

export async function getFootballGameForm(
  homeTeam:
    string,

  awayTeam:
    string,
) {
  const [
    home,
    away,
  ] =
    await Promise.all([
      getFootballFormStats(
        homeTeam,
        5,
      ),

      getFootballFormStats(
        awayTeam,
        5,
      ),
    ]);

  return {
    home,
    away,
  };
}