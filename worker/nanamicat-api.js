const STATUSES = new Set(['pending', 'reviewed', 'included', 'rejected', 'approved']);
const REVIEW_STATUSES = new Set(['pending', 'reviewed', 'included', 'rejected']);
const GROUP_COLORS = ['yellow', 'green', 'blue', 'purple'];
const SCORE_KEY_PATTERN = /^(text-(\d{3}|built-in-\d+|community-\d+)|image-(yellow|green|blue|purple)-(yellow|green|blue|purple)-\d+)$/;

// Admin routes are served via CF Access or x-admin-key; do not advertise x-admin-key in CORS.
const ALLOWED_ORIGINS = new Set(['https://nanamicat.com', 'https://www.nanamicat.com']);

function corsHeaders(request) {
  const origin = request?.headers?.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://nanamicat.com';
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function readPuzzleSubmissionRows(env, { limit = 100 } = {}) {
  const result = await env.DB.prepare(`
    SELECT id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at
    FROM puzzle_submissions
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all();
  return result.results ?? [];
}

async function readSubmissions(env) {
  return (await readPuzzleSubmissionRows(env)).map((row) => ({
    id: row.id,
    nickname: row.nickname,
    title: row.title,
    contactEmail: row.contact_email,
    groups: parseSubmissionGroups(row.groups_json),
    status: row.status === 'approved' ? 'included' : row.status,
    thankYouEmail: { status: 'not_requested' },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function insertSubmission(env, submission) {
  const now = submission.updatedAt || submission.createdAt || new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO puzzle_submissions (
      id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    submission.id,
    submission.playerId || null,
    submission.nickname,
    submission.contactEmail || null,
    submission.title,
    JSON.stringify(submission.groups),
    submission.status === 'approved' ? 'included' : submission.status,
    submission.createdAt || now,
    submission.updatedAt || now,
  ).run();
}

async function readScores(env) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, dedupe_key, nickname, mode, puzzle_key, points, created_at
      FROM scores ORDER BY created_at DESC`,
    ).all();
    if (results?.length) {
      return results.map((row) => ({
        id: row.id,
        dedupeKey: row.dedupe_key,
        nickname: row.nickname,
        mode: row.mode,
        puzzleKey: row.puzzle_key,
        points: row.points,
        createdAt: row.created_at,
      }));
    }
  } catch {
    // fall through to score_events
  }

  const { results } = await env.DB.prepare(
    `SELECT id, player_id, nickname, mode, puzzle_id, points, created_at
    FROM score_events ORDER BY created_at DESC`,
  ).all();
  return (results ?? []).map((row) => ({
    id: row.id,
    dedupeKey: `${row.player_id}|${row.mode}|${row.puzzle_id}`,
    nickname: row.nickname,
    mode: row.mode,
    puzzleKey: row.puzzle_id,
    points: row.points,
    createdAt: row.created_at,
  }));
}

async function consumeRateLimit(request, env, bucket, limit, windowSeconds) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const windowId = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `rate:${bucket}:${ip}:${windowId}`;
  const current = Number(await env.NANAMICAT_SUBMISSIONS.get(key) || 0);
  if (current >= limit) return false;
  await env.NANAMICAT_SUBMISSIONS.put(key, String(current + 1), { expirationTtl: windowSeconds * 2 });
  return true;
}

