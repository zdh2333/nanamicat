import { hasCompleteBilingualGroups, json, normalizeReviewGroups, parseSubmissionGroups, readJson, requireAdmin, requireDb, serializeSubmission, submissionStatuses } from "../../../_utils.js";

export async function onRequestPatch({ request, env, params }) {
  const blocked = requireAdmin(request);
  if (blocked) return blocked;

  try {
    const db = requireDb(env);
    const body = await readJson(request);
    let status = String(body.status || "").trim();
    if (status === "approved") status = "included";
    if (!submissionStatuses.has(status)) {
      throw new Error("Invalid review status");
    }
    let groups = null;
    if (Array.isArray(body.groups)) {
      groups = normalizeReviewGroups(body.groups);
    }
    if (status === "included" && groups && !hasCompleteBilingualGroups(groups)) {
      throw new Error("Included submissions require English group names and four English words per group");
    }

    const id = String(params.id || "").trim();
    if (!id) throw new Error("Submission id is required");
    if (status === "included" && !groups) {
      const current = await db.prepare(`
        SELECT groups_json
        FROM puzzle_submissions
        WHERE id = ?
      `).bind(id).first();
      groups = parseSubmissionGroups(current?.groups_json);
    }
    if (status === "included" && !hasCompleteBilingualGroups(groups)) {
      throw new Error("Included submissions require English group names and four English words per group");
    }

    const now = new Date().toISOString();
    const updated = groups
      ? await db.prepare(`
          UPDATE puzzle_submissions
          SET status = ?, groups_json = ?, updated_at = ?
          WHERE id = ?
        `).bind(status, JSON.stringify(groups), now, id).run()
      : await db.prepare(`
          UPDATE puzzle_submissions
          SET status = ?, updated_at = ?
          WHERE id = ?
        `).bind(status, now, id).run();

    if (!updated.meta?.changes) {
      throw new Error("Submission not found");
    }

    const row = await db.prepare(`
      SELECT id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at
      FROM puzzle_submissions
      WHERE id = ?
    `).bind(id).first();

    return json({ submission: serializeSubmission(row) });
  } catch (error) {
    const badRequest = /invalid|required|not found/i.test(error.message);
    return json({ error: error.message }, badRequest ? 400 : 500);
  }
}
