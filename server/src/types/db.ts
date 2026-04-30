export interface IdRow {
  Id: number;
}

export interface CountRow {
  cnt: number;
}

export interface UserAuthRow {
  Id: number;
  Username: string;
  PasswordHash: string;
  IsAdmin: boolean;
}

export interface UserRecord {
  Id: number;
  Username: string;
  IsAdmin: boolean;
  CreatedAt: Date;
}

export interface SimpleUserRecord {
  Id: number;
  Username: string;
}

export interface PredictionRow {
  MatchKey: string;
  HomeScore: number | null;
  AwayScore: number | null;
  UserId: number;
}

export interface MatchResultRecord {
  MatchKey: string;
  HomeScore: number | null;
  AwayScore: number | null;
  IsKnockout: boolean;
  RoundName: string | null;
}

export interface SimpleMatchResult {
  MatchKey: string;
  HomeScore: number;
  AwayScore: number;
}

export interface TeamNameCodeRow {
  Name: string;
  Code: string;
}

export interface GroupNameRow {
  GroupName: string;
}

export interface KnockoutRoundRow {
  RoundName: string;
  OrderIdx: number;
}

export interface LastFetchRecord {
  lastFetched: Date | null;
}

export interface CountResultRecord {
  total: number;
  withScores: number;
}

export interface ResultInfo {
  homeScore: number | null;
  awayScore: number | null;
  isKnockout: boolean;
  roundName: string | null;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  exact: number;
  outcome: number;
  total: number;
  predictionCount: number;
}
