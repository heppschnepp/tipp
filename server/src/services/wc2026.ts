import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const WC2026_API_KEY = process.env.WC2026_API_KEY;
const API_BASE = "https://api.wc2026api.com";

if (!WC2026_API_KEY) {
  console.warn(
    "[WC2026 API] WC2026_API_KEY environment variable is not set. API calls will fail.",
  );
}

export interface WC2026Match {
  id: number;
  match_number: number;
  round: string;
  group_name: string | null;
  home_team: string;
  away_team: string;
  stadium: string;
  kickoff_utc: string;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
}

export interface WC2026Standing {
  team_name: string;
  group: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

class WC2026Service {
  private lastFetchTime: number = 0;
  private cache: Map<string, unknown> = new Map();

  async fetch<T>(endpoint: string): Promise<T> {
    const cacheKey = endpoint;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as T;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${WC2026_API_KEY}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`WC2026 API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    this.cache.set(cacheKey, data);
    this.lastFetchTime = Date.now();
    return data as T;
  }

  async getAllMatches(): Promise<WC2026Match[]> {
    const data = await this.fetch<WC2026Match[]>("/matches");
    return data;
  }

  async getMatchesByStatus(status: string): Promise<WC2026Match[]> {
    const all = await this.getAllMatches();
    return all.filter((m) => m.status === status);
  }

  async getGroupStandings(): Promise<Record<string, WC2026Standing[]>> {
    const data = await this.fetch<WC2026Standing[]>("/standings");
    const groups: Record<string, WC2026Standing[]> = {};
    data.forEach((s: WC2026Standing) => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push(s);
    });
    return groups;
  }

  clearCache() {
    this.cache.clear();
  }

  getLastFetchTime(): number {
    return this.lastFetchTime;
  }
}

export const wc2026 = new WC2026Service();
