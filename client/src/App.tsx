import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api, setToken, clearToken } from "./api";
import {
  User,
  Groups,
  Flags,
  Predictions,
  Results,
  LeaderboardEntry,
  KnockoutRound,
} from "./types";
import { Tabs } from "./components/Tabs";
import { ErrorBoundary } from "./components/ErrorBoundary";
import GroupTab from "./components/GroupTab";
import KnockoutTab from "./components/KnockoutTab";
import LeaderboardTab from "./components/LeaderboardTab";
import UserTab from "./components/UserTab";

// Remove duplicate interface definitions that are now in types.ts

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        const { user, token } = await api.auth.register(username, password);
        setToken(token);
        onLogin(user);
      } else {
        const { user, token } = await api.auth.login(username, password);
        setToken(token);
        onLogin(user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="auth-form">
      <h2>{isRegister ? "Register" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isRegister ? "Register" : "Login"}</button>
        <div className="link">
          {isRegister ? (
            <span>
              Already have an account?{" "}
              <a onClick={() => setIsRegister(false)}>Login</a>
            </span>
          ) : (
            <span>
              Don't have an account?{" "}
              <a onClick={() => setIsRegister(true)}>Register</a>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Game({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<string>("groups");
  const [groups, setGroups] = useState<Groups>({});
  const [flags, setFlags] = useState<Flags>({});
  const [knockout, setKnockout] = useState<KnockoutRound[]>([]);
  const [predictions, setPredictions] = useState<Predictions>({});
  const [results, setResults] = useState<Results>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [toast, setToast] = useState<string>("");
  const [users, setUsers] = useState<
    {
      id: number;
      username: string;
      email: string;
      isAdmin: boolean;
      createdAt: string;
    }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const toastRef = React.useRef<number | null>(null);

  const showToast = (msg: string) => {
    if (toastRef.current) {
      clearTimeout(toastRef.current);
    }
    setToast(msg);
    toastRef.current = window.setTimeout(() => {
      setToast("");
      toastRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [g, f, k, p, r, l] = await Promise.all([
        api.groups.get(),
        api.flags.get(),
        api.knockout.get(),
        api.predictions.get(),
        api.results.get(),
        api.leaderboard.get(),
      ]);
      setGroups(g);
      setFlags(f);
      setKnockout(k);
      setPredictions(p);
      setResults(r);
      setLeaderboard(l);
    } catch (err) {
      console.error(err);
    }
  };

  const isAdmin = user.isAdmin;

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const u = await api.admin.users.get();
      setUsers(u);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  return (
    <>
      <header>
        <div>
          <h1>⚽ World Cup 2026</h1>
          <div className="subtitle">Prediction Game</div>
        </div>
        <div className="header-right">
          <span className="user-name">{user.username}</span>
          <button className="nav-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      <Tabs
        tab={tab}
        setTab={setTab}
        isAdmin={user.isAdmin}
        onUsersClick={users.length === 0 ? loadUsers : undefined}
      />
      <main>
        {tab === "groups" && (
          <GroupTab
            groups={groups}
            results={results}
            flags={flags}
            isAdmin={isAdmin}
            showToast={showToast}
          />
        )}
        {tab === "knockout" && (
          <KnockoutTab
            isAdmin={isAdmin}
            results={results}
            predictions={predictions}
            setPredictions={setPredictions}
            knockout={knockout}
            showToast={showToast}
          />
        )}
        {tab === "leaderboard" && (
          <LeaderboardTab results={results} leaderboard={leaderboard} />
        )}
        {tab === "users" && (
          <UserTab
            users={users}
            loadingUsers={loadingUsers}
            showToast={showToast}
          />
        )}
      </main>
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // No auto-login from localStorage – always start at login screen
  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
    );
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Game
                  user={user}
                  onLogout={() => {
                    clearToken();
                    setUser(null);
                  }}
                />
              ) : (
                <Login onLogin={setUser} />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
