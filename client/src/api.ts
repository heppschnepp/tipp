const API_BASE = "/api";

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
    homeScore: number;
    awayScore: number;
    isKnockout: boolean;
    roundName: string;
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

export interface Flags {
  [key: string]: string;
}

export interface KnockoutRound {
  id: string;
  name: string;
  matches: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = path.includes("?")
    ? `${API_BASE}${path}&_t=${Date.now()}`
    : `${API_BASE}${path}?_t=${Date.now()}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}

export const api = {
  auth: {
    register: (username: string, password: string, email?: string) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password, email }),
      }),

    login: (username: string, password: string) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),

    me: () => request<{ user: User }>("/auth/me").then((r) => r.user),
  },

  predictions: {
    get: () => request<Predictions>("/predictions"),
    save: (matchKey: string, homeScore: number | "", awayScore: number | "") =>
      request<{ success: boolean }>("/predictions", {
        method: "POST",
        body: JSON.stringify({ matchKey, homeScore, awayScore }),
      }),
  },

  results: {
    get: () => request<Results>("/results"),
    save: (
      matchKey: string,
      homeScore: number | "",
      awayScore: number | "",
      isKnockout: boolean,
      roundName: string,
    ) =>
      request<{ success: boolean }>("/results", {
        method: "POST",
        body: JSON.stringify({
          matchKey,
          homeScore,
          awayScore,
          isKnockout,
          roundName,
        }),
      }),
  },

  leaderboard: {
    get: () => request<LeaderboardEntry[]>("/leaderboard"),
  },

  groups: {
    get: () =>
      request<Record<string, { teams: string[]; matches: number[][] }>>(
        "/groups",
      ),
  },

  flags: {
    get: () => request<Record<string, string>>("/flags"),
  },

  teamCodes: {
    get: () => request<Record<string, string>>("/team-codes"),
  },

  knockout: {
    get: () =>
      request<{ id: string; name: string; matches: number }[]>("/knockout"),
  },

  admin: {
    users: {
      get: () =>
        request<
          {
            id: number;
            username: string;
            email: string;
            isAdmin: boolean;
            createdAt: string;
          }[]
        >("/admin/users"),
      resetPassword: (userId: number, newPassword: string) =>
        request<{ success: boolean }>("/admin/reset-password", {
          method: "POST",
          body: JSON.stringify({ userId, newPassword }),
        }),
    },
  },
};

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
}
