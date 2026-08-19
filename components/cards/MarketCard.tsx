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
          ? "inline-flex rounded-full bg-[#ffe694] px-2.5 py-1 font-black text-[#8f6212] shadow-sm"
          : "font-black text-[#4a4038]"
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
      <span className="text-[#b0a59b]">
        --
      </span>
    );
  }

  return (
    <div>
      <p className="font-black text-[#4a4038]">
        {formatPoint(
          outcome.point,
        )}
      </p>

      <p className="mt-1 text-xs text-[#9f9388]">
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
      <span className="text-[#b0a59b]">
        --
      </span>
    );
  }

  return (
    <div>
      <p className="font-black text-[#4a4038]">
        {label}{" "}
        {outcome.point ??
          "--"}
      </p>

      <p className="mt-1 text-xs text-[#9f9388]">
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
    <div className="rounded-[24px] border border-[#eee3d6] bg-white p-5 shadow-sm">
      <p className="text-sm text-[#9f9388]">
        {label}
      </p>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-4xl font-black text-[#c98213]">
            {score.score}
          </p>

          <p className="mt-1 text-sm text-[#8f8378]">
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
                className="mt-1 text-xs text-[#9f9388]"
              >
                • {reason}
              </p>
            ),
          )}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-[#ffc94a]"
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
    <div className="rounded-[24px] border border-[#eee3d6] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-[#9f9388]">
        {label}
      </p>

      <div className="mt-4 space-y-4">

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[#8f8378]">
            {awayTeam}
          </span>

          <span className="text-xl font-black text-[#4a4038]">
            {formatValue(
              awayValue,
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[#8f8378]">
            {homeTeam}
          </span>

          <span className="text-xl font-black text-[#4a4038]">
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
      <section className="mt-10 rounded-[32px] border border-[#eee0cd] bg-white p-6 shadow-[0_14px_38px_rgba(95,75,55,0.08)] md:p-8">

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#fff0bd] text-2xl shadow-sm">💰</div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c98213]">XSI MARKET ANALYSIS</p>
            <h2 className="mt-2 text-3xl font-black text-[#4a4038]">市場盤口分析</h2>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-white p-6">
          <p className="text-[#8f8378]">
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
    <section className="mt-10 rounded-[32px] border border-[#eee0cd] bg-white p-6 shadow-[0_14px_38px_rgba(95,75,55,0.08)] md:p-8">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#fff0bd] text-2xl shadow-sm">💰</div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c98213]">XSI MARKET ANALYSIS</p>
            <h2 className="mt-2 text-3xl font-black text-[#4a4038]">市場盤口分析</h2>
            <p className="mt-2 text-sm text-[#978a7f]">Moneyline、讓分與大小分莊家比較</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">

          <div className="rounded-[18px] border border-[#efdca8] bg-[#ffc94a]/5 px-4 py-3">

            <p className="text-xs text-[#9f9388]">
              賠率格式
            </p>

            <p className="mt-1 text-sm font-black text-[#c98213]">
              {getOddsFormatLabel(
                currentFormat,
              )}
            </p>

          </div>

          <div className="rounded-[18px] border border-[#dcecf4] bg-[#f1faff] px-4 py-3 md:text-right">

            <p className="text-xs text-[#9f9388]">
              比賽時間
            </p>

            <p className="mt-1 text-sm font-bold text-[#6f7f87]">
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

        <div className="rounded-[24px] border border-[#eee3d6] bg-white p-5 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-widest text-[#9f9388]">
            平均 Total
          </p>

          <p className="mt-4 text-4xl font-black text-[#c98213]">
            {market.consensus
              .total ??
              "--"}
          </p>

          <p className="mt-2 text-sm text-[#9f9388]">
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
      <div className="mt-8 overflow-hidden rounded-[24px] border border-[#eee3d6]">

        <div className="flex flex-col gap-2 border-b border-[#eee3d6] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="font-black text-[#4a4038]">
              多家莊家盤口
            </p>

            <p className="mt-1 text-xs text-[#9f9388]">
              黃色標記代表目前較佳 Moneyline
            </p>
          </div>

          <div className="flex items-center gap-2">

            <span className="rounded-full border border-[#e7dccf] bg-[#fffdf9] px-3 py-1 text-xs font-bold text-[#8f8378]">
              {getOddsFormatLabel(
                currentFormat,
              )}
            </span>

            <p className="text-sm font-bold text-[#c98213]">
              共 {rows.length} 家
            </p>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1050px] text-left">

            <thead className="bg-[#fff8ef] text-xs uppercase tracking-wider text-[#9f9388]">

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

            <tbody className="divide-y divide-[#eee8e0]">

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
                      className="bg-white transition hover:bg-[#fffaf0]"
                    >

                      <td className="px-5 py-4">

                        <p className="font-black text-[#4a4038]">
                          {
                            row
                              .bookmaker
                              .title
                          }
                        </p>

                        <p className="mt-1 text-xs text-[#b0a59b]">
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

                      <td className="px-5 py-4 text-right text-xs text-[#9f9388]">

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
          <div className="bg-[#fffdf9] p-8 text-center text-[#9f9388]">
            目前沒有莊家盤口資料。
          </div>
        )}

      </div>

    </section>
  );
} 