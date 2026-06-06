import { cleanNickname, json, newId, normalizeEmail, normalizeGroups, readJson, requireDb, sendThankYouEmail } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDb(env);
    const body = await readJson(request);
    const nickname = cleanNickname(body.nickname || "Guest");
    const title = String(body.title || "").trim();
    const playerId = String(body.playerId || "").trim() || null;
    const contactEmail = normalizeEmail(body.email);
    const groups = normalizeGroups(body.groups);
    const now = new Date().toISOString();

    if (!title) throw new Error("Puzzle title is required");
    if (title.length > 80) throw new Error("Puzzle title must be 80 characters or fewer");

    const id = newId("submission");
    await db.prepare(`
      INSERT INTO puzzle_submissions (id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(id, playerId, nickname, contactEmail, title, JSON.stringify(groups), now, now).run();

    let email = { attempted: false, sent: false };
    try {
      email = await sendThankYouEmail({
        env,
        to: contactEmail,
        nickname,
        title,
        submissionId: id
      });
    } catch {
      email = { attempted: true, sent: false, reason: "send_failed" };
    }

    return json({
      submission: {
        id,
        player_id: playerId,
        nickname,
        contact_email: contactEmail,
        title,
        groups,
        status: "pending",
        created_at: now,
        updated_at: now
      },
      email
    }, 201);
  } catch (error) {
    const badRequest = /required|must|needs|characters|invalid/i.test(error.message);
    return json({ error: error.message }, badRequest ? 400 : 500);
  }
}
