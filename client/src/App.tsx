import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api, setToken, getToken, clearToken } from './api';

interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

interface Groups {
  [key: string]: { teams: string[]; matches: number[][] };
}

interface Flags {
  [key: string]: string;
}

interface Predictions {
  [key: string]: { homeScore: number; awayScore: number };
}

interface Results {
  [key: string]: { homeScore: number; awayScore: number };
}

interface LeaderboardEntry {
  userId: number;
  username: string;
  exact: number;
  outcome: number;
  total: number;
}

interface KnockoutRound {
  id: string;
  name: string;
  matches: number;
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-form">
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
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
        <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
        <div className="link">
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <a onClick={() => setIsRegister(false)}>Login</a>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <a onClick={() => setIsRegister(true)}>Register</a>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Game({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState('groups');
  const [groups, setGroups] = useState<Groups>({});
  const [flags, setFlags] = useState<Flags>({});
  const [knockout, setKnockout] = useState<KnockoutRound[]>([]);
  const [predictions, setPredictions] = useState<Predictions>({});
  const [results, setResults] = useState<Results>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
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

  const flag = (team: string) => flags[team] || '🏳';

  const setScore = async (key: string, h: number | '', a: number | '') => {
    try {
      await api.predictions.save(key, h, a);
      setPredictions((prev) => ({ ...prev, [key]: { homeScore: h as number, awayScore: a as number } }));
      showToast('Prediction saved');
    } catch (err) {
      showToast('Failed to save');
    }
  };

  const isAdmin = user.isAdmin;
  const scores = isAdmin ? results : predictions;

  const groupStandings = (gk: string, scores: Predictions | Results) => {
    const g = groups[gk];
    if (!g) return [];
    const teams = g.teams.map((t) => ({ name: t, pts: 0, gf: 0, ga: 0, gd: 0, played: 0, w: 0, d: 0, l: 0 }));
    g.matches.forEach((m, i) => {
      const key = `g${gk}m${i}`;
      const sc = scores[key];
      if (sc && sc.homeScore !== undefined && sc.awayScore !== undefined) {
        const h = sc.homeScore;
        const a = sc.awayScore;
        teams[m[0]].gf += h;
        teams[m[0]].ga += a;
        teams[m[1]].gf += a;
        teams[m[1]].ga += h;
        teams[m[0]].played++;
        teams[m[1]].played++;
        if (h > a) {
          teams[m[0]].pts += 3;
          teams[m[0]].w++;
          teams[m[1]].l++;
        } else if (h < a) {
          teams[m[1]].pts += 3;
          teams[m[1]].w++;
          teams[m[0]].l++;
        } else {
          teams[m[0]].pts++;
          teams[m[0]].d++;
          teams[m[1]].pts++;
          teams[m[1]].d++;
        }
      }
    });
    teams.forEach((t) => (t.gd = t.gf - t.ga));
    teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
    return teams;
  };

  const renderScoreDisplay = (key: string, scores: Predictions | Results, isAdminView: boolean) => {
    const sc = scores[key] || {};

    if (isAdminView) {
      if (sc?.homeScore !== undefined && sc?.awayScore !== undefined) {
        return `${sc.homeScore} : ${sc.awayScore}`;
      }
      return <span className="not-started">Not started yet</span>;
    } else {
      return (
        <div className="score-input">
          <input
            type="number"
            min="0"
            max="20"
            value={sc.homeScore !== undefined ? sc.homeScore : ''}
            placeholder="-"
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseInt(e.target.value);
              setScore(key, val, sc.awayScore !== undefined ? sc.awayScore : '');
            }}
            onFocus={(e) => e.target.select()}
          />
          <span className="score-sep">:</span>
          <input
            type="number"
            min="0"
            max="20"
            value={sc.awayScore !== undefined ? sc.awayScore : ''}
            placeholder="-"
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseInt(e.target.value);
              setScore(key, sc.homeScore !== undefined ? sc.homeScore : '', val);
            }}
            onFocus={(e) => e.target.select()}
          />
        </div>
      );
    }
  };

  const renderGroups = () => (
    <div className="groups-grid">
      {Object.keys(groups).map((gk) => {
        const g = groups[gk];
        const standings = groupStandings(gk, scores);
        return (
          <div key={gk} className="group-card">
            <div className="group-header">
              <span className="group-name">Group {gk}</span>
              <small>Top 2 advance</small>
            </div>
            <table className="standings">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>Pts</th>
                  <th>GD</th>
                  <th>GF</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((t, idx) => (
                  <tr key={t.name} className={idx < 2 ? (idx === 0 ? 'qualify-1' : 'qualify-2') : ''}>
                    <td>
                      <span className={`pos-badge p${idx + 1}`}>{idx + 1}</span>
                    </td>
                    <td>
                      <span className="flag">{flag(t.name)}</span>
                      <span className="team-name">{t.name}</span>
                    </td>
                    <td>{t.played}</td>
                    <td>{t.pts}</td>
                    <td>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                    <td>{t.gf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="matches-section">
              <h4>{isAdmin ? 'Match Results (auto-fetched)' : 'Your Predictions'}</h4>
              {g.matches.map((m, i) => {
                const key = `g${gk}m${i}`;
                const t1 = g.teams[m[0]];
                const t2 = g.teams[m[1]];
                return (
                  <div key={i} className="match-row">
                    <span className="match-team">
                      {flag(t1)} {t1}
                    </span>
                    {renderScoreDisplay(key, scores, isAdmin)}
                    <span className="match-team away">
                      {t2} {flag(t2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderKnockout = () => (
    <div className="knockout-section">
      <div className="bracket">
        {knockout.map((r) => (
          <div key={r.id} className="round">
            <div className="round-title">{r.name}</div>
            <div className="bk-matches">
              {Array.from({ length: r.matches }).map((_, i) => {
                const key = `ko_${r.id}_${i}`;
                const sc = scores[key] || {};
                const homeScore = sc?.homeScore;
                const awayScore = sc?.awayScore;
                return (
                  <div key={i} className="bk-match">
                    <div className={`bk-team ${homeScore > awayScore ? 'winner' : ''}`}>
                      <span className="bk-team-name">TBD</span>
                      {isAdmin ? (
                        <div className="bk-score-display">
                          {homeScore !== undefined ? homeScore : <span className="not-started">Not started yet</span>}
                        </div>
                      ) : (
                        <div className="bk-score-wrap">
                          <input
                            className="bk-score"
                            type="number"
                            min="0"
                            max="20"
                            value={homeScore !== undefined ? homeScore : ''}
                            placeholder="-"
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : parseInt(e.target.value);
                              setScore(key, val, awayScore);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      )}
                    </div>
                    <div className={`bk-team ${awayScore > homeScore ? 'winner' : ''}`}>
                      <span className="bk-team-name">TBD</span>
                    {isAdmin ? (
                      <div className="bk-score-display">
                        {awayScore !== undefined ? awayScore : <span className="not-started">Not started yet</span>}
                      </div>
                    ) : (
                      <div className="bk-score-wrap">
                        <input
                          className="bk-score"
                          type="number"
                          min="0"
                          max="20"
                          value={awayScore !== undefined ? awayScore : ''}
                          placeholder="-"
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                            setScore(key, homeScore, val);
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLeaderboard = () => {
    const totalRes = Object.keys(results).filter((k) => results[k]?.homeScore !== undefined).length;
    const totalPred = leaderboard.reduce((acc, p) => acc + p.exact + p.outcome, 0);

    return (
      <>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Results entered</div>
            <div className="stat-value">{totalRes}</div>
            <div className="stat-sub">out of 104 matches</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total predictions</div>
            <div className="stat-value">{totalPred}</div>
            <div className="stat-sub">across all players</div>
          </div>
        </div>
        <div className="leaderboard">
          <div className="leaderboard-header">
            <h2>Leaderboard</h2>
            <p>5 pts exact score · 2 pts correct outcome</p>
          </div>
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Points</th>
                <th>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((p, i) => (
                <tr key={p.userId}>
                  <td>
                    <span className={`lb-rank r${i + 1}`}>{i + 1}</span>
                  </td>
                  <td>
                    <div className="lb-name">{p.username}</div>
                  </td>
                  <td>
                    <span className="lb-pts">{p.total}</span>
                  </td>
                  <td>
                    <div className="pts-breakdown">
                      <span>
                        <strong>{p.exact}</strong>exact
                      </span>
                      <span>
                        <strong>{p.outcome}</strong>outcome
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <>
      <header>
        <div>
          <h1>⚽ World Cup 2026</h1>
          <div className="subtitle">Prediction Game</div>
        </div>
        <div className="header-right">
          <button className="nav-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      <div className="tabs">
        <div className={`tab ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>
          Group Stage
        </div>
        <div className={`tab ${tab === 'knockout' ? 'active' : ''}`} onClick={() => setTab('knockout')}>
          Knockout
        </div>
        <div className={`tab ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>
          Leaderboard
        </div>
      </div>
      <main>
        {tab === 'groups' && renderGroups()}
        {tab === 'knockout' && renderKnockout()}
        {tab === 'leaderboard' && renderLeaderboard()}
      </main>
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.auth.me()
        .then((u) => setUser(u as User))
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Game user={user} onLogout={() => { clearToken(); setUser(null); }} />
            ) : (
              <Login onLogin={setUser} />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}