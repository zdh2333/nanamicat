import { json, requireDb } from "../_utils.js";

export async function onRequestGet({ env }) {
  try {
    const db = requireDb(env);
    const result = await db.prepare(`
      SELECT id, nickname, text_clears, total_score, updated_at
      FROM players
      ORDER BY total_score DESC, updated_at DESC
      LIMIT 20
    `).all();

    return json({ leaderboard: result.results ?? [] });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
