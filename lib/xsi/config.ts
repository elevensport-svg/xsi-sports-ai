import type { XsiModuleKey, XsiModuleWeight } from "@/types/game";

export const XSI_VERSION = "2.0.0";

export const XSI_SCORE = {
  MIN: 0,
  MAX: 100,
} as const;

export const XSI_MODULES: readonly XsiModuleWeight[] = [
  {
    key: "pitcher",
    label: "Starting Pitcher",
    weight: 0.30,
  },
  {
    key: "batting",
    label: "Batting",
    weight: 0.22,
  },
  {
    key: "bullpen",
    label: "Bullpen",
    weight: 0.18,
  },
  {
    key: "recentForm",
    label: "Recent Form",
    weight: 0.15,
  },
  {
    key: "market",
    label: "Market",
    weight: 0.10,
  },
  {
    key: "weather",
    label: "Weather",
    weight: 0.03,
  },
  {
    key: "homeField",
    label: "Home Field",
    weight: 0.02,
  },
] as const;

export const XSI_CONFIDENCE = {
  VERY_HIGH: 90,
  HIGH: 80,
  MEDIUM: 70,
  LOW: 60,
} as const;

export const XSI_RISK = {
  LOW: 15,
  MEDIUM: 8,
} as const;

export const HOME_FIELD_ADVANTAGE = 2;

export const DEFAULT_MARKET_SCORE = 50;

export const DEFAULT_WEATHER_SCORE = 50;

export const MODULE_ORDER: readonly XsiModuleKey[] = [
  "pitcher",
  "batting",
  "bullpen",
  "recentForm",
  "market",
  "weather",
  "homeField",
] as const;

export function clampScore(score: number): number {
  return Math.min(
    XSI_SCORE.MAX,
    Math.max(XSI_SCORE.MIN, Number(score.toFixed(1))),
  );
}

export function weightedScore(score: number, weight: number): number {
  return Number((clampScore(score) * weight).toFixed(2));
}

export function totalWeight(): number {
  return XSI_MODULES.reduce((sum, module) => sum + module.weight, 0);
}