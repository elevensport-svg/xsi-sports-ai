import {
  createAdminClient,
} from "../supabase/admin";

import {
  getFootballHistoryTeamName,
} from "../football/team-aliases";

type PendingFootballPrediction = {
  id: string;
  game_pk: string;
  home_team: string;
  away_team: string;
  prediction: string;
  result:
    string | null;
  created_at: string;

  commence_time?:
    string | null;
};

type FinishedFootballMatch = {
  id:
    string | number;

  league:
    string;

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
};

export type FootballSettlementResult = {
  pending: number;
  matched: number;
  settled: number;
  wins: number;
  losses: number;
  pushes: number;
  notFound: number;
  unsupported: number;
  futureGames: number;
  missingSchedule: number;

  details: Array<{
    id: string;
    gamePk: string;
    homeTeam: string;
    awayTeam: string;
    prediction: string;
    score?: string;
    result?:
      | "win"
      | "loss"
      | "push";
    message: string;
  }>;
};

function normalize(
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
      /[^a-z0-9]/g,
      "",
    );
}

function isSameTeam(
  predictionName:
    string,
  historyName:
    string,
) {
  return (
    normalize(
      getFootballHistoryTeamName(
        predictionName,
      ),
    ) ===
    normalize(
      historyName,
    )
  );
}

function parseSpread(
  prediction:
    string,
) {
  const match =
    prediction.match(
      /(讓球|受讓)\s*([+-]?\d+(?:\.\d+)?)/,
    );

  if (
    !match
  ) {
    return null;
  }

  const spread =
    Number(
      match[2],
    );

  if (
    !Number.isFinite(
      spread,
    )
  ) {
    return null;
  }

  return {
    kind:
      match[1] as
        | "讓球"
        | "受讓",

    spread,
  };
}

function settlePrediction({
  prediction,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
}: {
  prediction:
    string;

  homeTeam:
    string;

  awayTeam:
    string;

  homeScore:
    number;

  awayScore:
    number;
}):
  | "win"
  | "loss"
  | "push"
  | null {
  const text =
    prediction.trim();

  /*
   * 1X2
   */
  if (
    text.includes(
      "和局",
    )
  ) {
    return homeScore ===
      awayScore
      ? "win"
      : "loss";
  }

  if (
    text.includes(
      "主勝",
    )
  ) {
    return homeScore >
      awayScore
      ? "win"
      : "loss";
  }

  if (
    text.includes(
      "客勝",
    )
  ) {
    return awayScore >
      homeScore
      ? "win"
      : "loss";
  }

  /*
   * Spread
   *
   * 推薦文字格式目前為：
   * Team 受讓 +0.5
   * Team 讓球 -0.5
   */
  const parsedSpread =
    parseSpread(
      text,
    );

  if (
    !parsedSpread
  ) {
    return null;
  }

  const homeKey =
    normalize(
      homeTeam,
    );

  const awayKey =
    normalize(
      awayTeam,
    );

  const predictionKey =
    normalize(
      text,
    );

  let selectedScore:
    number;

  let opponentScore:
    number;

  if (
    predictionKey.includes(
      homeKey,
    )
  ) {
    selectedScore =
      homeScore;

    opponentScore =
      awayScore;
  } else if (
    predictionKey.includes(
      awayKey,
    )
  ) {
    selectedScore =
      awayScore;

    opponentScore =
      homeScore;
  } else {
    /*
     * 如果 API 名稱跟歷史名稱不同，
     * 再用 Alias 後名稱判斷。
     */
    const aliasedHomeKey =
      normalize(
        getFootballHistoryTeamName(
          homeTeam,
        ),
      );

    const aliasedAwayKey =
      normalize(
        getFootballHistoryTeamName(
          awayTeam,
        ),
      );

    if (
      predictionKey.includes(
        aliasedHomeKey,
      )
    ) {
      selectedScore =
        homeScore;

      opponentScore =
        awayScore;
    } else if (
      predictionKey.includes(
        aliasedAwayKey,
      )
    ) {
      selectedScore =
        awayScore;

      opponentScore =
        homeScore;
    } else {
      return null;
    }
  }

  const adjusted =
    selectedScore +
    parsedSpread.spread;

  if (
    adjusted >
    opponentScore
  ) {
    return "win";
  }

  if (
    adjusted <
    opponentScore
  ) {
    return "loss";
  }

  return "push";
}


