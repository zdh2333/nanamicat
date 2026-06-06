export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function cleanNickname(value) {
  const nickname = String(value || "").trim().replace(/\s+/g, " ");
  if (!nickname) throw new Error("Nickname is required");
  if (nickname.length > 24) throw new Error("Nickname must be 24 characters or fewer");
  return nickname;
}

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return null;
  if (email.length > 254) throw new Error("Email must be 254 characters or fewer");
  const simpleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!simpleEmail.test(email)) throw new Error("Invalid email format");
  return email;
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function requireDb(env) {
  if (!env.DB) throw new Error("D1 binding DB is not configured");
  return env.DB;
}

export function parseSubmissionGroups(groupsJson) {
  try {
    const parsed = JSON.parse(groupsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatSubmissionSummary({ title, groups, nickname }) {
  const names = (groups || []).map((group) => String(group?.name || "").trim()).filter(Boolean);
  if (names.length) return `${names.length} 组：${names.join(" / ")}`;
  return deriveSubmissionTitle({ title, groups: groups || [], nickname });
}

export async function sendThankYouEmail({ env, to, nickname, title, submissionId, groups }) {
  if (!to) return { attempted: false, sent: false, reason: "missing_email" };

  const apiKey = env.RESEND_API_KEY;
  const from = env.THANK_YOU_EMAIL_FROM || env.MAIL_FROM;
  if (!apiKey || !from) return { attempted: false, sent: false, reason: "not_configured" };

  const siteUrl = env.SITE_URL || "https://nanamicat.com";
  const summary = formatSubmissionSummary({ title, groups, nickname });
  const subject = "感谢投稿到 NanamiCat";
  const text = [
    `你好 ${nickname || "朋友"}，`,
    "",
    "感谢你向 NanamiCat 投稿谜题，我们已经收到并进入待审核队列。",
    `题组：${summary}`,
    `投稿编号：${submissionId}`,
    "",
    `你可以在 ${siteUrl} 继续体验最新题目。`,
    "",
    "—— NanamiCat"
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return {
      attempted: true,
      sent: false,
      reason: payload?.message || `resend_${response.status}`
    };
  }

  return { attempted: true, sent: true };
}

export function requireAdmin(request) {
  const email = request.headers.get("CF-Access-Authenticated-User-Email");
  const jwt = request.headers.get("CF-Access-Jwt-Assertion");
  if (!email || !jwt) {
    return json({ error: "Admin access requires Cloudflare Access" }, 403);
  }
  return null;
}

export function normalizeGroups(groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error("Puzzle submissions must contain at least 1 group");
  }

  const normalized = groups.map((group, index) => {
    const name = String(group?.name || "").trim();
    const words = Array.isArray(group?.words)
      ? group.words.map((word) => String(word).trim()).filter(Boolean)
      : [];

    if (!name && words.length === 0) return null;
    if (!name) throw new Error(`Group ${index + 1} needs a name`);
    if (words.length !== 4) throw new Error(`Group ${index + 1} must contain exactly 4 words`);
    if (words.some((word) => word.length > 24)) throw new Error("Each word must be 24 characters or fewer");

    return { name, words };
  });

  const filled = normalized.filter(Boolean);
  if (!filled.length) throw new Error("Puzzle submissions must contain at least 1 group");
  if (filled.length > 10) throw new Error("Puzzle submissions can include at most 10 groups");
  return filled;
}

export function deriveSubmissionTitle({ title, groups, nickname }) {
  const trimmed = String(title || "").trim();
  if (trimmed) return trimmed.slice(0, 80);
  const fromGroups = groups.map((group) => group.name).filter(Boolean).join(" / ");
  if (fromGroups) return fromGroups.slice(0, 80);
  return `投稿 ${String(nickname || "Guest").trim() || "Guest"}`.slice(0, 80);
}

export function serializeSubmission(row) {
  const groups = parseSubmissionGroups(row.groups_json);
  const summary = formatSubmissionSummary({
    title: row.title,
    groups,
    nickname: row.nickname
  });

  return {
    id: row.id,
    player_id: row.player_id,
    nickname: row.nickname,
    contact_email: row.contact_email,
    title: row.title,
    groups_json: row.groups_json,
    groups,
    group_count: groups.length,
    summary,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export const submissionStatuses = new Set(["pending", "reviewed", "included", "rejected"]);
