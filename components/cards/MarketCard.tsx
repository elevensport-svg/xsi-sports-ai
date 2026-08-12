"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  MarketBookmaker,
  MarketOutcome,
  MlbMarketData,
} from "../../lib/api/market";

import type {
  MarketScoreResult,
  MarketSideScore,
} from "../../lib/xsi/market";

type Props = {
  market: MlbMarketData | null;
  scores: MarketScoreResult;
};

type OddsFormat =
  | "decimal"
  | "hongkong"
  | "american";

type BookmakerRow = {
  bookmaker: MarketBookmaker;
  awayMoneyline: MarketOutcome | null;
  homeMoneyline: MarketOutcome | null;
  awaySpread: MarketOutcome | null;
  homeSpread: MarketOutcome | null;
  over: MarketOutcome | null;
  under: MarketOutcome | null;
};

const BOOKMAKER_PRIORITY = [
  "pinnacle",
  "draftkings",
  "fanduel",
  "betmgm",
  "betrivers",
  "caesars",
  "williamhill_us",
  "bovada",
];

/* ==========================================
   賠率格式
========================================== */

function americanToDecimal(
  american: number,
): number {
  if (american > 0) {
    return (
      1 +
      american / 100
    );
  }

  if (american < 0) {
    return (
      1 +
      100 /
        Math.abs(
          american,
        )
    );
  }

  return 1;
}

function formatOdds(
  value:
    | number
    | null
    | undefined,
  format: OddsFormat,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "--";
  }

  /* 美國盤 */
  if (
    format === "american"
  ) {
    return value > 0
      ? `+${value}`
      : String(value);
  }

  const decimal =
    americanToDecimal(
      value,
    );

  /* 香港盤 */
  if (
    format === "hongkong"
  ) {
    return (
      decimal - 1
    ).toFixed(2);
  }

  /* 歐洲盤 */
  return decimal.toFixed(2);
}

function getOddsFormatLabel(
  format: OddsFormat,
): string {
  if (
    format === "hongkong"
  ) {
    return "香港盤";
  }

  if (
    format === "american"
  ) {
    return "美國盤 American";
  }

  return "歐洲盤 Decimal";
}

/* ==========================================
   讓分 / 時間
========================================== */

function formatPoint(
  value:
    | number
    | null
    | undefined,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "--";
  }

  return value > 0
    ? `+${value}`
    : String(value);
}

function formatTaiwanTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "--";
  }

  return new Intl.DateTimeFormat(
    "zh-TW",
    {
      timeZone:
        "Asia/Taipei",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(date);
}

/* ==========================================
   Market Helpers
========================================== */

function findTeamOutcome(
  outcomes: MarketOutcome[],
  teamName: string,
): MarketOutcome | null {
  return (
    outcomes.find(
      (outcome) =>
        outcome.name.toLowerCase() ===
        teamName.toLowerCase(),
    ) ?? null
  );
}

function findTotalOutcome(
  outcomes: MarketOutcome[],
  side:
    | "over"
    | "under",
): MarketOutcome | null {
  return (
    outcomes.find(
      (outcome) =>
        outcome.name.toLowerCase() ===
        side,
    ) ?? null
  );
}

function getPriority(
  bookmaker: MarketBookmaker,
): number {
  const priority =
    BOOKMAKER_PRIORITY.indexOf(
      bookmaker.key,
    );

  return priority === -1
    ? BOOKMAKER_PRIORITY.length
    : priority;
}

function buildBookmakerRows(
  market: MlbMarketData,
): BookmakerRow[] {
  return [
    ...market.bookmakers,
  ]
    .sort((a, b) => {
      const priorityDifference =
        getPriority(a) -
        getPriority(b);

      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }

      return a.title.localeCompare(
        b.title,
      );
    })
    .map(
      (bookmaker) => ({
        bookmaker,

        awayMoneyline:
          findTeamOutcome(
            bookmaker.moneyline,
            market.awayTeam,
          ),

        homeMoneyline:
          findTeamOutcome(
            bookmaker.moneyline,
            market.homeTeam,
          ),

        awaySpread:
          findTeamOutcome(
            bookmaker.spreads,
            market.awayTeam,
          ),

        homeSpread:
          findTeamOutcome(
            bookmaker.spreads,
            market.homeTeam,
          ),

        over:
          findTotalOutcome(
            bookmaker.totals,
            "over",
          ),

        under:
          findTotalOutcome(
            bookmaker.totals,
            "under",
          ),
      }),
    );
}

function getBestPrice(
  outcomes: Array<
    MarketOutcome | null
  >,
): number | null {
  const prices =
    outcomes
      .map(
        (outcome) =>
          outcome?.price,
      )
      .filter(
        (
          price,
        ): price is number =>
          typeof price ===
          "number",
      );

  if (
    prices.length === 0
  ) {
    return null;
  }

  return Math.max(
    ...prices,
  );
}

/* ==========================================
   Odds Components
========================================== */

