export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Predictions {
  [key: string]: {
    homeScore: number;
    awayScore: number;
  };
}

export interface Results {
  [key: string]: {
    homeScore: number | null;
    awayScore: number | null;
    isKnockout: boolean;
    roundName: string | null;
  };
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  exact: number;
  outcome: number;
  total: number;
  predictionCount: number;
}

export interface Groups {
  [key: string]: { teams: string[]; matches: number[][] };
}

export interface KnockoutRound {
  id: string;
  name: string;
  matches: number;
}

export interface Match {
  matchKey: string;
  groupName: string | null;
  matchType: string;
  roundName: string | null;
  matchOrder: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
}

export interface TeamCodes {
  [key: string]: string;
}

export interface GroupStandings {
  name: string;
  pts: number;
  gf: number;
  ga: number;
  gd: number;
  played: number;
  w: number;
  d: number;
  l: number;
}

export const MAX_SCORE = 20;

export const PROHIBITED = "🚫";

export function parseScore(value: string): number | "" {
  if (value === "") return "";
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0 || num > MAX_SCORE) return "";
  return num;
}
