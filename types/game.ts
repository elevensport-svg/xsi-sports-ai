export type TeamSide = "away" | "home";

export type XsiGrade =
  | "S"
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C+"
  | "C"
  | "D";

export type ConfidenceLevel =
  | "very-high"
  | "high"
  | "medium"
  | "low"
  | "very-low";

export type RiskLevel = "low" | "medium" | "high";

export type RecommendationType =
  | "strong"
  | "lean"
  | "pass"
  | "avoid";

export type GameStatus =
  | "scheduled"
  | "pregame"
  | "live"
  | "final"
  | "postponed"
  | "cancelled"
  | "unknown";

export type MetricValue = string | number | boolean | null;

export type ModuleMetric = {
  key: string;
  label: string;
  value: MetricValue;
  displayValue: string;
  description?: string;
};

export type ModuleScore = {
  score: number;
  grade: XsiGrade;
  summary: string;
  metrics: ModuleMetric[];
};

export type PitcherStatLine = {
  playerId: number | null;
  name: string;
  hand: string | null;
  era: number | null;
  whip: number | null;
  wins: number | null;
  losses: number | null;
  inningsPitched: number | null;
  strikeouts: number | null;
  walks: number | null;
  homeRunsAllowed: number | null;
  strikeoutsPerNine: number | null;
  walksPerNine: number | null;
  homeRunsPerNine: number | null;
  strikeoutWalkRatio: number | null;
  opponentAverage: number | null;
};

export type PitcherModule = ModuleScore & {
  pitcher: PitcherStatLine;
};

export type BattingStatLine = {
  gamesPlayed: number | null;
  plateAppearances: number | null;
  atBats: number | null;
  runs: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  homeRuns: number | null;
  runsBattedIn: number | null;
  walks: number | null;
  strikeouts: number | null;
  stolenBases: number | null;
  battingAverage: number | null;
  onBasePercentage: number | null;
  sluggingPercentage: number | null;
  onBasePlusSlugging: number | null;
};

export type BattingModule = ModuleScore & {
  stats: BattingStatLine;
};

export type BullpenStatLine = {
  gamesPlayed: number | null;
  inningsPitched: number | null;
  era: number | null;
  whip: number | null;
  strikeouts: number | null;
  walks: number | null;
  homeRunsAllowed: number | null;
  saves: number | null;
  saveOpportunities: number | null;
  blownSaves: number | null;
  holds: number | null;
};

export type BullpenModule = ModuleScore & {
  stats: BullpenStatLine;
  fatigueScore: number | null;
};

export type RecentGameResult = {
  gamePk: number;
  date: string;
  opponentId: number;
  opponentName: string;
  isHome: boolean;
  runsFor: number;
  runsAgainst: number;
  result: "W" | "L";
};

export type RecentFormStatLine = {
  sampleSize: number;
  wins: number;
  losses: number;
  winPercentage: number;
  runsFor: number;
  runsAgainst: number;
  runDifference: number;
  averageRunsFor: number;
  averageRunsAgainst: number;
  streak: string | null;
  games: RecentGameResult[];
};

export type RecentFormModule = ModuleScore & {
  stats: RecentFormStatLine;
};

export type MarketOdds = {
  sportsbook: string | null;
  updatedAt: string | null;
  moneyline: number | null;
  runLine: number | null;
  runLineOdds: number | null;
  total: number | null;
  overOdds: number | null;
  underOdds: number | null;
};

export type MarketModule = ModuleScore & {
  odds: MarketOdds | null;
  impliedProbability: number | null;
  marketEdge: number | null;
  publicBetPercentage: number | null;
  sharpBetPercentage: number | null;
};

export type WeatherStatLine = {
  venue: string | null;
  condition: string | null;
  temperatureCelsius: number | null;
  humidityPercentage: number | null;
  windSpeedKph: number | null;
  windDirection: string | null;
  precipitationProbability: number | null;
};

export type WeatherModule = ModuleScore & {
  stats: WeatherStatLine | null;
};

export type TeamIdentity = {
  id: number;
  name: string;
  abbreviation: string | null;
  logoUrl: string | null;
};

export type TeamGameAnalysis = {
  side: TeamSide;
  team: TeamIdentity;
  pitcher: PitcherModule;
  batting: BattingModule;
  bullpen: BullpenModule;
  recentForm: RecentFormModule;
  market: MarketModule;
  weather: WeatherModule;
};

export type XsiModuleKey =
  | "pitcher"
  | "batting"
  | "bullpen"
  | "recentForm"
  | "market"
  | "weather"
  | "homeField";

export type XsiModuleWeight = {
  key: XsiModuleKey;
  label: string;
  weight: number;
};

export type XsiModuleResult = {
  key: XsiModuleKey;
  label: string;
  awayScore: number;
  homeScore: number;
  weight: number;
  awayWeightedScore: number;
  homeWeightedScore: number;
  advantage: TeamSide | "even";
  difference: number;
};

export type XsiTeamResult = {
  rawScore: number;
  totalScore: number;
  winProbability: number;
  grade: XsiGrade;
};

export type XsiEngineResult = {
  away: XsiTeamResult;
  home: XsiTeamResult;
  modules: XsiModuleResult[];
  leadingSide: TeamSide | "even";
  scoreDifference: number;
};

export type AnalysisFactor = {
  key: string;
  title: string;
  description: string;
  advantage: TeamSide | "even";
  impact: "high" | "medium" | "low";
};

export type GameRecommendation = {
  type: RecommendationType;
  recommendedSide: TeamSide | null;
  teamName: string | null;
  title: string;
  summary: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  risk: RiskLevel;
  edge: number;
  reasons: string[];
  warnings: string[];
};

export type GamePrediction = {
  projectedAwayRuns: number | null;
  projectedHomeRuns: number | null;
  projectedTotalRuns: number | null;
  winProbabilityAway: number;
  winProbabilityHome: number;
  predictedWinner: TeamSide | "even";
};

export type GameInfo = {
  gamePk: number;
  league: "MLB";
  gameDate: string;
  taiwanGameTime: string;
  status: GameStatus;
  venue: string | null;
};

export type GameAnalysis = {
  game: GameInfo;
  away: TeamGameAnalysis;
  home: TeamGameAnalysis;
  engine: XsiEngineResult;
  prediction: GamePrediction;
  recommendation: GameRecommendation;
  factors: AnalysisFactor[];
  generatedAt: string;
};

export type GameAnalysisErrorCode =
  | "GAME_NOT_FOUND"
  | "API_ERROR"
  | "INVALID_GAME_DATA"
  | "ANALYSIS_ERROR";

export type GameAnalysisError = {
  code: GameAnalysisErrorCode;
  message: string;
};

export type GameAnalysisResult =
  | {
      success: true;
      data: GameAnalysis;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: GameAnalysisError;
    };