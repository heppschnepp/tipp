import { api, Predictions } from "../api";
import { KnockoutRound, prohibited, Results } from "../App";

interface KnockoutTabData {
  isAdmin: boolean;
  results: Results;
  predictions: Predictions;
  setPredictions: React.Dispatch<React.SetStateAction<Predictions>>;
  knockout: KnockoutRound[];
  showToast: (msg: string) => void;
}

export default function KnockoutTab({
  isAdmin,
  results,
  predictions,
  setPredictions,
  knockout,
  showToast,
}: KnockoutTabData) {
  const scores = isAdmin ? results : predictions;
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
  return (
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
                    <div
                      className={`bk-team ${homeScore > awayScore ? "winner" : ""}`}
                    >
                      <span className="bk-team-name">TBD</span>
                      {isAdmin ? (
                        <div className="bk-score-display">
                          {homeScore !== undefined ? (
                            homeScore
                          ) : (
                            <span className="not-started">{prohibited}</span>
                          )}
                        </div>
                      ) : (
                        <div className="bk-score-wrap">
                          <input
                            className="bk-score"
                            type="number"
                            min="0"
                            max="20"
                            value={homeScore !== undefined ? homeScore : ""}
                            placeholder="-"
                            onChange={(e) => {
                              const val =
                                e.target.value === ""
                                  ? ""
                                  : parseInt(e.target.value);
                              setScore(key, val, awayScore);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      )}
                    </div>
                    <div
                      className={`bk-team ${awayScore > homeScore ? "winner" : ""}`}
                    >
                      <span className="bk-team-name">TBD</span>
                      {isAdmin ? (
                        <div className="bk-score-display">
                          {awayScore !== undefined ? (
                            awayScore
                          ) : (
                            <span className="not-started">Not started</span>
                          )}
                        </div>
                      ) : (
                        <div className="bk-score-wrap">
                          <input
                            className="bk-score"
                            type="number"
                            min="0"
                            max="20"
                            value={awayScore !== undefined ? awayScore : ""}
                            placeholder="-"
                            onChange={(e) => {
                              const val =
                                e.target.value === ""
                                  ? ""
                                  : parseInt(e.target.value);
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
}