function publicScoreboard(scores) {
  const rows = new Map();
  for (const score of scores) {
    const nickname = String(score.nickname || '').trim();
    if (!nickname) continue;
    const nicknameKey = nickname.toLowerCase();
    const existing = rows.get(nicknameKey) || {
      nickname,
      textClears: 0,
      imageClears: 0,
      score: 0,
      latestAt: score.createdAt,
    };
    if (score.mode === 'image') existing.imageClears += 1;
    else existing.textClears += 1;
    existing.score += Number(score.points || 0);
    if (!existing.latestAt || new Date(score.createdAt) > new Date(existing.latestAt)) existing.latestAt = score.createdAt;
    rows.set(nicknameKey, existing);
  }
  return [...rows.values()]
    .sort((a, b) => b.score - a.score || new Date(b.latestAt) - new Date(a.latestAt))
    .slice(0, 50)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

function validateScore(body) {
  const nickname = String(body?.nickname || '').trim();
  if (!nickname) return 'Please enter a nickname.';
  if (nickname.length > 32) return 'Nickname is too long.';
  if (!['text', 'image'].includes(body?.mode)) return 'Invalid puzzle mode.';
  const puzzleKey = String(body?.puzzleKey || '').trim();
  if (!puzzleKey) return 'Missing puzzle key.';
  if (!SCORE_KEY_PATTERN.test(puzzleKey)) return 'Invalid puzzle key.';
  return null;
}

function buildApprovedTextPuzzles(submissions) {
  const approvedGroups = submissions
    .filter((submission) => submission.status === 'approved' || submission.status === 'included')
    .flatMap((submission) => submission.groups.map((group) => ({
      name: String(group.name || '').trim(),
      words: Array.isArray(group.words) ? group.words.map((word) => String(word).trim()).filter(Boolean) : [],
      sourceId: submission.id,
    })))
    .filter((group) => group.name && group.words.length === 4);

  const puzzles = [];
  for (let index = 0; index + 3 < approvedGroups.length; index += 4) {
    const chunk = approvedGroups.slice(index, index + 4);
    const groups = chunk.map((group, groupIndex) => ({
      name: group.name,
      color: GROUP_COLORS[groupIndex],
      description: '游客贡献',
      items: group.words,
      sourceId: group.sourceId,
    }));
    puzzles.push({
      id: `community-${index / 4}`,
      source: 'community',
      groups,
      items: groups.flatMap((group, groupIndex) =>
        group.items.map((word, wordIndex) => ({
          id: `community-${index / 4}-${groupIndex}-${wordIndex}`,
          label: word,
          groupName: group.name,
        })),
      ),
    });
  }
  return puzzles;
}

async function requireAdmin(request, env) {
  const email = request.headers.get('CF-Access-Authenticated-User-Email');
  const jwt = request.headers.get('CF-Access-Jwt-Assertion');
  if (email && jwt) return true;
  if (!env.ADMIN_KEY) return false;
  const provided = request.headers.get('x-admin-key') ?? '';
  const enc = new TextEncoder();
  const a = enc.encode(provided.padEnd(env.ADMIN_KEY.length, '\0'));
  const b = enc.encode(env.ADMIN_KEY.padEnd(provided.length, '\0'));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 && provided.length === env.ADMIN_KEY.length;
}

function cleanNickname(value) {
  const nickname = String(value || '').trim().replace(/\s+/g, ' ');
  if (!nickname) throw new Error('Nickname is required');
  if (nickname.length > 24) throw new Error('Nickname must be 24 characters or fewer');
  return nickname;
}

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return null;
  if (email.length > 254) throw new Error('Email must be 254 characters or fewer');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email format');
  return email;
}

function normalizeGroups(groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error('Puzzle submissions must contain at least 1 group');
  }
  const normalized = groups.map((group, index) => {
    const name = String(group?.name || '').trim();
    const words = Array.isArray(group?.words)
      ? group.words.map((word) => String(word).trim()).filter(Boolean)
      : [];
    if (!name && words.length === 0) return null;
    if (!name) throw new Error(`Group ${index + 1} needs a name`);
    if (words.length !== 4) throw new Error(`Group ${index + 1} must contain exactly 4 words`);
    if (words.some((word) => word.length > 24)) throw new Error('Each word must be 24 characters or fewer');
    return { name, words };
  });
  const filled = normalized.filter(Boolean);
  if (!filled.length) throw new Error('Puzzle submissions must contain at least 1 group');
  if (filled.length > 10) throw new Error('Puzzle submissions can include at most 10 groups');
  return filled;
}

function deriveSubmissionTitle({ title, groups, nickname }) {
  const trimmed = String(title || '').trim();
  if (trimmed) return trimmed.slice(0, 80);
  const fromGroups = groups.map((group) => group.name).filter(Boolean).join(' / ');
  if (fromGroups) return fromGroups.slice(0, 80);
  return `投稿 ${String(nickname || 'Guest').trim() || 'Guest'}`.slice(0, 80);
}

