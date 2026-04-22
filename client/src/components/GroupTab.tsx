import { useState } from "react";
import { api, Flags, Groups, Predictions } from "../api";
import { prohibited, Results } from "../App";

interface GroupTabData {
  groups: Groups;
  results: Results;
  flags: Flags;
  isAdmin: boolean;
  showToast: (msg: string) => void;
}

export default function GroupTab({
  groups,
  results,
  flags,
  isAdmin,
  showToast,
}: GroupTabData) {
  const [predictions, setPredictions] = useState<Predictions>({});

  const scores = isAdmin ? results : predictions;

  const groupStandings = (gk: string, scores: Predictions | Results) => {
    const g = groups[gk];
    if (!g) return [];
    const teams = g.teams.map((t) => ({
      name: t,
      pts: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      played: 0,
      w: 0,
      d: 0,
      l: 0,
    }));
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
    teams.sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.name.localeCompare(b.name),
    );
    return teams;
  };

  const setScore = async (key: string, h: number | "", a: number | "") => {
    try {
      await api.predictions.save(key, h, a);
      setPredictions((prev) => ({
        ...prev,
        [key]: { homeScore: h as number, awayScore: a as number },
      }));
      showToast("Prediction saved");
    } catch (err) {
      showToast("Failed to save");
    }
  };

  const renderScoreDisplay = (
    key: string,
    scores: Predictions | Results,
    isAdminView: boolean,
  ) => {
    const sc = scores[key] || {};

    if (isAdminView) {
      if (sc?.homeScore !== undefined && sc?.awayScore !== undefined) {
        return `${sc.homeScore} : ${sc.awayScore}`;
      }
      return <span className="not-started">{prohibited}</span>;
    } else {
      return (
        <div className="score-input">
          <input
            type="number"
            min="0"
            max="20"
            value={sc.homeScore !== undefined ? sc.homeScore : ""}
            placeholder="-"
            onChange={(e) => {
              const val = e.target.value === "" ? "" : parseInt(e.target.value);
              setScore(
                key,
                val,
                sc.awayScore !== undefined ? sc.awayScore : "",
              );
            }}
            onFocus={(e) => e.target.select()}
          />
          <span className="score-sep">:</span>
          <input
            type="number"
            min="0"
            max="20"
            value={sc.awayScore !== undefined ? sc.awayScore : ""}
            placeholder="-"
            onChange={(e) => {
              const val = e.target.value === "" ? "" : parseInt(e.target.value);
              setScore(
                key,
                sc.homeScore !== undefined ? sc.homeScore : "",
                val,
              );
            }}
            onFocus={(e) => e.target.select()}
          />
        </div>
      );
    }
  };

  const flag = (team: string) => flags[team] || "🏳";

  return (
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
                  <tr
                    key={t.name}
                    className={
                      idx < 2 ? (idx === 0 ? "qualify-1" : "qualify-2") : ""
                    }
                  >
                    <td>
                      <span className={`pos-badge p${idx + 1}`}>{idx + 1}</span>
                    </td>
                    <td>
                      <span className="flag">{flag(t.name)}</span>
                      <span className="team-name">{t.name}</span>
                    </td>
                    <td>{t.played}</td>
                    <td>{t.pts}</td>
                    <td>
                      {t.gd > 0 ? "+" : ""}
                      {t.gd}
                    </td>
                    <td>{t.gf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="matches-section">
              <h4>
                {isAdmin ? "Match Results (auto-fetched)" : "Your Predictions"}
              </h4>
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
}
