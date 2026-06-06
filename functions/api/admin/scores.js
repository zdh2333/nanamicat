import { json, requireAdmin, requireDb } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  const blocked = requireAdmin(request);
  if (blocked) return blocked;

  try {
    const db = requireDb(env);
    const result = await db.prepare(`
      SELECT id, player_id, nickname, mode, puzzle_id, points, created_at
      FROM score_events
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    return json({ scores: result.results ?? [] });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