function getCandidateTeamNames(
  teamName: string,
  rows: FinishedFootballMatch[],
  side:
    | "home"
    | "away",
) {
  const normalizedRequested =
    normalize(
      getFootballHistoryTeamName(
        teamName,
      ),
    );

  const candidates =
    new Map<
      string,
      number
    >();

  for (
    const row
    of rows
  ) {
    const value =
      side ===
      "home"
        ? row.home_team
        : row.away_team;

    const normalizedValue =
      normalize(
        value,
      );

    let score =
      0;

    if (
      normalizedValue ===
      normalizedRequested
    ) {
      score =
        100;
    } else if (
      normalizedValue.includes(
        normalizedRequested,
      ) ||
      normalizedRequested.includes(
        normalizedValue,
      )
    ) {
      score =
        80;
    } else {
      const requestedTokens =
        new Set(
          teamName
            .toLowerCase()
            .split(
              /[^a-z0-9]+/,
            )
            .filter(
              Boolean,
            ),
        );

      const valueTokens =
        new Set(
          value
            .toLowerCase()
            .split(
              /[^a-z0-9]+/,
            )
            .filter(
              Boolean,
            ),
        );

      let overlap =
        0;

      for (
        const token
        of requestedTokens
      ) {
        if (
          valueTokens.has(
            token,
          )
        ) {
          overlap +=
            1;
        }
      }

      score =
        overlap;
    }

    const current =
      candidates.get(
        value,
      ) ??
      0;

    candidates.set(
      value,
      Math.max(
        current,
        score,
      ),
    );
  }

  return Array.from(
    candidates.entries(),
  )
    .sort(
      (
        a,
        b,
      ) =>
        b[1] -
        a[1] ||
        a[0].localeCompare(
          b[0],
        ),
    )
    .slice(
      0,
      5,
    )
    .map(
      (
        [
          name,
          score,
        ],
      ) =>
        `${name} (${score})`,
    );
}

async function findFinishedMatch({
  supabase,
  prediction,
}: {
  supabase:
    ReturnType<
      typeof createAdminClient
    >;

  prediction:
    PendingFootballPrediction;
}) {
  /*
   * 結算必須以真正的比賽開賽時間 commence_time 為準，
   * 不能使用 prediction.created_at。
   */
  if (
    !prediction.commence_time
  ) {
    return {
      matched:
        null,

      diagnostics: {
        searchStart:
          "",

        searchEnd:
          "",

        finishedRows:
          0,

        requestedHome:
          prediction.home_team,

        requestedAway:
          prediction.away_team,

        normalizedHome:
          normalize(
            getFootballHistoryTeamName(
              prediction.home_team,
            ),
          ),

        normalizedAway:
          normalize(
            getFootballHistoryTeamName(
              prediction.away_team,
            ),
          ),

        homeCandidates:
          [],

        awayCandidates:
          [],
      },
    };
  }

  const kickoff =
    new Date(
      prediction.commence_time,
    );

  const searchStart =
    new Date(
      kickoff.getTime() -
        12 *
        60 *
        60 *
        1000,
    );

  const searchEnd =
    new Date(
      kickoff.getTime() +
        36 *
        60 *
        60 *
        1000,
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "football_match_history",
      )
      .select(
        `
          id,
          league,
          match_date,
          home_team,
          away_team,
          home_score,
          away_score,
          status
        `,
      )
      .eq(
        "status",
        "finished",
      )
      .gte(
        "match_date",
        searchStart
          .toISOString(),
      )
      .lte(
        "match_date",
        searchEnd
          .toISOString(),
      )
      .order(
        "match_date",
        {
          ascending:
            true,
        },
      );

  if (
    error
  ) {
    throw new Error(
      `讀取 football_match_history 失敗：${error.message}`,
    );
  }

  const rows =
    (
      data ??
      []
    ) as FinishedFootballMatch[];

  const matched =
    rows.find(
      (
        row,
      ) =>
        isSameTeam(
          prediction.home_team,
          row.home_team,
        ) &&
        isSameTeam(
          prediction.away_team,
          row.away_team,
        ),
    ) ??
    null;

  return {
    matched,

    diagnostics: {
      searchStart:
        searchStart.toISOString(),

      searchEnd:
        searchEnd.toISOString(),

      finishedRows:
        rows.length,

      requestedHome:
        prediction.home_team,

      requestedAway:
        prediction.away_team,

      normalizedHome:
        normalize(
          getFootballHistoryTeamName(
            prediction.home_team,
          ),
        ),

      normalizedAway:
        normalize(
          getFootballHistoryTeamName(
            prediction.away_team,
          ),
        ),

      homeCandidates:
        getCandidateTeamNames(
          prediction.home_team,
          rows,
          "home",
        ),

      awayCandidates:
        getCandidateTeamNames(
          prediction.away_team,
          rows,
          "away",
        ),
    },
  };
}

