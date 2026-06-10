export const pendingScoreStorageKey = "nanamicat.pendingScorePuzzleIds";

function uniqueCompletedPuzzleIds(puzzleIds) {
  const seen = new Set();
  const result = [];

  for (const rawId of puzzleIds || []) {
    const puzzleId = String(rawId || "").trim();
    if (!puzzleId || puzzleId === "loading" || seen.has(puzzleId)) continue;
    seen.add(puzzleId);
    result.push(puzzleId);
  }

  return result;
}

export function readPendingScorePuzzleIds(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(pendingScoreStorageKey) || "[]");
    return Array.isArray(parsed) ? uniqueCompletedPuzzleIds(parsed) : [];
  } catch {
    return [];
  }
}

export function writePendingScorePuzzleIds(puzzleIds, storage = globalThis.localStorage) {
  try {
    storage?.setItem(pendingScoreStorageKey, JSON.stringify(uniqueCompletedPuzzleIds(puzzleIds)));
  } catch {
    // Score sync is best-effort; gameplay must continue when storage is unavailable.
  }
}

export function addPendingScorePuzzleId(puzzleId, storage = globalThis.localStorage) {
  const current = readPendingScorePuzzleIds(storage);
  writePendingScorePuzzleIds([...current, puzzleId], storage);
}

export function removePendingScorePuzzleIds(puzzleIds, storage = globalThis.localStorage) {
  const remove = new Set(uniqueCompletedPuzzleIds(puzzleIds));
  if (!remove.size) return;
  writePendingScorePuzzleIds(readPendingScorePuzzleIds(storage).filter((puzzleId) => !remove.has(puzzleId)), storage);
}

export async function syncPlayedPuzzleScores({ player, nickname, puzzleIds, submitScore }) {
  if (!player?.id || typeof submitScore !== "function") {
    return { player, submitted: 0, syncedPuzzleIds: [] };
  }

  const cleanName = String(nickname || player.nickname || "").trim();
  if (!cleanName) return { player, submitted: 0, syncedPuzzleIds: [] };

  let latestPlayer = player;
  let submitted = 0;
  const syncedPuzzleIds = [];
  for (const puzzleId of uniqueCompletedPuzzleIds(puzzleIds)) {
    const payload = await submitScore({
      playerId: player.id,
      nickname: cleanName,
      mode: "text",
      puzzleId
    });
    submitted += 1;
    syncedPuzzleIds.push(puzzleId);
    if (payload?.player) latestPlayer = payload.player;
  }

  return { player: latestPlayer, submitted, syncedPuzzleIds };
}
