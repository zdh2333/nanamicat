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

export function mostAbstractGroup(groups) {
  return [...groups].sort((a, b) => b.level - a.level)[0];
}
