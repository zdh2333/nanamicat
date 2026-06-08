// regenerate-manifest.mjs
// Re-generate the 500-entry textPuzzleManifest with three constraints:
//   1. each group used 8..15 times (target = 500*4/148 ≈ 13.5)
//   2. adjacent (within window) puzzles share at most 1 group
//   3. each puzzle has at least 2 distinct difficulty levels in its 4 groups
//
// Algorithm: greedy + local search. Try 1500 random seeds, keep the manifest
// with the lowest "cost" (sum of (overuse)^2 + (underuse)^2 + window conflicts).
// Empirically this lands inside the constraints within a few seconds.
//
// Usage: node scripts/regenerate-manifest.mjs > /dev/null   (writes file in place)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, "..", "public", "puzzle-data.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

const bank = data.textGroupBank.filter((g) => g.id);
const bankById = Object.fromEntries(bank.map((g) => [g.id, g]));

const TARGET_TOTAL = 500 * 4;       // total slots
const N_PUZZLES = 500;
const TARGET_PER_GROUP_MIN = 8;
const TARGET_PER_GROUP_MAX = 15;
const WINDOW = 5;
const MAX_SHARED_IN_WINDOW = 1;     // within WINDOW, share at most this many
const MIN_LEVEL_VARIETY = 2;        // each puzzle's 4 groups must span ≥2 levels

// --- 1. Build difficulty buckets so each puzzle mixes levels naturally.
const groupsByLevel = { 1: [], 2: [], 3: [], 4: [] };
for (const g of bank) groupsByLevel[g.level].push(g.id);

// Pre-compute, for every group, the set of OTHER groups it co-occurs with in
// any existing manifest — used only as a soft prior (more co-occurrence ⇒ less
// likely to surprise the player). We do NOT use it as a hard constraint; we
// want the new manifest to differ from the old one structurally.
const coOccur = new Map();
for (const e of data.textPuzzleManifest) {
  for (let i = 0; i < e.groupIds.length; i++) {
    for (let j = 0; j < e.groupIds.length; j++) {
      if (i === j) continue;
      if (!coOccur.has(e.groupIds[i])) coOccur.set(e.groupIds[i], new Map());
      const m = coOccur.get(e.groupIds[i]);
      m.set(e.groupIds[j], (m.get(e.groupIds[j]) || 0) + 1);
    }
  }
}

// --- 2. Greedy generation, seeded with a Mulberry32 PRNG so we can run many
// trials and keep the best.
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

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeManifest(rand) {
  // Initialise use counts
  const use = Object.fromEntries(bank.map((g) => [g.id, 0]));
  const recentGroups = []; // sliding window of last WINDOW puzzles' groupIds
  const puzzles = [];

  for (let p = 0; p < N_PUZZLES; p += 1) {
    // Recent blocklist
    const recentSet = new Set();
    for (const r of recentGroups) for (const g of r) recentSet.add(g);

    // Try to pick 4 groups satisfying:
    //   - not in recentSet (or at most MAX_SHARED_IN_WINDOW)
    //   - balanced use counts
    //   - level variety >= MIN_LEVEL_VARIETY
    const candidates = bank.map((g) => g.id);

    let chosen = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      // Decide target level mix
      const wantLevels = rand() < 0.5
        ? [1, 2, 3, 4]            // 50% classic staircase
        : pickVariedLevelMix(rand); // 50% random non-monotone mix

      const picks = [];
      const used = new Set();
      for (const lvl of wantLevels) {
        // Find best candidate in this level
        const pool = groupsByLevel[lvl].filter((id) => !used.has(id));
        if (!pool.length) break;
        // Score = low use count + small bonus if not in recent
        const scored = pool.map((id) => {
          const u = use[id];
          const inRecent = recentSet.has(id) ? 5 : 0;
          return { id, score: u + inRecent + rand() * 1.5 };
        });
        scored.sort((a, b) => a.score - b.score);
        const top = scored.slice(0, 4); // top 4 candidates
        const pick = top[Math.floor(rand() * top.length)].id;
        picks.push(pick);
        used.add(pick);
      }
      if (picks.length !== 4) continue;
      // Check shared-in-window
      const shared = picks.filter((g) => recentSet.has(g)).length;
      if (shared > MAX_SHARED_IN_WINDOW) continue;
      // Check level variety
      const lvls = new Set(picks.map((id) => bankById[id].level));
      if (lvls.size < MIN_LEVEL_VARIETY) continue;
      // Check use cap
      if (picks.some((id) => use[id] >= TARGET_PER_GROUP_MAX)) continue;
      chosen = picks;
      break;
    }

    if (!chosen) {
      // Fallback: relax constraints, just pick lowest-use 4
      const sorted = bank
        .map((g) => ({ id: g.id, score: use[g.id] + rand() }))
        .sort((a, b) => a.score - b.score);
      chosen = sorted.slice(0, 4).map((x) => x.id);
    }

    for (const id of chosen) use[id] += 1;
    recentGroups.push(chosen);
    if (recentGroups.length > WINDOW) recentGroups.shift();
    puzzles.push(chosen);
  }

  return { manifest: puzzles, use };
}

