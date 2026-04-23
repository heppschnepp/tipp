const players = [
  "Alice",
  "Bob",
  "Charlie",
  "Dave",
  "Eve",
  "Frank",
  "Grace",
  "Henry",
  "Ivy",
  "Jack",
]; // >5 players

function simulateMatch(p1, p2) {
  return Math.random() < 0.5 ? p1 : p2;
}
function simulateTournament(players) {
  let round = 1,
    current = players.map((p) => ({ player: p, eliminatedRound: null })),
    history = [];
  while (current.length > 1) {
    const next = [];
    if (current.length % 2 === 1) {
      const byePlayer = current.pop();
      next.push(byePlayer);
    }
    for (let i = 0; i < current.length; i += 2) {
      const p1 = current[i],
        p2 = current[i + 1],
        winner = simulateMatch(p1.player, p2.player);
      const loser = winner === p1.player ? p2 : p1;
      loser.eliminatedRound = round;
      next.push({ player: winner, eliminatedRound: null });
    }
    history.push({ round, matches: current.map((c) => c.player) });
    current = next;
    round++;
  }
  current[0].eliminatedRound = null;
  const eliminatedMap = {};
  history.forEach((r) =>
    r.matches.forEach((m) => {
      if (!eliminatedMap[m]) eliminatedMap[m] = r.round;
    }),
  );
  eliminatedMap[current[0].player] = null;
  const ranked = Object.keys(eliminatedMap).map((p) => ({
    player: p,
    eliminatedRound: eliminatedMap[p],
  }));
  ranked.sort((a, b) => {
    const ar = a.eliminatedRound === null ? Infinity : a.eliminatedRound;
    const br = b.eliminatedRound === null ? Infinity : b.eliminatedRound;
    return ar !== br ? br - ar : a.player.localeCompare(b.player);
  });
  const placement = [];
  let prevRound,
    place = 0;
  ranked.forEach((r, i) => {
    if (i === 0 || r.eliminatedRound !== prevRound) place = i + 1;
    placement.push({
      player: r.player,
      eliminatedRound: r.eliminatedRound,
      place,
    });
    prevRound = r.eliminatedRound;
  });
  return { champion: current[0].player, placement };
}

const result = simulateTournament(players);
console.log("Champion:", result.champion);
console.log("\nRanking (place: player [eliminated round]):");
result.placement.forEach((p) =>
  console.log(
    `${p.place}: ${p.player} (${p.eliminatedRound === null ? "W" : `R${p.eliminatedRound}`})`,
  ),
);
