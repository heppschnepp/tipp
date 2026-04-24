import { useState, useEffect } from "react";
import { api, Predictions } from "../api";
import {
  KnockoutRound,
  Results,
  parseScore,
  MAX_SCORE,
  PROHIBITED,
} from "../types";

interface KnockoutTabData {
  isAdmin: boolean;
  results: Results;
  predictions: Predictions;
  knockout: KnockoutRound[];
  showToast: (msg: string) => void;
}

export default function KnockoutTab({
  isAdmin,
  results,
  predictions,
  knockout,
  showToast,
}: KnockoutTabData) {
  const [localPredictions, setLocalPredictions] =
    useState<Predictions>(predictions);
  const scores = isAdmin ? results : localPredictions;
  const [saving, setSaving] = useState<boolean>(false);

  // Update local predictions when props change
  useEffect(() => {
    setLocalPredictions(predictions);
  }, [predictions]);

  const setScore = async (key: string, h: number | "", a: number | "") => {
    if (h === "" && a === "") return;
    setSaving(true);
    try {
      await api.predictions.save(key, h, a);
      setLocalPredictions((prev) => ({
        ...prev,
        [key]: { homeScore: h as number, awayScore: a as number },
      }));
      showToast("Prediction saved");
    } catch {
      showToast("Failed to save");
    } finally {
      setSaving(false);
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
                const result = results[key]; // Actual match results

                // Check if match is finished (has results)
                const isMatchFinished =
                  result?.homeScore !== undefined &&
                  result?.awayScore !== undefined;

                const homeScore = sc?.homeScore;
                const awayScore = sc?.awayScore;
                return (
                  <div key={i} className="bk-match">
                    <div
                      className={`bk-team ${homeScore > awayScore ? "winner" : ""}`}
                    >
                      <div className="bk-team-info">
                        <img
                          src="/flags/xx.png"
                          alt="TBD"
                          className="team-flag"
                        />
                        <span className="bk-team-name">TBD</span>
                      </div>
                      {isAdmin ? (
                        <div className="bk-score-display">
                          {homeScore !== undefined ? (
                            <span>{homeScore}</span>
                          ) : (
                            <span className="not-started">{PROHIBITED}</span>
                          )}
                        </div>
                      ) : (
                        <div className="bk-score-wrap">
                          <input
                            className="bk-score"
                            type="number"
                            aria-label={`${key} home score`}
                            min="0"
                            max={MAX_SCORE}
                            disabled={saving || isMatchFinished}
                            value={homeScore !== undefined ? homeScore : ""}
                            placeholder="-"
                            onChange={(e) => {
                              // Don't allow changes if match is finished
                              if (isMatchFinished) return;
                              const val = parseScore(e.target.value);
                              setScore(key, val, awayScore);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                          {isMatchFinished && (
                            <span className="match-finished">
                              (Match finished: {result?.homeScore} :{" "}
                              {result?.awayScore})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className={`bk-team ${awayScore > homeScore ? "winner" : ""}`}
                    >
                      <div className="bk-team-info away">
                        <span className="bk-team-name">TBD</span>
                        <img
                          src="/flags/xx.png"
                          alt="TBD"
                          className="team-flag"
                        />
                      </div>
                      {isAdmin ? (
                        <div className="bk-score-display">
                          {awayScore !== undefined ? (
                            <span>{awayScore}</span>
                          ) : (
                            <span className="not-started">Not started</span>
                          )}
                        </div>
                      ) : (
                        <div className="bk-score-wrap">
                          <input
                            className="bk-score"
                            type="number"
                            aria-label={`${key} away score`}
                            min="0"
                            max={MAX_SCORE}
                            disabled={saving || isMatchFinished}
                            value={awayScore !== undefined ? awayScore : ""}
                            placeholder="-"
                            onChange={(e) => {
                              // Don't allow changes if match is finished
                              if (isMatchFinished) return;
                              const val = parseScore(e.target.value);
                              setScore(key, homeScore, val);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                          {isMatchFinished && (
                            <span className="match-finished">
                              (Match finished: {result?.homeScore} :{" "}
                              {result?.awayScore})
                            </span>
                          )}
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
