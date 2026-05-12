import { WC2026Match } from "./wc2026.js";

export function mapMatchKey(match: WC2026Match): string {
  // Group stage: e.g., gA0, gA1, ... gL5
  if (match.round === "group" && match.group_name) {
    const groupIndex = match.group_name.charCodeAt(0) - 65; // A=0, B=1, ...
    const globalIdx = match.match_number - 1; // API match_number is 1-based
    const localIdx = globalIdx - groupIndex * 6;
    return `g${match.group_name}m${localIdx}`;
  }

  // Knockout stage: e.g., ko_r32_0, ko_r16_0, ...
  const roundOrder = [
    "Round of 32",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "3rd Place",
    "Final",
  ];
  const roundIdMap: Record<string, string> = {
    "Round of 32": "r32",
    "Round of 16": "r16",
    "Quarter-finals": "qf",
    "Semi-finals": "sf",
    "3rd Place": "3rd",
    Final: "f",
  };

  const roundIdx = roundOrder.indexOf(match.round);
  if (roundIdx === -1) {
    return `match_${match.match_number}`;
  }

  // Each round's match count (in order)
  const roundCounts = [16, 8, 4, 2, 1, 1];
  // Total matches before this round = 72 (group) + sum of previous rounds
  let base = 72;
  for (let i = 0; i < roundIdx; i++) {
    base += roundCounts[i];
  }
  // First match number of this round = base + 1
  const localIdx = match.match_number - (base + 1);
  const roundId = roundIdMap[match.round];
  return `ko_${roundId}_${localIdx}`;
}