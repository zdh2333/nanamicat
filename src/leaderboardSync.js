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

export async function syncPlayedPuzzleScores({ player, nickname, puzzleIds, submitScore }) {
  if (!player?.id || typeof submitScore !== "function") {
    return { player, submitted: 0 };
  }

  const cleanName = String(nickname || player.nickname || "").trim();
  if (!cleanName) return { player, submitted: 0 };

  let latestPlayer = player;
  let submitted = 0;
  for (const puzzleId of uniqueCompletedPuzzleIds(puzzleIds)) {
    const payload = await submitScore({
      playerId: player.id,
      nickname: cleanName,
      mode: "text",
      puzzleId
    });
    submitted += 1;
    if (payload?.player) latestPlayer = payload.player;
  }

  return { player: latestPlayer, submitted };
}