function OddsValue({
  value,
  format,
  isBest = false,
}: {
  value:
    | number
    | null
    | undefined;
  format: OddsFormat;
  isBest?: boolean;
}) {
  return (
    <span
      className={
        isBest
          ? "inline-flex rounded-md bg-yellow-400 px-2 py-1 font-black text-black"
          : "font-bold text-white"
      }
    >
      {formatOdds(
        value,
        format,
      )}
    </span>
  );
}

function SpreadValue({
  outcome,
  format,
}: {
  outcome:
    | MarketOutcome
    | null;
  format: OddsFormat;
}) {
  if (!outcome) {
    return (
      <span className="text-zinc-600">
        --
      </span>
    );
  }

  return (
    <div>
      <p className="font-bold text-white">
        {formatPoint(
          outcome.point,
        )}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {formatOdds(
          outcome.price,
          format,
        )}
      </p>
    </div>
  );
}

function TotalValue({
  outcome,
  label,
  format,
}: {
  outcome:
    | MarketOutcome
    | null;
  label: string;
  format: OddsFormat;
}) {
  if (!outcome) {
    return (
      <span className="text-zinc-600">
        --
      </span>
    );
  }

  return (
    <div>
      <p className="font-bold text-white">
        {label}{" "}
        {outcome.point ??
          "--"}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {formatOdds(
          outcome.price,
          format,
        )}
      </p>
    </div>
  );
}

/* ==========================================
   XSI Score
========================================== */

