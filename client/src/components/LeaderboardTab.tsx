import { LeaderboardEntry, Results } from "../types";

interface LeaderboardTabData {
  results: Results;
  leaderboard: LeaderboardEntry[];
}

export default function LeaderboardTab({
  results,
  leaderboard,
}: LeaderboardTabData) {
  const totalRes = Object.keys(results).filter(
    (k) => results[k]?.homeScore !== undefined,
  ).length;
  const totalPredictions = leaderboard.reduce(
    (acc, p) => acc + p.predictionCount,
    0,
  );
  const totalMatches = 48 + 48 + 8; // group stage + knockout round of 16 + finals

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Results entered</div>
          <div className="stat-value">{totalRes}</div>
          <div className="stat-sub">out of {totalMatches} matches</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total predictions</div>
          <div className="stat-value">{totalPredictions}</div>
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
              <th>Predictions</th>
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
                  <span className="lb-pred">{p.predictionCount}</span>
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
}
