"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type OddItem = {
  id: number;
  value: string;
};

export default function OddsCalculatorPage() {
  const [odds, setOdds] = useState<OddItem[]>([
    {
      id: 1,
      value: "1.70",
    },
    {
      id: 2,
      value: "1.85",
    },
  ]);

  const [stake, setStake] =
    useState("1000");

  const result = useMemo(() => {
    const validOdds = odds
      .map((item) =>
        Number(item.value),
      )
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value > 1,
      );

    if (validOdds.length === 0) {
      return null;
    }

    const totalOdds =
      validOdds.reduce(
        (total, odd) =>
          total * odd,
        1,
      );

    const impliedProbability =
      (1 / totalOdds) * 100;

    const betAmount =
      Number(stake);

    const payout =
      Number.isFinite(betAmount) &&
      betAmount >= 0
        ? betAmount * totalOdds
        : 0;

    const profit =
      Number.isFinite(betAmount) &&
      betAmount >= 0
        ? payout - betAmount
        : 0;

    return {
      totalOdds,
      impliedProbability,
      payout,
      profit,
      validCount:
        validOdds.length,
    };
  }, [odds, stake]);

  function updateOdd(
    id: number,
    value: string,
  ) {
    setOdds((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              value,
            }
          : item,
      ),
    );
  }

  function addOdd() {
    setOdds((current) => [
      ...current,
      {
        id: Date.now(),
        value: "",
      },
    ]);
  }

  function removeOdd(
    id: number,
  ) {
    setOdds((current) => {
      if (current.length <= 2) {
        return current;
      }

      return current.filter(
        (item) =>
          item.id !== id,
      );
    });
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:border-yellow-400 hover:text-yellow-400"
        >
          ← 回上一頁
        </Link>

        {/* Header */}
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
            XSI PARLAY CALCULATOR
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            🧮 串關賠率計算
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            輸入每一關的十進位賠率，
            自動計算串關總賠率、隱含勝率與預估派彩。
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">

          {/* Odds Input */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                  Parlay Odds
                </p>

                <h2 className="mt-2 text-xl font-black">
                  串關賠率
                </h2>
              </div>

              <span className="rounded-full border border-yellow-500/20 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-400">
                {odds.length} 關
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {odds.map(
                (item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-sm font-black text-yellow-400">
                      {index + 1}
                    </div>

                    <input
                      type="number"
                      inputMode="decimal"
                      min="1.01"
                      step="0.01"
                      value={
                        item.value
                      }
                      onChange={(
                        event,
                      ) =>
                        updateOdd(
                          item.id,
                          event.target
                            .value,
                        )
                      }
                      placeholder="輸入賠率，例如 1.75"
                      className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-black text-white outline-none transition focus:border-yellow-400"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeOdd(
                          item.id,
                        )
                      }
                      disabled={
                        odds.length <= 2
                      }
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-700 text-zinc-500 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={addOdd}
              className="mt-4 flex w-full items-center justify-center rounded-xl border border-dashed border-yellow-500/30 py-3 text-sm font-black text-yellow-400 transition hover:bg-yellow-400/10"
            >
              ＋ 新增一關
            </button>

            {/* Stake */}
            <div className="mt-7 border-t border-zinc-800 pt-6">
              <label
                htmlFor="stake"
                className="text-sm font-bold text-zinc-300"
              >
                投注本金
              </label>

              <input
                id="stake"
                type="number"
                inputMode="decimal"
                min="0"
                value={stake}
                onChange={(event) =>
                  setStake(
                    event.target.value,
                  )
                }
                placeholder="例如 1000"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-lg font-black text-white outline-none transition focus:border-yellow-400"
              />
            </div>

          </section>

          {/* Results */}
          <section className="rounded-2xl border border-yellow-500/20 bg-yellow-400/5 p-5 sm:p-6">

            <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
              Result
            </p>

            <h2 className="mt-2 text-xl font-black">
              串關計算結果
            </h2>

            {result ? (
              <div className="mt-6 space-y-4">

                <ResultCard
                  label="串關總賠率"
                  value={
                    result.totalOdds.toFixed(
                      3,
                    )
                  }
                  highlight
                />

                <ResultCard
                  label="隱含勝率"
                  value={`${result.impliedProbability.toFixed(
                    2,
                  )}%`}
                  highlight
                />

                <div className="grid grid-cols-2 gap-3">
                  <ResultCard
                    label="預估總派彩"
                    value={`$${formatNumber(
                      result.payout,
                    )}`}
                  />

                  <ResultCard
                    label="預估淨利"
                    value={`$${formatNumber(
                      result.profit,
                    )}`}
                  />
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">
                      串關數
                    </span>

                    <span className="font-black text-white">
                      {
                        result.validCount
                      }{" "}
                      串 1
                    </span>
                  </div>
                </div>

                <ProbabilityMeter
                  probability={
                    result.impliedProbability
                  }
                />

              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                <p className="font-bold text-red-400">
                  請輸入有效賠率
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  每一關的十進位賠率需大於 1。
                </p>
              </div>
            )}

          </section>

        </div>

        {/* Explanation */}
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">

          <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">
            Calculation
          </p>

          <h2 className="mt-2 text-xl font-black">
            計算方式
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-3">

            <FormulaCard
              label="串關總賠率"
              formula="每一關賠率相乘"
            />

            <FormulaCard
              label="隱含勝率"
              formula="1 ÷ 串關總賠率 × 100%"
            />

            <FormulaCard
              label="預估派彩"
              formula="本金 × 串關總賠率"
            />

          </div>

        </section>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs leading-6 text-zinc-500">
            隱含勝率是依十進位賠率換算出的市場機率，
            不代表實際比賽發生機率，也未排除平台水位或莊家利潤。
          </p>
        </div>

      </div>
    </main>
  );
}

function ResultCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs font-bold text-zinc-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-black ${
          highlight
            ? "text-yellow-400"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProbabilityMeter({
  probability,
}: {
  probability: number;
}) {
  const safeProbability =
    Math.max(
      0,
      Math.min(
        probability,
        100,
      ),
    );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          市場隱含勝率
        </p>

        <p className="font-black text-yellow-400">
          {safeProbability.toFixed(
            2,
          )}
          %
        </p>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all"
          style={{
            width: `${safeProbability}%`,
          }}
        />
      </div>

    </div>
  );
}

function FormulaCard({
  label,
  formula,
}: {
  label: string;
  formula: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-4">
      <p className="text-xs font-bold text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-white">
        {formula}
      </p>
    </div>
  );
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "zh-TW",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}