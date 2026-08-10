"use client";

import { useEffect, useRef } from "react";

type Props = {
  gamePk: string | number;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  confidence: number;
};

export default function PredictionHistorySaver({
  gamePk,
  homeTeam,
  awayTeam,
  prediction,
  confidence,
}: Props) {
  const hasSaved = useRef(false);

  useEffect(() => {
    if (hasSaved.current) {
      return;
    }

    hasSaved.current = true;

    async function savePrediction() {
      try {
        const response = await fetch("/api/prediction/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gamePk: String(gamePk),
            homeTeam,
            awayTeam,
            prediction,
            confidence,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          console.error(
            "prediction_history 儲存失敗:",
            result,
          );

          return;
        }

        console.log(
          "prediction_history 儲存成功:",
          result.data,
        );
      } catch (error) {
        console.error(
          "prediction_history API 呼叫失敗:",
          error,
        );
      }
    }

    void savePrediction();
  }, [
    gamePk,
    homeTeam,
    awayTeam,
    prediction,
    confidence,
  ]);

  return null;
}