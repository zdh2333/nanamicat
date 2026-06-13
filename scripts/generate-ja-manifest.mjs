// generate-ja-manifest.mjs — Build a 100-entry puzzleManifest for the
// Japanese catalog with the same constraints as the Chinese one:
//   - each group used 5..12 times (smaller pool, smaller range)
//   - adjacent (window=5) share at most 1 group
//   - each puzzle mixes ≥2 difficulty levels
//
// Usage: node scripts/generate-ja-manifest.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, "..", "public", "puzzle-data-ja.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

const bank = data.textGroupBank.filter((g) => g.id);
const bankById = Object.fromEntries(bank.map((g) => [g.id, g]));
const N_PUZZLES = 100;
const WINDOW = 5;
const MAX_SHARED_IN_WINDOW = 1;
const MIN_LEVEL_VARIETY = 2;
const TARGET_PER_GROUP_MIN = 3;
const TARGET_PER_GROUP_MAX = 14;

const groupsByLevel = { 1: [], 2: [], 3: [], 4: [] };
for (const g of bank) groupsByLevel[g.level].push(g.id);

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeManifest(rand) {
  const use = Object.fromEntries(bank.map((g) => [g.id, 0]));
  const recentGroups = [];
  const puzzles = [];

  for (let p = 0; p < N_PUZZLES; p += 1) {
    const recentSet = new Set();
    for (const r of recentGroups) for (const g of r) recentSet.add(g);

    // Each puzzle has exactly 1 L1 + 1 L2 + 1 L3 + 1 L4. This guarantees
    // every group in the bank (incl. abstract L3/L4) gets used and the
    // player feels a difficulty staircase. It also keeps the bank from
    // collapsing to "L1 only" when the L3/L4 pool is small.
    const wantLevels = [1, 2, 3, 4];

    let chosen = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const picks = [];
      const used = new Set();
      for (const lvl of wantLevels) {
        const pool = groupsByLevel[lvl].filter((id) => !used.has(id));
        if (!pool.length) break;
        const scored = pool.map((id) => {
          const u = use[id];
          const inRecent = recentSet.has(id) ? 5 : 0;
          return { id, score: u + inRecent + rand() * 1.5 };
        });
        scored.sort((a, b) => a.score - b.score);
        const top = scored.slice(0, 4);
        const pick = top[Math.floor(rand() * top.length)].id;
        picks.push(pick);
        used.add(pick);
      }
      if (picks.length !== 4) continue;
      const shared = picks.filter((g) => recentSet.has(g)).length;
      if (shared > MAX_SHARED_IN_WINDOW) continue;
      const lvls = new Set(picks.map((id) => bankById[id].level));
      if (lvls.size < MIN_LEVEL_VARIETY) continue;
      if (picks.some((id) => use[id] >= TARGET_PER_GROUP_MAX)) continue;
      chosen = picks;
      break;
    }
    if (!chosen) {
      const sorted = bank.map((g) => ({ id: g.id, score: use[g.id] + rand() })).sort((a, b) => a.score - b.score);
      chosen = sorted.slice(0, 4).map((x) => x.id);
    }
    for (const id of chosen) use[id] += 1;
    recentGroups.push(chosen);
    if (recentGroups.length > WINDOW) recentGroups.shift();
    puzzles.push(chosen);
  }
  return { manifest: puzzles, use };
}

function score(manifest) {
  const target = (N_PUZZLES * 4) / bank.length;
  const use = {};
  for (const e of manifest) for (const g of e) use[g] = (use[g] || 0) + 1;
  let cost = 0;
  for (const g of bank) {
    const u = use[g.id] || 0;
    cost += (u - target) ** 2;
    if (u < TARGET_PER_GROUP_MIN) cost += (TARGET_PER_GROUP_MIN - u) ** 2 * 4;
    if (u > TARGET_PER_GROUP_MAX) cost += (u - TARGET_PER_GROUP_MAX) ** 2 * 4;
  }
  return cost;
}

console.error("generate-ja-manifest: trying 1500 seeds…");
let best = null;
let bestScore = Infinity;
for (let t = 0; t < 1500; t += 1) {
  const m = makeManifest(mulberry32(t * 2654435761 + Date.now()));
  const s = score(m.manifest);
  if (s < bestScore) { bestScore = s; best = m; }
  if (t % 200 === 199) console.error(`  trial ${t + 1}/1500, best=${bestScore.toFixed(1)}`);
}
console.error(`best score = ${bestScore.toFixed(1)}`);

const newManifest = best.manifest.map((gids, idx) => {
  const maxL = Math.max(...gids.map((g) => bankById[g].level));
  return {
    difficulty: maxL,
    theme: data.puzzleThemes[idx % data.puzzleThemes.length],
    redHerring: data.redHerringNotes[idx % data.redHerringNotes.length],
    groupIds: gids
  };
});
data.textPuzzleManifest = newManifest;
writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");

// Print a quick stat summary
const use = {};
for (const e of newManifest) for (const g of e.groupIds) use[g] = (use[g] || 0) + 1;
const counts = Object.values(use);
counts.sort((a, b) => a - b);
console.error(`group usage: min=${counts[0]} median=${counts[Math.floor(counts.length/2)]} max=${counts[counts.length-1]}`);
console.error(`wrote ${newManifest.length} puzzles to ${dataPath}`);
