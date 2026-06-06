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
      .map((groupId) => {
        const source = bankById[groupId];
        if (!source) return null;
        return {
          name: source.name,
          level: source.level,
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
      const level = Math.min(4, Math.max(source.level, groupSlot + 1));
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
  if (!catalog?.textGroupBank?.length) return [];
  const built = catalog.textPuzzleManifest?.length
    ? buildFromManifest(catalog.textPuzzleManifest, catalog.textGroupBank)
    : buildLegacyPuzzles(catalog);
  return built.filter((puzzle) => puzzle.groups?.length === 4);
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
