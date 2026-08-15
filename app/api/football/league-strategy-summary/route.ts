import { NextResponse } from "next/server";

export const dynamic =
  "force-dynamic";

type StrategyMode =
  | "XSI"
  | "MARKET"
  | "NO_BET";

type LeagueStrategy = {
  league: string;
  code: string;

  predictionMode:
    "XSI"
    | "MARKET";

  bettingMode:
    StrategyMode;

  marketAccuracy:
    number | null;

  xsiAccuracy:
    number | null;

  accuracyDifference:
    number | null;

  xsiOosBets:
    number | null;

  xsiOosRoi:
    number | null;

  marketOosRoi:
    number | null;

  roiDifference:
    number | null;

  status:
    | "approved"
    | "candidate"
    | "rejected";

  reason: string;
};

const strategies:
  LeagueStrategy[] = [
  {
    league:
      "英超",

    code:
      "EPL",

    predictionMode:
      "MARKET",

    bettingMode:
      "NO_BET",

    marketAccuracy:
      46.4,

    xsiAccuracy:
      45.5,

    accuracyDifference:
      -0.9,

    xsiOosBets:
      27,

    xsiOosRoi:
      -28.3,

    marketOosRoi:
      -29.6,

    roiDifference:
      1.3,

    status:
      "rejected",

    reason:
      "XSI Walk-Forward 未優於 Market，且 XSI / Market OOS ROI 均為負值，暫不啟用投注策略。",
  },

  {
    league:
      "西甲",

    code:
      "LALIGA",

    predictionMode:
      "MARKET",

    bettingMode:
      "NO_BET",

    marketAccuracy:
      null,

    xsiAccuracy:
      null,

    accuracyDifference:
      null,

    xsiOosBets:
      36,

    xsiOosRoi:
      1,

    marketOosRoi:
      6.8,

    roiDifference:
      -5.8,

    status:
      "rejected",

    reason:
      "ROI Walk-Forward 中 Market baseline 明顯優於 XSI，XSI 尚未證明有穩定投注優勢。",
  },

  {
    league:
      "義甲",

    code:
      "SERIEA",

    predictionMode:
      "MARKET",

    bettingMode:
      "NO_BET",

    marketAccuracy:
      57.3,

    xsiAccuracy:
      55.9,

    accuracyDifference:
      -1.4,

    xsiOosBets:
      27,

    xsiOosRoi:
      -41.6,

    marketOosRoi:
      -35,

    roiDifference:
      -6.6,

    status:
      "rejected",

    reason:
      "XSI Accuracy 與 ROI 均低於 Market baseline，Value Strategy 不啟用。",
  },

  {
    league:
      "德甲",

    code:
      "BUNDESLIGA",

    predictionMode:
      "XSI",

    bettingMode:
      "NO_BET",

    marketAccuracy:
      54.1,

    xsiAccuracy:
      55.5,

    accuracyDifference:
      1.4,

    xsiOosBets:
      13,

    xsiOosRoi:
      13.5,

    marketOosRoi:
      10.9,

    roiDifference:
      2.6,

    status:
      "candidate",

    reason:
      "XSI Accuracy 與 ROI 都優於 Market，但 OOS 只有 13 注，樣本不足，因此保留為候選，不正式啟用投注。",
  },

  {
    league:
      "法甲",

    code:
      "LIGUE1",

    predictionMode:
      "MARKET",

    bettingMode:
      "NO_BET",

    marketAccuracy:
      54.8,

    xsiAccuracy:
      48.6,

    accuracyDifference:
      -6.2,

    xsiOosBets:
      22,

    xsiOosRoi:
      -35.6,

    marketOosRoi:
      3.5,

    roiDifference:
      -39.1,

    status:
      "rejected",

    reason:
      "XSI Walk-Forward 與 ROI Walk-Forward 均明顯落後 Market，因此不使用 XSI Value Strategy。",
  },
];

export async function GET() {
  const approved =
    strategies.filter(
      (item) =>
        item.status ===
        "approved",
    );

  const candidates =
    strategies.filter(
      (item) =>
        item.status ===
        "candidate",
    );

  const rejected =
    strategies.filter(
      (item) =>
        item.status ===
        "rejected",
    );

  return NextResponse.json({
    success:
      true,

    methodology: {
      predictionMode:
        "決定比賽勝率主要使用 XSI 或 Market。",

      bettingMode:
        "只有通過 OOS ROI 驗證的策略才能正式投注。",

      rules: {
        approved:
          "OOS 樣本足夠、ROI 為正且優於 Market。",

        candidate:
          "結果有正向訊號，但樣本量不足。",

        rejected:
          "OOS 未證明優勢或 ROI 為負。",
      },
    },

    summary: {
      totalLeagues:
        strategies.length,

      approved:
        approved.length,

      candidates:
        candidates.length,

      rejected:
        rejected.length,
    },

    strategies,

    officialPolicy: {
      epl:
        "NO_BET",

      laliga:
        "NO_BET",

      seriea:
        "NO_BET",

      bundesliga:
        "NO_BET",

      ligue1:
        "NO_BET",
    },

    message:
      "目前五大聯賽尚無策略達到正式投注啟用標準；德甲保留 XSI 候選訊號，其餘聯賽以 Market 作為預測基準。",
  });
}