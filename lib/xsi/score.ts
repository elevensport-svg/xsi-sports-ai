import { XsiInput, XsiResult } from "./types";

export function calculateXsiScore(
  input: XsiInput,
): XsiResult {

  const score =
      input.pitcher * 0.35 +
      input.batting * 0.25 +
      input.bullpen * 0.15 +
      input.recent * 0.10 +
      input.homeField * 0.10 +
      input.injuries * 0.05;

  return {
    score: Number(score.toFixed(1)),
    confidence: Math.min(
      99,
      Math.round(score + 8),
    ),
  };
}