import { useState, useEffect } from "react";
import { api, Predictions } from "../api";
import type { Match } from "../types";
import {
  KnockoutRound,
  Results,
  parseScore,
  MAX_SCORE,
} from "../types";

interface KnockoutTabData {
  isAdmin: boolean;
  results: Results;
  predictions: Predictions;
  knockout: KnockoutRound[];
  matches: Match[];
  teamCodes: Record<string, string>;
  showToast: (msg: string) => void;
}

export default function KnockoutTab({
  isAdmin,
  results,
  predictions,
  knockout,
  matches,
  teamCodes,
  showToast,
}: KnockoutTabData) {
  const [localPredictions, setLocalPredictions] =
    useState<Predictions>(predictions);
  const scores = isAdmin ? results : localPredictions;
  const [saving, setSaving] = useState<boolean>(false);

  // Build a map of matchKey -> match data for quick lookup
  const matchMap = matches.reduce<Record<string, Match>>((acc, m) => {
    acc[m.matchKey] = m;
    return acc;
  }, {});

  // Update local predictions when props change
  useEffect(() => {
    setLocalPredictions(predictions);
  }, [predictions]);

  const getFlagUrl = (teamName: string | null): string => {
    if (!teamName) return "/flags/xx.png";
    const code = teamCodes[teamName];
    return code ? `/flags/${code}.png` : "/flags/xx.png";
  };

const setScore = async (key: string, h: number | "", a: number | "") => {
      if (h === "" && a === "") return;
      // Prevent admins from making guesses
      if (isAdmin) {
        showToast("Admins cannot make predictions");
        return;
      }
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
                const result = results[key];
                const isMatchFinished =
                  result?.homeScore != null &&
                  result?.awayScore != null;

                const homeScore = sc?.homeScore;
                const awayScore = sc?.awayScore;
                const homeScoreVal = homeScore ?? 0;
                const awayScoreVal = awayScore ?? 0;

                // Look up actual match data
                const matchData = matchMap[key];
                const homeTeam = matchData?.homeTeamName || "TBD";
                const awayTeam = matchData?.awayTeamName || "TBD";

                return (
                  <div key={i} className="bk-match">
                    <div
                      className={`bk-team ${homeScoreVal > awayScoreVal ? "winner" : ""}`}
                    >
                      <div className="bk-team-info">
                        <img
                          src={getFlagUrl(homeTeam)}
                          alt={homeTeam}
                          className="team-flag"
                        />
                        <span className="bk-team-name">{homeTeam}</span>
                      </div>
                      {isAdmin ? (
                        <div className="bk-score-display">
                            {homeScore != null && homeScore !== undefined ? (
                                <span>{homeScore}</span>
                            ) : (
                                <span className="not-started">no result available</span>
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
                            value={homeScore != null ? homeScore : ""}
                            placeholder="-"
                            onChange={(e) => {
                              if (isMatchFinished) return;
                              const val = parseScore(e.target.value);
                              setScore(key, val, awayScore != null ? awayScore : "");
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                          {isMatchFinished && (
                            <span className="match-finished">
                              (Match finished: {result?.homeScore} : {result?.awayScore})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className={`bk-team ${awayScoreVal > homeScoreVal ? "winner" : ""}`}
                    >
                      <div className="bk-team-info away">
                        <span className="bk-team-name">{awayTeam}</span>
                        <img
                          src={getFlagUrl(awayTeam)}
                          alt={awayTeam}
                          className="team-flag"
                        />
                      </div>
                      {isAdmin ? (
                        <div className="bk-score-display">
                            {awayScore != null && awayScore !== undefined ? (
                                <span>{awayScore}</span>
                            ) : (
                                <span className="not-started">no result available</span>
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
                            value={awayScore != null ? awayScore : ""}
                            placeholder="-"
                            onChange={(e) => {
                              if (isMatchFinished) return;
                              const val = parseScore(e.target.value);
                              setScore(key, homeScore != null ? homeScore : "", val);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                          {isMatchFinished && (
                            <span className="match-finished">
                              (Match finished: {result?.homeScore} : {result?.awayScore})
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
