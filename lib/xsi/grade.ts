import type {
  ConfidenceLevel,
  RecommendationType,
  RiskLevel,
  XsiGrade,
} from "@/types/game";

import { XSI_CONFIDENCE, XSI_RISK } from "./config";

export function getGrade(score: number): XsiGrade {
  if (score >= 95) return "S";
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "C+";
  if (score >= 60) return "C";

  return "D";
}

export function getConfidence(scoreDiff: number): {
  level: ConfidenceLevel;
  score: number;
} {
  if (scoreDiff >= XSI_CONFIDENCE.VERY_HIGH) {
    return {
      level: "very-high",
      score: 95,
    };
  }

  if (scoreDiff >= XSI_CONFIDENCE.HIGH) {
    return {
      level: "high",
      score: 85,
    };
  }

  if (scoreDiff >= XSI_CONFIDENCE.MEDIUM) {
    return {
      level: "medium",
      score: 75,
    };
  }

  if (scoreDiff >= XSI_CONFIDENCE.LOW) {
    return {
      level: "low",
      score: 65,
    };
  }

  return {
    level: "very-low",
    score: 55,
  };
}

export function getRisk(scoreDiff: number): RiskLevel {
  if (scoreDiff >= XSI_RISK.LOW) {
    return "low";
  }

  if (scoreDiff >= XSI_RISK.MEDIUM) {
    return "medium";
  }

  return "high";
}

export function getRecommendation(scoreDiff: number): RecommendationType {
  if (scoreDiff >= 15) {
    return "strong";
  }

  if (scoreDiff >= 8) {
    return "lean";
  }

  if (scoreDiff >= 3) {
    return "pass";
  }

  return "avoid";
}