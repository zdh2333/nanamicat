import { json, requireAdmin, requireDb } from "../../_utils.js";

export async function onRequestGet({ request, env }) {
  const blocked = requireAdmin(request);
  if (blocked) return blocked;

  try {
    const db = requireDb(env);
    const result = await db.prepare(`
      SELECT id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at
      FROM puzzle_submissions
      ORDER BY created_at DESC
      LIMIT 100
    `).all();

    return json({ submissions: result.results ?? [] });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}
