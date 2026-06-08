const CACHE_KEY = "nanamicat.puzzle-data.cache";

function textItem(label, puzzleId) {
  return { id: `${puzzleId}-${label}`, label };
}

function buildFromManifest(manifest, textGroupBank) {
  const bankById = Object.fromEntries(
    textGroupBank
      .filter((group) => group.id)
      .map((group) => [group.id, group])
  );

  return manifest.map((entry, index) => {
    const puzzleId = `text-${String(index + 1).padStart(3, "0")}`;
    const groups = entry.groupIds
      .map((groupId, slot) => {
        const source = bankById[groupId];
        if (!source) return null;
        return {
          name: source.name,
          // 每题恰好 4 组（slot 0–3），按槽位赋四色 1/2/3/4，
          // 保证图例四色齐全；manifest 已按难度升序，故槽位顺序=难度顺序。
          level: slot + 1,
          items: source.words.map((word) => textItem(word, puzzleId))
        };
      })
      .filter(Boolean);

    if (groups.length !== 4) return null;

    return {
      id: puzzleId,
      label: `文字题 ${index + 1}`,
      theme: entry.theme,
      type: "text",
      difficulty: entry.difficulty,
      redHerring: entry.redHerring,
      groups
    };
  }).filter(Boolean);
}

function buildLegacyPuzzles(catalog) {
  const { textGroupBank, textPuzzleCount, puzzleThemes, redHerringNotes } = catalog;
  return Array.from({ length: textPuzzleCount }, (_, index) => {
    const difficulty = Math.min(4, Math.floor(index / 25) + 1);
    const candidates = textGroupBank.filter((group) => group.level <= difficulty);
    if (candidates.length < 4) return null;
    const offsets = [0, 7, 19, 31].map(
      (step) => (index * 5 + step + difficulty * 3) % candidates.length
    );
    const puzzleId = `text-${String(index + 1).padStart(3, "0")}`;
    const groups = offsets.map((groupIndex, groupSlot) => {
      const source = candidates[groupIndex];
      if (!source) return null;
      // 同上：按槽位赋四色，保证每题 1/2/3/4 四色齐全。
      const level = groupSlot + 1;
      return {
        name: source.name,
        level,
        items: source.words.map((word) => textItem(word, puzzleId))
      };
    }).filter(Boolean);

    if (groups.length !== 4) return null;

    return {
      id: puzzleId,
      label: `文字题 ${index + 1}`,
      theme: puzzleThemes[index % puzzleThemes.length],
      type: "text",
      difficulty,
      redHerring: redHerringNotes[index % redHerringNotes.length],
      groups
    };
  }).filter(Boolean);
}

export function buildTextPuzzles(catalog) {
  const builtIn = catalog?.textGroupBank?.length
    ? (catalog.textPuzzleManifest?.length
        ? buildFromManifest(catalog.textPuzzleManifest, catalog.textGroupBank)
        : buildLegacyPuzzles(catalog))
    : [];
  const community = Array.isArray(catalog?.communityPuzzles)
    ? catalog.communityPuzzles
    : [];
  return [...builtIn, ...community].filter((puzzle) => puzzle.groups?.length === 4);
}

export async function loadPuzzleCatalog() {
  try {
    const response = await fetch("/puzzle-data.json", { cache: "no-cache" });
    if (response.ok) {
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("题库数据格式无效。");
      }
      if (!data?.textGroupBank?.length) {
        throw new Error("题库数据不完整。");
      }
      try {
        const communityResponse = await fetch("/api/puzzles", { cache: "no-store" });
        if (communityResponse.ok) {
          const community = await communityResponse.json();
          data = {
            ...data,
            communityPuzzles: Array.isArray(community.puzzles) ? community.puzzles : [],
            englishPuzzleTerms: {
              ...(data.englishPuzzleTerms ?? {}),
              ...(community.englishPuzzleTerms ?? {})
            }
          };
        }
      } catch {
        // Community puzzles are additive; keep the built-in catalog if the API is unavailable.
      }
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        // optional cache
      }
      return data;
    }
  } catch {
    // fall through to cache
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  throw new Error("无法加载题库，请检查网络后刷新。");
}

