import { cleanNickname, json, newId, readJson, requireDb } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDb(env);
    const body = await readJson(request);
    const nickname = cleanNickname(body.nickname);
    const playerId = String(body.playerId || "").trim();
    const now = new Date().toISOString();

    if (playerId) {
      const existing = await db.prepare("SELECT * FROM players WHERE id = ?").bind(playerId).first();
      if (existing) {
        await db.prepare("UPDATE players SET nickname = ?, updated_at = ? WHERE id = ?")
          .bind(nickname, now, playerId)
          .run();
        return json({ player: { ...existing, nickname, updated_at: now } });
      }
    }

    const byName = await db.prepare("SELECT * FROM players WHERE nickname = ?").bind(nickname).first();
    if (byName) return json({ player: byName });

    const id = newId("player");
    await db.prepare(`
      INSERT INTO players (id, nickname, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).bind(id, nickname, now, now).run();

    return json({
      player: {
        id,
        nickname,
        text_clears: 0,
        total_score: 0,
        created_at: now,
        updated_at: now
      }
    }, 201);
  } catch (error) {
    return json({ error: error.message }, error.message.includes("Nickname") ? 400 : 500);
  }
}