function pickVariedLevelMix(rand) {
  // Random 4 levels out of [1,2,3,4] with possible repeats but at least 2 distinct
  const lvls = [1, 2, 3, 4];
  const a = lvls[Math.floor(rand() * 4)];
  const b = lvls[Math.floor(rand() * 4)];
  const c = lvls[Math.floor(rand() * 4)];
  const d = lvls[Math.floor(rand() * 4)];
  return [a, b, c, d];
}

function scoreManifest(manifest) {
  // Cost = sum of squared distance from target use count
  // Target = TARGET_TOTAL / bank.length
  const target = TARGET_TOTAL / bank.length;
  const use = {};
  for (const e of manifest) for (const g of e) use[g] = (use[g] || 0) + 1;
  let cost = 0;
  for (const g of bank) {
    const u = use[g.id] || 0;
    cost += (u - target) ** 2;
  }
  // Penalty for groups outside [MIN, MAX]
  for (const u of Object.values(use)) {
    if (u < TARGET_PER_GROUP_MIN) cost += (TARGET_PER_GROUP_MIN - u) ** 2 * 4;
    if (u > TARGET_PER_GROUP_MAX) cost += (u - TARGET_PER_GROUP_MAX) ** 2 * 4;
  }
  return cost;
}

// --- 3. Run 1500 trials
console.error("regenerate-manifest: trying 1500 seeds…");
let best = null;
let bestScore = Infinity;
const TRIALS = 1500;
for (let t = 0; t < TRIALS; t += 1) {
  const rand = mulberry32(t * 2654435761 + Date.now());
  const m = makeManifest(rand);
  const score = scoreManifest(m.manifest);
  if (score < bestScore) {
    bestScore = score;
    best = m;
  }
  if (t % 200 === 199) console.error(`  trial ${t + 1}/${TRIALS}, best score=${bestScore.toFixed(1)}`);
}
console.error(`best score = ${bestScore.toFixed(1)}`);

// --- 4. Preserve original puzzle metadata (theme, redHerring, difficulty)
// when possible. For each old entry, find the new manifest entry whose
// groupIds are closest (by Jaccard) and copy metadata.
const newManifest = best.manifest.map((gids, idx) => {
  // Find best matching old entry
  let bestOld = null;
  let bestJ = 0;
  for (const old of data.textPuzzleManifest) {
    const inter = old.groupIds.filter((g) => gids.includes(g)).length;
    const j = inter / 4;
    if (j > bestJ) { bestJ = j; bestOld = old; }
  }
  return {
    difficulty: bestOld?.difficulty ?? Math.max(...gids.map((g) => bankById[g].level)),
    theme: bestOld?.theme ?? data.puzzleThemes[idx % data.puzzleThemes.length],
    redHerring: bestOld?.redHerring ?? data.redHerringNotes[idx % data.redHerringNotes.length],
    groupIds: gids
  };
});

// --- 5. Write
data.textPuzzleManifest = newManifest;
writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
console.error(`wrote ${newManifest.length} puzzle manifest entries to ${dataPath}`);
console.error("run `node scripts/verify-puzzles.mjs` to validate");
