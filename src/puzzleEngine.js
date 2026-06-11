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

function termToEnglish(value, terms) {
  if (typeof value !== "string") return value;
  return terms[value] ?? value;
}

function mapCommunityPuzzleToEnglish(puzzle, terms) {
  if (!puzzle || typeof puzzle !== "object") return puzzle;
  return {
    ...puzzle,
    label: termToEnglish(puzzle.label, terms),
    theme: termToEnglish(puzzle.theme, terms),
    redHerring: termToEnglish(puzzle.redHerring, terms),
    groups: Array.isArray(puzzle.groups)
      ? puzzle.groups.map((group) => ({
          ...group,
          name: termToEnglish(group.name, terms),
          items: Array.isArray(group.items)
            ? group.items.map((item) => ({
                ...item,
                label: termToEnglish(item.label, terms),
                alt: termToEnglish(item.alt, terms)
              }))
            : group.items
        }))
      : puzzle.groups
  };
}

function buildEnglishCatalog(catalog) {
  const terms = catalog?.englishPuzzleTerms ?? {};
  if (!terms || Object.keys(terms).length === 0) return catalog;

  return {
    ...catalog,
    textGroupBank: Array.isArray(catalog.textGroupBank)
      ? catalog.textGroupBank.map((group) => ({
          ...group,
          name: termToEnglish(group.name, terms),
          words: Array.isArray(group.words)
            ? group.words.map((word) => termToEnglish(word, terms))
            : group.words
        }))
      : catalog.textGroupBank,
    puzzleThemes: Array.isArray(catalog.puzzleThemes)
      ? catalog.puzzleThemes.map((theme) => termToEnglish(theme, terms))
      : catalog.puzzleThemes,
    redHerringNotes: Array.isArray(catalog.redHerringNotes)
      ? catalog.redHerringNotes.map((note) => termToEnglish(note, terms))
      : catalog.redHerringNotes,
    textPuzzleManifest: Array.isArray(catalog.textPuzzleManifest)
      ? catalog.textPuzzleManifest.map((entry) => ({
          ...entry,
          theme: termToEnglish(entry.theme, terms),
          redHerring: termToEnglish(entry.redHerring, terms)
        }))
      : catalog.textPuzzleManifest,
    communityPuzzles: Array.isArray(catalog.communityPuzzles)
      ? catalog.communityPuzzles.map((puzzle) => mapCommunityPuzzleToEnglish(puzzle, terms))
      : catalog.communityPuzzles
  };
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

/**
 * Choose the puzzle-data URL for a given UI locale.
 *   - "ja" loads puzzle-data-ja.json (independently curated Japanese catalog)
 *   - "zh"/"en" load puzzle-data.json; English is materialized from
 *     englishPuzzleTerms at runtime so puzzle content is truly English.
 *
 * Each locale has its own localStorage cache key so caches never bleed
 * across locales (especially zh/en, because their transformed payloads differ).
 */
function catalogUrlFor(locale) {
  if (locale === "ja") return "/puzzle-data-ja.json";
  return "/puzzle-data.json";
}
function catalogCacheKeyFor(locale) {
  if (locale === "ja") return `${CACHE_KEY}.ja`;
  if (locale === "en") return `${CACHE_KEY}.en`;
  return CACHE_KEY;
}

const CATALOG_ERRORS = {
  formatInvalid: {
    zh: "题库数据格式无效。",
    en: "Invalid puzzle data format.",
    ja: "パズルデータの形式が無効です。"
  },
  dataIncomplete: {
    zh: "题库数据不完整。",
    en: "Puzzle data is incomplete.",
    ja: "パズルデータが不完全です。"
  },
  loadFailed: {
    zh: "无法加载题库，请检查网络后刷新。",
    en: "Failed to load puzzles. Check your connection and try again.",
    ja: "問題の読み込みに失敗しました。接続を確認して再読み込みしてください。"
  }
};

function catalogError(key, locale) {
  const map = CATALOG_ERRORS[key] || CATALOG_ERRORS.loadFailed;
  return new Error(map[locale] || map.en);
}

export async function loadPuzzleCatalog(locale = "zh") {
  const url = catalogUrlFor(locale);
  const cacheKey = catalogCacheKeyFor(locale);
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (response.ok) {
      let data;
      try {
        data = await response.json();
      } catch {
        throw catalogError("formatInvalid", locale);
      }
      if (!data?.textGroupBank?.length) {
        throw catalogError("dataIncomplete", locale);
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
      const localizedData = locale === "en" ? buildEnglishCatalog(data) : data;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(localizedData));
      } catch {
        // optional cache
      }
      return localizedData;
    }
  } catch {
    // fall through to cache
  }

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore
  }

  // Last-ditch: if the user is on ja and the JA catalog failed to load, fall
  // back to the Chinese catalog so the page still works. Better to show
  // Chinese than a "could not load" error.
  if (locale === "ja") {
    return loadPuzzleCatalog("zh");
  }
  throw catalogError("loadFailed", locale);
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
 *   @param maxShared  — tolerate at most this many groups in common with
 *                       the recent set. Default 0 = "all four groups must
 *                       be new". This is the strictness the player feels as
 *                       "every puzzle feels fresh".
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
export function getTodayIndexBalanced(pool, recentIds = [], maxWindow = 5, maxShared = 0) {
  if (!pool.length) return 0;

  // Determine target difficulty: cycle D1→D2→D3→D4→D1 based on UTC date so
  // each difficulty appears equally often. D4 has many more puzzles in zh (328
  // vs 100 each for D1-D3), so without targeting it would dominate ~52% of
  // days. Cycling ensures all four difficulties get equal screen time.
  const now = new Date();
  const dayKey = now.getUTCFullYear() * 372 + now.getUTCMonth() * 31 + now.getUTCDate();
  const targetDifficulty = (dayKey % 4) + 1;

  const canonical = getTodayIndex(pool.length);
  const recentPuzzles = recentIds.slice(-maxWindow);
  const recentGroups = new Set();
  for (const p of recentPuzzles) {
    if (p && Array.isArray(p.groups)) {
      for (const g of p.groups) recentGroups.add(g.name);
    }
  }

  const groupNames = (puzzle) => (puzzle.groups || []).map((g) => g.name);
  const sharedCount = (puzzle) => groupNames(puzzle).filter((n) => recentGroups.has(n)).length;

  // Build a sub-pool for the target difficulty level
  const targetEntries = pool.map((p, i) => ({ p, i })).filter(({ p }) => p.difficulty === targetDifficulty);

  if (targetEntries.length > 0) {
    // Within target difficulty, pick by a daily hash of that sub-pool
    const subCanonical = getTodayIndex(targetEntries.length);

    if (recentGroups.size === 0) return targetEntries[subCanonical].i;

    if (sharedCount(targetEntries[subCanonical].p) <= maxShared) {
      return targetEntries[subCanonical].i;
    }

    // Search ±all within target difficulty sub-pool
    const N = targetEntries.length;
    for (let delta = 1; delta <= N; delta += 1) {
      for (const sign of [1, -1]) {
        const idx = (subCanonical + sign * delta + N * 100) % N;
        if (sharedCount(targetEntries[idx].p) <= maxShared) return targetEntries[idx].i;
      }
    }

    // Overlap unavoidable — still stay within target difficulty
    return targetEntries[subCanonical].i;
  }

  // Fallback: no puzzles of target difficulty (shouldn't happen), use original logic
  if (recentGroups.size === 0) return canonical;
  if (sharedCount(pool[canonical]) <= maxShared) return canonical;

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
 * has just seen. Cycles through difficulty levels D1→D2→D3→D4→D1 so the
 * player never gets two consecutive puzzles at the same difficulty.
 */
export function pickBalancedNext(pool, currentIndex, recentIds = [], maxWindow = 5, maxShared = 0) {
  if (!pool.length) return 0;

  // Advance to the next difficulty level in the rotation
  const currentDifficulty = pool[currentIndex]?.difficulty ?? 1;
  const targetDifficulty = (currentDifficulty % 4) + 1;

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

  // Pass 1: target difficulty + no group overlap
  for (let delta = 1; delta < N; delta += 1) {
    const idx = (currentIndex + delta) % N;
    if (pool[idx].difficulty === targetDifficulty && sharedCount(pool[idx]) <= maxShared) return idx;
  }

  // Pass 2: any difficulty + no group overlap
  for (let delta = 1; delta < N; delta += 1) {
    const idx = (currentIndex + delta) % N;
    if (sharedCount(pool[idx]) <= maxShared) return idx;
  }

  return (currentIndex + 1) % N;
}

export function mostAbstractGroup(groups) {
  return [...groups].sort((a, b) => b.level - a.level)[0];
}
