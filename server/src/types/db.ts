export interface IdRow {
  id: number;
}

export interface CountRow {
  cnt: number;
}

export interface UserAuthRow {
  id: number;
  username: string;
  passwordhash: string;
  isadmin: boolean;
}

export interface UserRecord {
  id: number;
  username: string;
  isadmin: boolean;
  createdat: Date;
}

export interface SimpleUserRecord {
  id: number;
  username: string;
}

export interface PredictionRow {
  matchkey: string;
  homescore: number | null;
  awayscore: number | null;
  userid: number;
}

export interface MatchResultRecord {
  matchkey: string;
  homescore: number | null;
  awayscore: number | null;
  isknockout: boolean;
  roundname: string | null;
}

export interface SimpleMatchResult {
  matchkey: string;
  homescore: number;
  awayscore: number;
}

export interface TeamNameCodeRow {
  name: string;
  code: string;
}

export interface GroupNameRow {
  groupname: string;
}

export interface KnockoutRoundRow {
  roundname: string;
  orderidx: number;
}

export interface LastFetchRecord {
  lastfetched: Date | null;
}

export interface CountResultRecord {
  total: number;
  withscores: number;
}

export interface ResultInfo {
  homeScore: number | null;
  awayScore: number | null;
  isKnockout: boolean;
  roundName: string | null;
}

export interface LeaderboardEntry {
  userid: number;
  username: string;
  exact: number;
  outcome: number;
  total: number;
  predictioncount: number;
}