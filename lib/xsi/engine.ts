export type XsiModuleScores = {
  pitch: number;
  bat: number;
  bullpen: number;
  form: number;
  market: number;
};

export type XsiEngineResult = {
  total: number;
  confidence: number;

  recommendation:
    string;

  risk:
    | "低"
    | "中"
    | "高";

  modules:
    XsiModuleScores;
};

/*
 * ==========================================
 * 數值限制
 * ==========================================
 */
function clamp(
  value: number,
  min = 0,
  max = 100,
) {
  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  );
}

/*
 * ==========================================
 * XSI MLB Engine
 *
 * 核心原則：
 *
 * 1. 投手主導單場勝負
 * 2. 打線第二重要
 * 3. 牛棚影響比賽後段
 * 4. 近期狀態只作短期校正
 * 5. Market 僅作市場校正
 *
 * 不讓賠率 / 盤口主導選隊。
 * ==========================================
 */
export function calculateXsiEngine(
  modules:
    XsiModuleScores,
): XsiEngineResult {
  /*
   * ========================================
   * 權重
   *
   * Pitch    40%
   * Bat      25%
   * Bullpen  18%
   * Form     10%
   * Market    7%
   *
   * Total   100%
   * ========================================
   */

  const total =
    modules.pitch *
      0.4 +
    modules.bat *
      0.25 +
    modules.bullpen *
      0.18 +
    modules.form *
      0.1 +
    modules.market *
      0.07;

  const rounded =
    Number(
      clamp(
        total,
      ).toFixed(
        1,
      ),
    );

  /*
   * ========================================
   * 模型方向
   *
   * 這裡只表達球隊模型強弱，
   * 不決定：
   *
   * 獨贏
   * 讓分
   * 受讓
   *
   * 真正投注玩法由
   * mlbGameAnalysis.ts
   * 的 Bet Advisor 決定。
   * ========================================
   */

  let recommendation =
    "暫不建議";

  let risk:
    | "低"
    | "中"
    | "高" =
    "高";

  /*
   * ========================================
   * 強勢區
   * ========================================
   */
  if (
    rounded >=
    80
  ) {
    recommendation =
      "可列入重點觀察";

    risk =
      "低";
  }

  /*
   * ========================================
   * 中度優勢
   * ========================================
   */
  else if (
    rounded >=
    68
  ) {
    recommendation =
      "小幅偏向";

    risk =
      "中";
  }

  /*
   * ========================================
   * 弱勢 / 不明顯
   * ========================================
   */
  else {
    recommendation =
      "暫不建議";

    risk =
      "高";
  }

  /*
   * ========================================
   * Confidence
   *
   * 越偏離 50，
   * 模型方向越明確。
   *
   * 最低 50
   * 最高 95
   * ========================================
   */

  const confidence =
    Math.round(
      clamp(
        50 +
          Math.abs(
            rounded -
              50,
          ) *
            1.3,

        50,
        95,
      ),
    );

  return {
    total:
      rounded,

    confidence,

    recommendation,

    risk,

    modules,
  };
}