export function getTodayIndex(max) {
  const now = new Date();
  return (now.getUTCFullYear() * 372 + now.getUTCMonth() * 31 + now.getUTCDate()) % Math.max(max, 1);
}

/**
 * Pick the "today" puzzle for a player, but bias away from puzzles whose
 * groups overlap with anything the player has seen recently. This is the
 * runtime half of the "过了几关就重复" fix — the data half lives in
 * regenerate-manifest.mjs which keeps the manifest's window-overlap to 0.
 *
 *   @param pool       — built textPuzzles (length N)
 *   @param recentIds  — array of recent puzzle ids the player has seen,
 *                       most recent last. Empty for first-visit.
 *   @param maxWindow  — how many recent puzzles to consider when checking
 *                       overlap (default 5).
 *   @param maxShared  — tolerate at most this many groupIds in common with
 *                       the recent set (default 1).
 *
 * Behaviour:
 *   1. Take the canonical date-hash index.
 *   2. If that puzzle shares <= maxShared groups with recent, use it.
 *   3. Otherwise scan ±50 around the canonical index (wrapping) and pick
 *      the first candidate that satisfies the overlap constraint. This
 *      gives the player "today's puzzle" deterministically per date, but
 *      never repeats the same group combo they just played.
 *   4. If nothing in the ±50 window works, fall back to the canonical one.
 */
export function getTodayIndexBalanced(pool, recentIds = [], maxWindow = 5, maxShared = 1) {
  if (!pool.length) return 0;
  const canonical = getTodayIndex(pool.length);
  const recentPuzzles = recentIds.slice(-maxWindow);
  const recentGroups = new Set();
  for (const p of recentPuzzles) {
    if (p && Array.isArray(p.groupIds)) {
      for (const gid of p.groupIds) recentGroups.add(gid);
    }
  }
  // Empty recent (first visit, or after localStorage clear): just return canonical.
  if (recentGroups.size === 0) return canonical;

  // Pool puzzles expose their 4 groups as `puzzle.groups` (array of {name, level, items}).
  // We extract a "fingerprint" of group NAMES (not ids) for overlap comparison.
  // buildTextPuzzles does not preserve the manifest's groupIds, but the group
  // name is stable and unique per group, so it works as a fingerprint.
  const groupNames = (puzzle) => (puzzle.groups || []).map((g) => g.name);
  const sharedCount = (puzzle) => groupNames(puzzle).filter((n) => recentGroups.has(n)).length;

  // 2. Canonical already good?
  if (sharedCount(pool[canonical]) <= maxShared) return canonical;

  // 3. Search ±50
  const N = pool.length;
  for (let delta = 1; delta <= 50; delta += 1) {
    for (const sign of [1, -1]) {
      const idx = (canonical + sign * delta + N * 50) % N;
      if (sharedCount(pool[idx]) <= maxShared) return idx;
    }
  }
  return canonical;
}

/**
 * Pick the next puzzle after `puzzleIndex` while avoiding groups the player
 * has just seen. Mirrors getTodayIndexBalanced for the "Next puzzle" button.
 */
export function pickBalancedNext(pool, currentIndex, recentIds = [], maxWindow = 5, maxShared = 1) {
  if (!pool.length) return 0;
  const recentPuzzles = recentIds.slice(-maxWindow);
  const recentGroups = new Set();
  for (const p of recentPuzzles) {
    if (p && Array.isArray(p.groups)) {
      for (const g of p.groups) recentGroups.add(g.name);
    }
  }
  const groupNames = (puzzle) => (puzzle.groups || []).map((g) => g.name);
  const sharedCount = (puzzle) => groupNames(puzzle).filter((n) => recentGroups.has(n)).length;

  const N = pool.length;
  // Try indices starting just after the current one, walking forward.
  for (let delta = 1; delta < N; delta += 1) {
    const idx = (currentIndex + delta) % N;
    if (sharedCount(pool[idx]) <= maxShared) return idx;
  }
  return (currentIndex + 1) % N;
}

export function mostAbstractGroup(groups) {
  return [...groups].sort((a, b) => b.level - a.level)[0];
}
