const API_BASE = '/api';

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface Predictions {
  [key: string]: {
    homeScore: number;
    awayScore: number;
  };
}

interface Results {
  [key: string]: {
    homeScore: number;
    awayScore: number;
    isKnockout: boolean;
    roundName: string;
  };
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  exact: number;
  outcome: number;
  total: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = path.includes('?') 
    ? `${API_BASE}${path}&_t=${Date.now()}` 
    : `${API_BASE}${path}?_t=${Date.now()}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    register: (username: string, password: string, email?: string) =>
      request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, email }),
      }),

    login: (username: string, password: string) =>
      request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),

    me: () => request<{ user: User }>('/auth/me').then(r => r.user),
  },

  predictions: {
    get: () => request<Predictions>('/predictions'),
    save: (matchKey: string, homeScore: number | '', awayScore: number | '') =>
      request<{ success: boolean }>('/predictions', {
        method: 'POST',
        body: JSON.stringify({ matchKey, homeScore, awayScore }),
      }),
  },

  results: {
    get: () => request<Results>('/results'),
    save: (matchKey: string, homeScore: number | '', awayScore: number | '', isKnockout: boolean, roundName: string) =>
      request<{ success: boolean }>('/results', {
        method: 'POST',
        body: JSON.stringify({ matchKey, homeScore, awayScore, isKnockout, roundName }),
      }),
  },

  leaderboard: {
    get: () => request<LeaderboardEntry[]>('/leaderboard'),
  },

  groups: {
    get: () => request<Record<string, { teams: string[]; matches: number[][] }>>('/groups'),
  },

  flags: {
    get: () => request<Record<string, string>>('/flags'),
  },

  knockout: {
    get: () => request<{ id: string; name: string; matches: number }[]>('/knockout'),
  },
};

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function clearToken() {
  localStorage.removeItem('token');
}