export async function settleFootballPredictions(): Promise<FootballSettlementResult> {
  const supabase =
    createAdminClient();

  const {
    data:
      pendingData,

    error:
      pendingError,
  } =
    await supabase
      .from(
        "prediction_history",
      )
      .select(
        `
          id,
          game_pk,
          home_team,
          away_team,
          prediction,
          result,
          created_at
        `,
      )
      .eq(
        "sport",
        "FOOTBALL",
      )
      .or(
        "result.is.null,result.eq.pending",
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        },
      );

  if (
    pendingError
  ) {
    throw new Error(
      `讀取足球 pending 預測失敗：${pendingError.message}`,
    );
  }

  const pendingRows =
    (
      pendingData ??
      []
    ) as PendingFootballPrediction[];

  /*
   * ==========================================
   * 取得真正賽事開賽時間
   * ==========================================
   */
  const gamePks =
    Array.from(
      new Set(
        pendingRows.map(
          (item) =>
            String(
              item.game_pk,
            ),
        ),
      ),
    );

  const scheduleMap =
    new Map<
      string,
      string
    >();

  if (
    gamePks.length >
    0
  ) {
    const {
      data:
        scheduleData,

      error:
        scheduleError,
    } =
      await supabase
        .from(
          "football_schedule",
        )
        .select(
          "id, commence_time",
        )
        .in(
          "id",
          gamePks,
        );

    if (
      scheduleError
    ) {
      throw new Error(
        `讀取 football_schedule 失敗：${scheduleError.message}`,
      );
    }

    for (
      const row
      of scheduleData ??
      []
    ) {
      if (
        row.id &&
        row.commence_time
      ) {
        scheduleMap.set(
          String(
            row.id,
          ),
          String(
            row.commence_time,
          ),
        );
      }
    }
  }

  for (
    const item
    of pendingRows
  ) {
    item.commence_time =
      scheduleMap.get(
        String(
          item.game_pk,
        ),
      ) ??
      null;
  }

  const summary:
    FootballSettlementResult = {
    pending:
      pendingRows.length,

    matched:
      0,

    settled:
      0,

    wins:
      0,

    losses:
      0,

    pushes:
      0,

    notFound:
      0,

    unsupported:
      0,

    futureGames:
      0,

    missingSchedule:
      0,

    details:
      [],
  };

  for (
    const prediction
    of pendingRows
  ) {
    if (
      !prediction.commence_time
    ) {
      summary.missingSchedule +=
        1;

      summary.details.push({
        id:
          prediction.id,

        gamePk:
          prediction.game_pk,

        homeTeam:
          prediction.home_team,

        awayTeam:
          prediction.away_team,

        prediction:
          prediction.prediction,

        message:
          "找不到 football_schedule 開賽時間",
      });

      continue;
    }

    const kickoff =
      new Date(
        prediction.commence_time,
      );

    /*
     * 足球比賽通常約 2 小時。
     * 開賽後 3 小時才進入結算，避免比賽進行中誤判。
     */
    const settlementReadyAt =
      new Date(
        kickoff.getTime() +
          3 *
          60 *
          60 *
          1000,
      );

    if (
      settlementReadyAt.getTime() >
      Date.now()
    ) {
      summary.futureGames +=
        1;

      continue;
    }

    const matchResult =
      await findFinishedMatch({
        supabase,
        prediction,
      });

    const match =
      matchResult.matched;

    if (
      !match
    ) {
      summary.notFound +=
        1;

      if (
        summary.notFound <=
        10
      ) {
        console.log(
          "======================================",
        );

        console.log(
          "🔎 FOOTBALL SETTLEMENT DIAGNOSTIC",
        );

        console.log(
          `Game PK：${prediction.game_pk}`,
        );

        console.log(
          `預測建立：${prediction.created_at}`,
        );

        console.log(
          `實際開賽：${prediction.commence_time}`,
        );

        console.log(
          `主隊：${prediction.home_team}`,
        );

        console.log(
          `客隊：${prediction.away_team}`,
        );

        console.log(
          `搜尋開始：${matchResult.diagnostics.searchStart}`,
        );

        console.log(
          `搜尋結束：${matchResult.diagnostics.searchEnd}`,
        );

        console.log(
          `日期範圍 finished：${matchResult.diagnostics.finishedRows} 場`,
        );

        console.log(
          `主隊正規化：${matchResult.diagnostics.normalizedHome}`,
        );

        console.log(
          `客隊正規化：${matchResult.diagnostics.normalizedAway}`,
        );

        console.log(
          `主隊候選：${
            matchResult.diagnostics.homeCandidates.length > 0
              ? matchResult.diagnostics.homeCandidates.join("｜")
              : "無"
          }`,
        );

        console.log(
          `客隊候選：${
            matchResult.diagnostics.awayCandidates.length > 0
              ? matchResult.diagnostics.awayCandidates.join("｜")
              : "無"
          }`,
        );

        console.log(
          "======================================",
        );
      }

      summary.details.push({
        id:
          prediction.id,

        gamePk:
          prediction.game_pk,

        homeTeam:
          prediction.home_team,

        awayTeam:
          prediction.away_team,

        prediction:
          prediction.prediction,

        message:
          "尚未找到已完賽比分",
      });

      continue;
    }

    summary.matched +=
      1;

    const settlement =
      settlePrediction({
        prediction:
          prediction.prediction,

        homeTeam:
          prediction.home_team,

        awayTeam:
          prediction.away_team,

        homeScore:
          match.home_score,

        awayScore:
          match.away_score,
      });

    if (
      !settlement
    ) {
      summary.unsupported +=
        1;

      summary.details.push({
        id:
          prediction.id,

        gamePk:
          prediction.game_pk,

        homeTeam:
          prediction.home_team,

        awayTeam:
          prediction.away_team,

        prediction:
          prediction.prediction,

        score:
          `${match.away_score}-${match.home_score}`,

        message:
          "無法辨識推薦格式，未結算",
      });

      continue;
    }

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "prediction_history",
        )
        .update({
          result:
            settlement,
        })
        .eq(
          "id",
          prediction.id,
        );

    if (
      updateError
    ) {
      throw new Error(
        `更新足球結算失敗 ${prediction.id}：${updateError.message}`,
      );
    }

    summary.settled +=
      1;

    if (
      settlement ===
      "win"
    ) {
      summary.wins +=
        1;
    } else if (
      settlement ===
      "loss"
    ) {
      summary.losses +=
        1;
    } else {
      summary.pushes +=
        1;
    }

    summary.details.push({
      id:
        prediction.id,

      gamePk:
        prediction.game_pk,

      homeTeam:
        prediction.home_team,

      awayTeam:
        prediction.away_team,

      prediction:
        prediction.prediction,

      score:
        `${match.away_score}-${match.home_score}`,

      result:
        settlement,

      message:
        `結算完成：${settlement}`,
    });

    console.log(
      `⚽ FOOTBALL SETTLED：${prediction.away_team} ${match.away_score}-${match.home_score} ${prediction.home_team}｜${prediction.prediction}｜${settlement}`,
    );
  }

  console.log(
    "======================================",
  );

  console.log(
    "⚽ FOOTBALL SETTLEMENT COMPLETE",
  );

  console.log(
    `Pending：${summary.pending}`,
  );

  console.log(
    `Matched：${summary.matched}`,
  );

  console.log(
    `Settled：${summary.settled}`,
  );

  console.log(
    `Win：${summary.wins}`,
  );

  console.log(
    `Loss：${summary.losses}`,
  );

  console.log(
    `Push：${summary.pushes}`,
  );

  console.log(
    `Not Found：${summary.notFound}`,
  );

  console.log(
    `Unsupported：${summary.unsupported}`,
  );

  console.log(
    `Future / Not Ready：${summary.futureGames}`,
  );

  console.log(
    `Missing Schedule：${summary.missingSchedule}`,
  );

  console.log(
    "======================================",
  );

  return summary;
}