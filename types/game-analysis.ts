import type { BullpenScoreResult } from "../lib/xsi/bullpen";
import type { BattingScoreResult } from "../lib/xsi/batting";
import type { FormScoreResult } from "../lib/xsi/recent";
import type { PitcherScoreResult } from "../lib/xsi/pitcher";

export type TeamAnalysis = {
  id: number;
  name: string;

  pitch: PitcherScoreResult;
  batting: BattingScoreResult;
  bullpen: BullpenScoreResult;
  form: FormScoreResult;

  xsi: {
    total: number;
    confidence: number;
    recommendation: string;
    risk: string;
  };
};

export type GameAnalysis = {
  away: TeamAnalysis;
  home: TeamAnalysis;

  leadingTeam: string;
  recommendation: string;

  confidence: number;
  risk: string;

  scoreDiff: number;
  pitcherDiff: number;
  battingDiff: number;
  formDiff: number;
};