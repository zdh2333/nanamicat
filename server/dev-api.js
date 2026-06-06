import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const REVIEW_STATUSES = new Set(["pending", "reviewed", "included", "rejected", "approved"]);

function newId(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

function cleanNickname(value) {
  const nickname = String(value || "").trim().replace(/\s+/g, " ");
  if (!nickname) throw new Error("Nickname is required");
  if (nickname.length > 24) throw new Error("Nickname must be 24 characters or fewer");
  return nickname;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email format");
  return email;
}

function normalizeGroups(groups) {
  if (!Array.isArray(groups) || !groups.length) {
    throw new Error("Puzzle submissions must contain at least 1 group");
  }
  const normalized = groups.map((group, index) => {
    const name = String(group?.name || "").trim();
    const words = Array.isArray(group?.words)
      ? group.words.map((word) => String(word).trim()).filter(Boolean)
      : [];
    if (!name && !words.length) return null;
    if (!name) throw new Error(`Group ${index + 1} needs a name`);
    if (words.length !== 4) throw new Error(`Group ${index + 1} must contain exactly 4 words`);
    return { name, words };
  });
  const filled = normalized.filter(Boolean);
  if (!filled.length) throw new Error("Puzzle submissions must contain at least 1 group");
  if (filled.length > 10) throw new Error("Puzzle submissions can include at most 10 groups");
  return filled;
}

function deriveSubmissionTitle({ title, groups, nickname }) {
  const trimmed = String(title || "").trim();
  if (trimmed) return trimmed.slice(0, 80);
  const fromGroups = groups.map((group) => group.name).filter(Boolean).join(" / ");
  if (fromGroups) return fromGroups.slice(0, 80);
  return `投稿 ${String(nickname || "Guest").trim() || "Guest"}`.slice(0, 80);
}

function normalizeReviewStatus(status) {
  const value = String(status || "").trim();
  if (value === "approved") return "included";
  return value;
}

function parseSubmissionGroups(groupsJson) {
  try {
    const parsed = JSON.parse(groupsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildApprovedTextPuzzles(submissions) {
  const groupColors = ["yellow", "green", "blue", "purple"];
  const approvedGroups = submissions
    .filter((submission) => submission.status === "approved" || submission.status === "included")
    .flatMap((submission) => submission.groups.map((group) => ({
      name: String(group.name || "").trim(),
      words: Array.isArray(group.words) ? group.words.map((word) => String(word).trim()).filter(Boolean) : [],
      sourceId: submission.id
    })))
    .filter((group) => group.name && group.words.length === 4);

  const puzzles = [];
  for (let index = 0; index + 3 < approvedGroups.length; index += 4) {
    const chunk = approvedGroups.slice(index, index + 4);
    const groups = chunk.map((group, groupIndex) => ({
      name: group.name,
      color: groupColors[groupIndex],
      description: "游客贡献",
      items: group.words,
      sourceId: group.sourceId
    }));
    puzzles.push({
      id: `community-${index / 4}`,
      source: "community",
      groups,
      items: groups.flatMap((group, groupIndex) =>
        group.items.map((word, wordIndex) => ({
          id: `community-${index / 4}-${groupIndex}-${wordIndex}`,
          label: word,
          groupName: group.name
        }))
      )
    });
  }
  return puzzles;
}

function serializeSubmission(row) {
  const groups = Array.isArray(row.groups) ? row.groups : parseSubmissionGroups(row.groups_json);
  const names = groups.map((group) => group.name).filter(Boolean);
  const summary = names.length ? `${groups.length} 组：${names.join(" / ")}` : row.title;
  return {
    ...row,
    groups,
    groups_json: JSON.stringify(groups),
    group_count: groups.length,
    summary,
    status: normalizeReviewStatus(row.status)
  };
}

async function readJson(path, fallback) {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      await mkdir(dirname(path), { recursive: true });
      if (fallback !== undefined) {
        await writeFile(path, `${JSON.stringify(fallback, null, 2)}\n`, "utf8");
        return fallback;
      }
      return fallback;
    }
    throw error;
  }
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function mountDevApi(app, dataDir, { adminKey = "", allowOpenAdmin = false } = {}) {
  const playersFile = join(dataDir, "players.json");
  const eventsFile = join(dataDir, "score_events.json");
  const submissionsFile = join(dataDir, "puzzle_submissions.json");

  function requireAdmin(request, response) {
    if (request.get("cf-access-authenticated-user-email")) return true;
    if (adminKey && request.get("x-admin-key") === adminKey) return true;
    if (allowOpenAdmin) return true;
    response.status(403).json({ error: "Admin access required" });
    return false;
  }

  async function readPlayers() {
    return readJson(playersFile, []);
  }

  async function readEvents() {
    return readJson(eventsFile, []);
  }

  async function readSubmissions() {
    return readJson(submissionsFile, []);
  }

  app.get("/api/leaderboard", async (_request, response) => {
    const players = await readPlayers();
    response.json({
      leaderboard: [...players]
        .sort((a, b) => b.total_score - a.total_score || b.text_clears - a.text_clears)
        .slice(0, 100)
    });
  });

  app.post("/api/player", async (request, response) => {
    try {
      const nickname = cleanNickname(request.body.nickname);
      const playerId = String(request.body.playerId || "").trim();
      const now = new Date().toISOString();
      const players = await readPlayers();

      if (playerId) {
        const existing = players.find((item) => item.id === playerId);
        if (existing) {
          existing.nickname = nickname;
          existing.updated_at = now;
          await writeJson(playersFile, players);
          return response.json({ player: existing });
        }
      }

      const byName = players.find((item) => item.nickname === nickname);
      if (byName) {
        byName.nickname = nickname;
        byName.updated_at = now;
        await writeJson(playersFile, players);
        return response.json({ player: byName });
      }

      const player = {
        id: newId("player"),
        nickname,
        text_clears: 0,
        total_score: 0,
        created_at: now,
        updated_at: now
      };
      players.push(player);
      await writeJson(playersFile, players);
      response.status(201).json({ player });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  app.post("/api/score", async (request, response) => {
    try {
      const mode = String(request.body.mode || "text").trim();
      const puzzleId = String(request.body.puzzleId || "").trim();
      const playerId = String(request.body.playerId || "").trim();
      const nickname = cleanNickname(request.body.nickname);
      if (mode !== "text") throw new Error("Mode must be text");
      if (!puzzleId || !playerId) throw new Error("Player id and puzzle id are required");

      const players = await readPlayers();
      const player = players.find((item) => item.id === playerId);
      if (!player) throw new Error("Player does not exist");

      const events = await readEvents();
      const dedupeKey = `${playerId}|${mode}|${puzzleId}`;
      let duplicate = events.some((item) => item.dedupe_key === dedupeKey);
      if (!duplicate) {
        const now = new Date().toISOString();
        events.unshift({
          id: newId("score"),
          dedupe_key: dedupeKey,
          player_id: playerId,
          nickname,
          mode,
          puzzle_id: puzzleId,
          points: 1,
          created_at: now
        });
        player.nickname = nickname;
        player.text_clears += 1;
        player.total_score += 1;
        player.updated_at = now;
        await writeJson(eventsFile, events);
        await writeJson(playersFile, players);
      }

      response.json({ player, points: 1, duplicate });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  app.post("/api/puzzles", async (request, response) => {
    try {
      const nickname = cleanNickname(request.body.nickname || "Guest");
      const groups = normalizeGroups(request.body.groups);
      const title = deriveSubmissionTitle({ title: request.body.title, groups, nickname });
      const now = new Date().toISOString();
      const submission = {
        id: newId("submission"),
        player_id: String(request.body.playerId || "").trim() || null,
        nickname,
        contact_email: normalizeEmail(request.body.email),
        title,
        groups,
        groups_json: JSON.stringify(groups),
        status: "pending",
        created_at: now,
        updated_at: now
      };
      const submissions = await readSubmissions();
      submissions.unshift(submission);
      await writeJson(submissionsFile, submissions);
      response.status(201).json({
        submission: serializeSubmission(submission),
        email: { attempted: false, sent: false }
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  app.get("/api/puzzles", async (_request, response) => {
    const submissions = await readSubmissions();
    response.json({ puzzles: buildApprovedTextPuzzles(submissions.map(serializeSubmission)) });
  });

  app.get("/api/admin/puzzles", async (request, response) => {
    if (!requireAdmin(request, response)) return;
    const submissions = await readSubmissions();
    response.json({ submissions: submissions.map(serializeSubmission) });
  });

  app.patch("/api/admin/puzzles/:id", async (request, response) => {
    if (!requireAdmin(request, response)) return;
    const status = normalizeReviewStatus(request.body?.status);
    if (!REVIEW_STATUSES.has(status)) {
      response.status(400).json({ error: "Invalid review status" });
      return;
    }
    const submissions = await readSubmissions();
    const submission = submissions.find((item) => item.id === request.params.id);
    if (!submission) {
      response.status(404).json({ error: "Submission not found" });
      return;
    }
    submission.status = status;
    submission.updated_at = new Date().toISOString();
    await writeJson(submissionsFile, submissions);
    response.json({ submission: serializeSubmission(submission) });
  });

  app.get("/api/admin/scores", async (request, response) => {
    if (!requireAdmin(request, response)) return;
    const events = await readEvents();
    response.json({ scores: events.slice(0, 100) });
  });
}
