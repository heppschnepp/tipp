# Tournament Simulation Concept

This document explains how to simulate a full tournament until a final result is produced for more than five players. The simulation runs entirely in memory without modifying any source code.

## Concept

- Simulate a tournament by iteratively matching players and advancing winners based on a defined outcome rule (e.g., higher skill wins).
- Continue matches until one champion remains (single-elimination style) or all matches are completed (round-robin style).
- Use a deterministic outcome rule or seeded randomness to ensure reproducibility.

## How to Run

1. Prepare a player list with unique IDs and optional skill values.
2. Choose a tournament format:
   - Single elimination: repeatedly pair players, simulate matches, keep winners, until one remains.
   - Round-robin: play each pair once, aggregate scores, rank players.
3. Execute the simulation loop:
   - While player count > 1 (or final round):
     - Select pairs.
     - Simulate match outcome.
     - Update standings.
     - Advance winners to next round.
4. Output the final ranking and champion.

Example flow (single elimination):
- Start with N players.
- While players > 1:
  - Pair adjacent players.
  - Determine winner per match.
  - Replace list with winners.
- The last player is the champion.

## Cleanup

- No persistent changes are made to source files or configuration.
- If any temporary files are created during simulation, delete them after review.
- Reverse any temporary configuration (e.g., npm scripts) after demonstration.