function parseSubmissionGroups(groupsJson) {
  try {
    const parsed = JSON.parse(groupsJson || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeSubmission(row) {
  const groups = parseSubmissionGroups(row.groups_json);
  const summary = (() => {
    const names = groups.map((group) => String(group?.name || '').trim()).filter(Boolean);
    if (names.length) return `${names.length} 组：${names.join(' / ')}`;
    return deriveSubmissionTitle({ title: row.title, groups, nickname: row.nickname });
  })();
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
    updated_at: row.updated_at,
  };
}

function validateSubmission(body) {
  if (!body || typeof body !== 'object') return 'Invalid submission format.';
  const nickname = String(body.nickname || '').trim();
  if (!nickname) return 'Please enter a nickname.';
  if (nickname.length > 32) return 'Nickname is too long.';
  const contactEmail = String(body.contactEmail || '').trim();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return 'Please enter a valid email address.';
  if (!Array.isArray(body.groups) || body.groups.length < 1 || body.groups.length > 10) return 'Submit between 1 and 10 groups.';
  const groupNames = new Set();
  const allWords = new Set();
  for (const group of body.groups) {
    const groupName = String(group.name || '').trim();
    if (!groupName) return 'Each group needs a name.';
    if (groupName.length > 40) return 'Group names must be 40 characters or fewer.';
    if (groupNames.has(groupName.toLowerCase())) return 'Group names must be unique.';
    groupNames.add(groupName.toLowerCase());
    if (!Array.isArray(group.words) || group.words.length !== 4 || group.words.some((word) => !String(word).trim())) {
      return 'Each group must contain 4 words.';
    }
    for (const rawWord of group.words) {
      const word = String(rawWord).trim();
      if (word.length > 40) return 'Words must be 40 characters or fewer.';
      const key = word.toLowerCase();
      if (allWords.has(key)) return 'Every word in a submission must be unique.';
      allWords.add(key);
    }
  }
  return null;
}

function normalizeSubmission(body) {
  const groups = body.groups.map((group) => ({
    name: String(group.name).trim(),
    words: group.words.map((word) => String(word).trim()),
  }));
  return {
    id: crypto.randomUUID(),
    nickname: String(body.nickname).trim(),
    title: String(body.title || groups[0]?.name || 'Untitled submission').trim(),
    contactEmail: String(body.contactEmail || '').trim(),
    groups,
    status: 'pending',
    thankYouEmail: { status: 'not_requested' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildThankYouMessage(submission, env) {
  const from = env.MAIL_FROM || 'noreply@nanamicat.com';
  const replyTo = env.REPLY_TO || 'support@nanamicat.com';
  const title = submission.title;
  const nickname = submission.nickname;
  const text = [
    `Hi ${nickname},`,
    '',
    `Thank you for leaving the puzzle "${title}" for MeowGrid.`,
    'Your support helps make the puzzle bank more interesting. I will review the submission before adding it to a future puzzle set.',
    '',
    'Have fun playing today.',
    'MeowGrid',
  ].join('\n');

  return {
    from: `MeowGrid <${from}>`,
    to: [submission.contactEmail],
    reply_to: replyTo,
    subject: 'Thank you for submitting a MeowGrid puzzle',
    text,
    html: [
      `<p>Hi ${escapeHtml(nickname)},</p>`,
      `<p>Thank you for leaving the puzzle "<strong>${escapeHtml(title)}</strong>" for MeowGrid.</p>`,
      '<p>Your support helps make the puzzle bank more interesting. I will review the submission before adding it to a future puzzle set.</p>',
      '<p>Have fun playing today.<br />MeowGrid</p>',
    ].join(''),
  };
}

async function sendThankYouEmail(submission, env) {
  if (!submission.contactEmail) return { status: 'not_requested' };

  const from = env.MAIL_FROM || 'noreply@nanamicat.com';
  if (!env.RESEND_API_KEY) {
    return {
      status: 'not_configured',
      error: 'RESEND_API_KEY is not configured.',
      from,
      provider: 'resend',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildThankYouMessage(submission, env)),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return {
        status: 'failed',
        error: responseText || `Resend API returned ${response.status}`,
        from,
        provider: 'resend',
      };
    }

    const result = responseText ? JSON.parse(responseText) : {};
    return {
      status: 'sent',
      sentAt: new Date().toISOString(),
      from,
      provider: 'resend',
      messageId: result.id,
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error.message,
      from,
      provider: 'resend',
    };
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/admin' || path === '/admin/') {
    return Response.redirect(`${url.origin}/control-panel`, 302);
  }

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });

  if (path === '/api/submissions' && request.method === 'POST') {
    if (!await consumeRateLimit(request, env, 'submissions', 20, 86400)) {
      return json({ error: 'Too many submissions. Please try again later.' }, 429);
    }
    const body = await request.json().catch(() => null);
    const validationError = validateSubmission(body);
    if (validationError) return json({ error: validationError }, 400);
    const submission = normalizeSubmission(body);
    submission.thankYouEmail = await sendThankYouEmail(submission, env);
    await insertSubmission(env, submission);
    return json({ submission }, 201);
  }

  if (path === '/api/leaderboard' && request.method === 'GET') {
    const result = await env.DB.prepare(`
      SELECT id, nickname, text_clears, total_score, updated_at
      FROM players
      ORDER BY total_score DESC, text_clears DESC, updated_at DESC
      LIMIT 100
    `).all();
    return json({ leaderboard: result.results ?? [] });
  }

  if (path === '/api/player' && request.method === 'POST') {
    try {
      const body = await request.json();
      const nickname = cleanNickname(body.nickname);
      const playerId = String(body.playerId || '').trim();
      const now = new Date().toISOString();

      if (playerId) {
        const existing = await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(playerId).first();
        if (existing) {
          await env.DB.prepare('UPDATE players SET nickname = ?, updated_at = ? WHERE id = ?')
            .bind(nickname, now, playerId).run();
          return json({ player: { ...existing, nickname, updated_at: now } });
        }
      }

      const byName = await env.DB.prepare('SELECT * FROM players WHERE nickname = ?').bind(nickname).first();
      if (byName) {
        await env.DB.prepare('UPDATE players SET nickname = ?, updated_at = ? WHERE id = ?')
          .bind(nickname, now, byName.id).run();
        return json({ player: { ...byName, nickname, updated_at: now } });
      }

      const id = newId('player');
      await env.DB.prepare(`
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
          updated_at: now,
        },
      }, 201);
    } catch (error) {
      const status = /nickname/i.test(error.message) ? 400 : 500;
      return json({ error: error.message }, status);
    }
  }

  if (path === '/api/score' && request.method === 'POST') {
    try {
      const body = await request.json();
      const mode = String(body.mode || 'text').trim();
      const puzzleId = String(body.puzzleId || '').trim();
      const playerId = String(body.playerId || '').trim();
      const nickname = cleanNickname(body.nickname);
      if (mode !== 'text') throw new Error('Mode must be text');
      if (!puzzleId) throw new Error('Puzzle id is required');
      if (!playerId) throw new Error('Player id is required');

      const player = await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(playerId).first();
      if (!player) throw new Error('Player does not exist');

      const points = 1;
      const now = new Date().toISOString();
      const eventId = newId('score');
      const insert = await env.DB.prepare(`
        INSERT OR IGNORE INTO score_events (id, player_id, nickname, mode, puzzle_id, points, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(eventId, playerId, nickname, mode, puzzleId, points, now).run();

      if (insert.meta?.changes) {
        await env.DB.prepare(`
          UPDATE players
          SET nickname = ?, text_clears = text_clears + 1, total_score = total_score + ?, updated_at = ?
          WHERE id = ?
        `).bind(nickname, points, now, playerId).run();
      }

      const updated = await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(playerId).first();
      return json({ player: updated, points, duplicate: !insert.meta?.changes });
    } catch (error) {
      const badRequest = /required|must|does not exist/i.test(error.message);
      return json({ error: error.message }, badRequest ? 400 : 500);
    }
  }

  if (path === '/api/puzzles' && request.method === 'POST') {
    try {
      if (!await consumeRateLimit(request, env, 'submissions', 20, 86400)) {
        return json({ error: 'Too many submissions. Please try again later.' }, 429);
      }
      const body = await request.json();
      const nickname = cleanNickname(body.nickname || 'Guest');
      const playerId = String(body.playerId || '').trim() || null;
      const contactEmail = normalizeEmail(body.email);
      const groups = normalizeGroups(body.groups);
      const title = deriveSubmissionTitle({ title: body.title, groups, nickname });
      const now = new Date().toISOString();
      const id = newId('submission');

      await env.DB.prepare(`
        INSERT INTO puzzle_submissions (id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(id, playerId, nickname, contactEmail, title, JSON.stringify(groups), now, now).run();

      let email = { attempted: false, sent: false };
      if (contactEmail) {
        const thankYou = await sendThankYouEmail({
          id,
          nickname,
          title,
          contactEmail,
          groups,
          status: 'pending',
          thankYouEmail: { status: 'not_requested' },
          createdAt: now,
          updatedAt: now,
        }, env);
        email = {
          attempted: thankYou.status !== 'not_requested',
          sent: thankYou.status === 'sent',
          reason: thankYou.error,
        };
      }

      return json({
        submission: {
          id,
          player_id: playerId,
          nickname,
          contact_email: contactEmail,
          title,
          groups,
          status: 'pending',
          created_at: now,
          updated_at: now,
        },
        email,
      }, 201);
    } catch (error) {
      const badRequest = /required|must|needs|characters|invalid|group|submission/i.test(error.message);
      return json({ error: error.message }, badRequest ? 400 : 500);
    }
  }

  if (path === '/api/puzzles' && request.method === 'GET') {
    const result = await env.DB.prepare(`
      SELECT id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at
      FROM puzzle_submissions
      ORDER BY created_at DESC
    `).all();
    const submissions = (result.results ?? []).map((row) => ({
      id: row.id,
      nickname: row.nickname,
      groups: parseSubmissionGroups(row.groups_json),
      status: row.status,
    }));
    return json({ puzzles: buildApprovedTextPuzzles(submissions) });
  }

  if (path === '/api/scores' && request.method === 'GET') {
    return json({ leaders: publicScoreboard(await readScores(env)) });
  }

  if (path === '/api/scores' && request.method === 'POST') {
    if (!await consumeRateLimit(request, env, 'scores', 120, 3600)) {
      return json({ error: 'Too many score submissions. Please try again later.' }, 429);
    }
    const body = await request.json().catch(() => null);
    const validationError = validateScore(body);
    if (validationError) return json({ error: validationError }, 400);
    const nickname = String(body.nickname).trim().slice(0, 32);
    const mode = body.mode;
    const puzzleKey = String(body.puzzleKey).trim().slice(0, 120);
    const dedupeKey = `${nickname.toLowerCase()}|${mode}|${puzzleKey}`;
    const candidate = {
      id: crypto.randomUUID(),
      dedupeKey,
      nickname,
      mode,
      puzzleKey,
      points: mode === 'image' ? 3 : 1,
      createdAt: new Date().toISOString(),
    };
    const insert = await env.DB.prepare(
      `INSERT OR IGNORE INTO scores
      (id, dedupe_key, nickname, mode, puzzle_key, points, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      candidate.id,
      candidate.dedupeKey,
      candidate.nickname,
      candidate.mode,
      candidate.puzzleKey,
      candidate.points,
      candidate.createdAt,
    ).run();
    const existed = Number(insert.meta?.changes || 0) === 0;
    const row = await env.DB.prepare(
      `SELECT id, dedupe_key, nickname, mode, puzzle_key, points, created_at
      FROM scores WHERE dedupe_key = ?`,
    ).bind(dedupeKey).first();
    const score = {
      id: row.id,
      dedupeKey: row.dedupe_key,
      nickname: row.nickname,
      mode: row.mode,
      puzzleKey: row.puzzle_key,
      points: row.points,
      createdAt: row.created_at,
    };
    const scores = await readScores(env);
    return json({ score, leaders: publicScoreboard(scores) }, existed ? 200 : 201);
  }

  if (path === '/api/admin/puzzles' && request.method === 'GET') {
    if (!await requireAdmin(request, env)) return json({ error: 'Admin access required.' }, 403);
    const result = await env.DB.prepare(`
      SELECT id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at
      FROM puzzle_submissions
      ORDER BY created_at DESC
      LIMIT 100
    `).all();
    return json({ submissions: (result.results ?? []).map(serializeSubmission) });
  }

  if (path === '/api/admin/scores' && request.method === 'GET') {
    if (!await requireAdmin(request, env)) return json({ error: 'Admin access required.' }, 403);
    const result = await env.DB.prepare(`
      SELECT id, player_id, nickname, mode, puzzle_id, points, created_at
      FROM score_events
      ORDER BY created_at DESC
      LIMIT 100
    `).all();
    return json({ scores: result.results ?? [] });
  }

  const adminPuzzleMatch = path.match(/^\/api\/admin\/puzzles\/([^/]+)$/);
  if (adminPuzzleMatch && request.method === 'PATCH') {
    if (!await requireAdmin(request, env)) return json({ error: 'Admin access required.' }, 403);
    const body = await request.json().catch(() => null);
    let status = String(body?.status || '').trim();
    if (status === 'approved') status = 'included';
    if (!REVIEW_STATUSES.has(status)) return json({ error: 'Invalid review status' }, 400);
    const now = new Date().toISOString();
    const updated = await env.DB.prepare(`
      UPDATE puzzle_submissions SET status = ?, updated_at = ? WHERE id = ?
    `).bind(status, now, adminPuzzleMatch[1]).run();
    if (!updated.meta?.changes) return json({ error: 'Submission not found' }, 404);
    const row = await env.DB.prepare(`
      SELECT id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at
      FROM puzzle_submissions WHERE id = ?
    `).bind(adminPuzzleMatch[1]).first();
    return json({ submission: serializeSubmission(row) });
  }

  if (path === '/api/admin/submissions' && request.method === 'GET') {
    if (!await requireAdmin(request, env)) return json({ error: '管理员密钥无效。' }, 401);
    const rows = await readPuzzleSubmissionRows(env);
    return json({ submissions: rows.map(serializeSubmission) });
  }

  if (path === '/api/admin/scores' && request.method === 'DELETE') {
    if (!await requireAdmin(request, env)) return json({ error: 'Invalid admin key.' }, 401);
    const nickname = String(url.searchParams.get('nickname') || '').trim().toLowerCase();
    if (!nickname) return json({ error: 'Missing nickname.' }, 400);
    let deletedCount = 0;
    try {
      const deleted = await env.DB.prepare('DELETE FROM scores WHERE lower(trim(nickname)) = ?').bind(nickname).run();
      deletedCount = Number(deleted.meta?.changes || 0);
    } catch {
      const deleted = await env.DB.prepare('DELETE FROM score_events WHERE lower(trim(nickname)) = ?').bind(nickname).run();
      deletedCount = Number(deleted.meta?.changes || 0);
    }
    const scores = await readScores(env);
    return json({ deleted: deletedCount, leaders: publicScoreboard(scores) });
  }

  const match = path.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if (match && request.method === 'PATCH') {
    if (!await requireAdmin(request, env)) return json({ error: '管理员密钥无效。' }, 401);
    const body = await request.json().catch(() => null);
    let status = String(body?.status || '').trim();
    if (status === 'approved') status = 'included';
    if (!STATUSES.has(status)) return json({ error: '审核状态无效。' }, 400);
    const updatedAt = new Date().toISOString();
    const updated = await env.DB.prepare(
      'UPDATE puzzle_submissions SET status = ?, updated_at = ? WHERE id = ?',
    ).bind(status, updatedAt, match[1]).run();
    if (Number(updated.meta?.changes || 0) === 0) return json({ error: '投稿不存在。' }, 404);
    const row = await env.DB.prepare(`
      SELECT id, player_id, nickname, contact_email, title, groups_json, status, created_at, updated_at
      FROM puzzle_submissions WHERE id = ?
    `).bind(match[1]).first();
    return json({ submission: serializeSubmission(row) });
  }

  if (match && request.method === 'DELETE') {
    if (!await requireAdmin(request, env)) return json({ error: '管理员密钥无效。' }, 401);
    const deleted = await env.DB.prepare('DELETE FROM puzzle_submissions WHERE id = ?').bind(match[1]).run();
    if (Number(deleted.meta?.changes || 0) === 0) return json({ error: '投稿不存在。' }, 404);
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    const response = await handleRequest(request, env);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(request))) {
      headers.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers });
  },
};