function ScoreBox({
  label,
  score,
}: {
  label: string;
  score: MarketSideScore;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-4xl font-black text-yellow-400">
            {score.score}
          </p>

          <p className="mt-1 text-sm text-zinc-400">
            {score.grade}
          </p>
        </div>

        <div className="md:text-right">
          {score.reasons.map(
            (reason) => (
              <p
                key={
                  reason
                }
                className="mt-1 text-xs text-zinc-500"
              >
                • {reason}
              </p>
            ),
          )}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-yellow-400"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                score.score,
              ),
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ==========================================
   Consensus
========================================== */

function ConsensusCard({
  label,
  awayTeam,
  homeTeam,
  awayValue,
  homeValue,
  formatValue,
}: {
  label: string;
  awayTeam: string;
  homeTeam: string;
  awayValue:
    | number
    | null;
  homeValue:
    | number
    | null;
  formatValue: (
    value:
      | number
      | null,
  ) => string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </p>

      <div className="mt-4 space-y-4">

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-400">
            {awayTeam}
          </span>

          <span className="text-xl font-black text-white">
            {formatValue(
              awayValue,
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-400">
            {homeTeam}
          </span>

          <span className="text-xl font-black text-white">
            {formatValue(
              homeValue,
            )}
          </span>
        </div>

      </div>
    </div>
  );
}

/* ==========================================
   MARKET CARD
========================================== */

export default function MarketCard({
  market,
  scores,
}: Props) {
  const [
    oddsFormat,
    setOddsFormat,
  ] =
    useState<OddsFormat>(
      "decimal",
    );

  const [
    loaded,
    setLoaded,
  ] = useState(false);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          "xsi-settings",
        );

      if (stored) {
        const settings =
          JSON.parse(
            stored,
          );

        if (
          settings.oddsFormat ===
            "decimal" ||
          settings.oddsFormat ===
            "hongkong" ||
          settings.oddsFormat ===
            "american"
        ) {
          setOddsFormat(
            settings.oddsFormat,
          );
        }
      }
    } catch (error) {
      console.error(
        "讀取 XSI 賠率格式失敗:",
        error,
      );
    }

    setLoaded(true);
  }, []);

  if (!market) {
    return (
      <section className="mt-10 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6 md:p-8">

        <p className="text-sm font-black text-yellow-400">
          XSI 市場分析
        </p>

        <h2 className="mt-2 text-3xl font-black">
          市場盤口分析
        </h2>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-6">
          <p className="text-zinc-400">
            目前找不到這場比賽的盤口資料。
          </p>
        </div>

      </section>
    );
  }

  const rows =
    buildBookmakerRows(
      market,
    );

  const bestAwayMoneyline =
    getBestPrice(
      rows.map(
        (row) =>
          row.awayMoneyline,
      ),
    );

  const bestHomeMoneyline =
    getBestPrice(
      rows.map(
        (row) =>
          row.homeMoneyline,
      ),
    );

  const currentFormat =
    loaded
      ? oddsFormat
      : "decimal";

  return (
    <section className="mt-10 rounded-3xl border border-yellow-500/20 bg-zinc-950 p-6 md:p-8">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="text-sm font-black text-yellow-400">
            XSI 市場分析
          </p>

          <h2 className="mt-2 text-3xl font-black">
            市場盤口分析
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Moneyline、讓分與大小分莊家比較
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-400/5 px-4 py-3">

            <p className="text-xs text-zinc-500">
              賠率格式
            </p>

            <p className="mt-1 text-sm font-black text-yellow-400">
              {getOddsFormatLabel(
                currentFormat,
              )}
            </p>

          </div>

          <div className="rounded-xl bg-zinc-900 px-4 py-3 md:text-right">

            <p className="text-xs text-zinc-500">
              比賽時間
            </p>

            <p className="mt-1 text-sm font-bold text-zinc-300">
              {formatTaiwanTime(
                market.commenceTime,
              )}
            </p>

          </div>

        </div>

      </div>

      {/* Consensus */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">

        <ConsensusCard
          label="平均 Moneyline"
          awayTeam={
            market.awayTeam
          }
          homeTeam={
            market.homeTeam
          }
          awayValue={
            market.consensus
              .awayMoneyline
          }
          homeValue={
            market.consensus
              .homeMoneyline
          }
          formatValue={(
            value,
          ) =>
            formatOdds(
              value,
              currentFormat,
            )
          }
        />

        <ConsensusCard
          label="平均 Run Line"
          awayTeam={
            market.awayTeam
          }
          homeTeam={
            market.homeTeam
          }
          awayValue={
            market.consensus
              .awaySpread
          }
          homeValue={
            market.consensus
              .homeSpread
          }
          formatValue={
            formatPoint
          }
        />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            平均 Total
          </p>

          <p className="mt-4 text-4xl font-black text-yellow-400">
            {market.consensus
              .total ??
              "--"}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            大小分市場平均值
          </p>

        </div>

      </div>

      {/* Market Score */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">

        <ScoreBox
          label={`${market.awayTeam} 市場評分`}
          score={
            scores.away
          }
        />

        <ScoreBox
          label={`${market.homeTeam} 市場評分`}
          score={
            scores.home
          }
        />

      </div>

      {/* Bookmakers */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">

        <div className="flex flex-col gap-2 border-b border-zinc-800 bg-zinc-900 px-5 py-4 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="font-black text-white">
              多家莊家盤口
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              黃色標記代表目前較佳 Moneyline
            </p>
          </div>

          <div className="flex items-center gap-2">

            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-bold text-zinc-400">
              {getOddsFormatLabel(
                currentFormat,
              )}
            </span>

            <p className="text-sm font-bold text-yellow-400">
              共 {rows.length} 家
            </p>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1050px] text-left">

            <thead className="bg-black/40 text-xs uppercase tracking-wider text-zinc-500">

              <tr>
                <th className="px-5 py-4">
                  莊家
                </th>

                <th className="px-4 py-4">
                  {market.awayTeam} ML
                </th>

                <th className="px-4 py-4">
                  {market.homeTeam} ML
                </th>

                <th className="px-4 py-4">
                  {market.awayTeam} RL
                </th>

                <th className="px-4 py-4">
                  {market.homeTeam} RL
                </th>

                <th className="px-4 py-4">
                  大分
                </th>

                <th className="px-4 py-4">
                  小分
                </th>

                <th className="px-5 py-4 text-right">
                  更新時間
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-zinc-800">

              {rows.map(
                (row) => {
                  const awayMoneylineIsBest =
                    row
                      .awayMoneyline
                      ?.price ===
                    bestAwayMoneyline;

                  const homeMoneylineIsBest =
                    row
                      .homeMoneyline
                      ?.price ===
                    bestHomeMoneyline;

                  return (
                    <tr
                      key={
                        row
                          .bookmaker
                          .key
                      }
                      className="bg-zinc-950 transition hover:bg-zinc-900"
                    >

                      <td className="px-5 py-4">

                        <p className="font-black text-white">
                          {
                            row
                              .bookmaker
                              .title
                          }
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {
                            row
                              .bookmaker
                              .key
                          }
                        </p>

                      </td>

                      <td className="px-4 py-4">

                        <OddsValue
                          value={
                            row
                              .awayMoneyline
                              ?.price
                          }
                          format={
                            currentFormat
                          }
                          isBest={
                            awayMoneylineIsBest
                          }
                        />

                      </td>

                      <td className="px-4 py-4">

                        <OddsValue
                          value={
                            row
                              .homeMoneyline
                              ?.price
                          }
                          format={
                            currentFormat
                          }
                          isBest={
                            homeMoneylineIsBest
                          }
                        />

                      </td>

                      <td className="px-4 py-4">

                        <SpreadValue
                          outcome={
                            row.awaySpread
                          }
                          format={
                            currentFormat
                          }
                        />

                      </td>

                      <td className="px-4 py-4">

                        <SpreadValue
                          outcome={
                            row.homeSpread
                          }
                          format={
                            currentFormat
                          }
                        />

                      </td>

                      <td className="px-4 py-4">

                        <TotalValue
                          outcome={
                            row.over
                          }
                          label="O"
                          format={
                            currentFormat
                          }
                        />

                      </td>

                      <td className="px-4 py-4">

                        <TotalValue
                          outcome={
                            row.under
                          }
                          label="U"
                          format={
                            currentFormat
                          }
                        />

                      </td>

                      <td className="px-5 py-4 text-right text-xs text-zinc-500">

                        {formatTaiwanTime(
                          row
                            .bookmaker
                            .lastUpdate,
                        )}

                      </td>

                    </tr>
                  );
                },
              )}

            </tbody>

          </table>

        </div>

        {rows.length ===
          0 && (
          <div className="bg-zinc-950 p-8 text-center text-zinc-500">
            目前沒有莊家盤口資料。
          </div>
        )}

      </div>

    </section>
  );
} 