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
  "Kara",
  "Liam",
];

function simulateMatch(p1, p2) {
  return Math.random() < 0.5 ? p1 : p2;
}

function simulateTournament(players) {
  let round = 1,
    current = players.map((p) => ({ player: p, eliminatedRound: null }));

  while (current.length > 1) {
    const next = [];
    if (current.length === 2) {
      const p1 = current[0],
        p2 = current[1];
      const guess1 = Math.random() < 0.5 ? "opponent" : "self";
      const guess2 = Math.random() < 0.5 ? "opponent" : "self";
      const guessedP1 = guess2 === p1.player;
      const guessedP2 = guess1 === p2.player;
      let winner;
      if (guessedP1 && !guessedP2) winner = p1;
      else if (guessedP2 && !guessedP1) winner = p2;
      else winner = simulateMatch(p1.player, p2.player);
      next.push({ player: winner, eliminatedRound: null });
      next.push({
        player: winner === p1.player ? p2 : p1,
        eliminatedRound: null,
      });
    } else {
      if (current.length % 2 === 1) next.push(current.pop());
      for (let i = 0; i < current.length; i += 2)
        next.push({
          player: simulateMatch(current[i].player, current[i + 1].player),
          eliminatedRound: null,
        });
    }
    current = next;
    round++;
  }

  return {
    champion: current[0]?.player || "Unknown",
    placement: current.map((p) => ({
      player: p.player,
      eliminatedRound: null,
      place: 1,
    })),
  };
}

const result = simulateTournament(players);
console.log("Champion:", result.champion);
console.log("\nFinal Placement:");
result.placement.forEach((p) =>
  console.log(`${p.place}: ${p.player} (never eliminated)`),
);
