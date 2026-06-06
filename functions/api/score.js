import { cleanNickname, json, newId, readJson, requireDb } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDb(env);
    const body = await readJson(request);
    const mode = String(body.mode || "text").trim();
    const puzzleId = String(body.puzzleId || "").trim();
    const playerId = String(body.playerId || "").trim();
    const nickname = cleanNickname(body.nickname);

    if (mode !== "text") throw new Error("Mode must be text");
    if (!puzzleId) throw new Error("Puzzle id is required");
    if (!playerId) throw new Error("Player id is required");

    const player = await db.prepare("SELECT * FROM players WHERE id = ?").bind(playerId).first();
    if (!player) throw new Error("Player does not exist");

    const points = 1;
    const now = new Date().toISOString();
    const eventId = newId("score");
    const insert = await db.prepare(`
      INSERT OR IGNORE INTO score_events (id, player_id, nickname, mode, puzzle_id, points, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(eventId, playerId, nickname, mode, puzzleId, points, now).run();

    if (insert.meta?.changes) {
      await db.prepare(`
        UPDATE players
        SET nickname = ?,
            text_clears = text_clears + 1,
            total_score = total_score + ?,
            updated_at = ?
        WHERE id = ?
      `).bind(nickname, points, now, playerId).run();
    }

    const updated = await db.prepare("SELECT * FROM players WHERE id = ?").bind(playerId).first();
    return json({ player: updated, points, duplicate: !insert.meta?.changes });
  } catch (error) {
    const badRequest = /required|must|does not exist/i.test(error.message);
    return json({ error: error.message }, badRequest ? 400 : 500);
  }
}
