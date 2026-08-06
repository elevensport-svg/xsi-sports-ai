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
  recommendation: string;
  risk: "低" | "中" | "高";
  modules: XsiModuleScores;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculateXsiEngine(
  modules: XsiModuleScores,
): XsiEngineResult {
  const total =
    modules.pitch * 0.35 +
    modules.bat * 0.2 +
    modules.bullpen * 0.15 +
    modules.form * 0.15 +
    modules.market * 0.15;

  const rounded = Number(clamp(total).toFixed(1));

  let recommendation = "暫不建議";
  let risk: "低" | "中" | "高" = "高";

  if (rounded >= 80) {
    recommendation = "可列入重點觀察";
    risk = "低";
  } else if (rounded >= 68) {
    recommendation = "小幅偏向";
    risk = "中";
  }

  const confidence = Math.round(
    clamp(50 + Math.abs(rounded - 50) * 1.3, 50, 95),
  );

  return {
    total: rounded,
    confidence,
    recommendation,
    risk,
    modules,
  };
}