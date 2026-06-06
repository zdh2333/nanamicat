const STATUSES = new Set(['pending', 'approved', 'rejected']);
const GROUP_COLORS = ['yellow', 'green', 'blue', 'purple'];
const SCORE_KEY_PATTERN = /^(text-(built-in-\d+|community-\d+)|image-(yellow|green|blue|purple)-(yellow|green|blue|purple)-\d+)$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,x-admin-key',
    },
  });
}

async function readSubmissions(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, nickname, title, contact_email, groups_json, status,
      thank_you_email_json, created_at, updated_at
    FROM submissions ORDER BY created_at DESC`,
  ).all();
  return results.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    title: row.title,
    contactEmail: row.contact_email,
    groups: JSON.parse(row.groups_json),
    status: row.status,
    thankYouEmail: JSON.parse(row.thank_you_email_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function insertSubmission(env, submission) {
  await env.DB.prepare(
    `INSERT INTO submissions (
      id, nickname, title, contact_email, groups_json, status,
      thank_you_email_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    submission.id,
    submission.nickname,
    submission.title,
    submission.contactEmail,
    JSON.stringify(submission.groups),
    submission.status,
    JSON.stringify(submission.thankYouEmail),
    submission.createdAt,
    submission.updatedAt,
  ).run();
}

async function readScores(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, dedupe_key, nickname, mode, puzzle_key, points, created_at
    FROM scores ORDER BY created_at DESC`,
  ).all();
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
    .filter((submission) => submission.status === 'approved')
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

function requireAdmin(request, env) {
  return env.ADMIN_KEY && request.headers.get('x-admin-key') === env.ADMIN_KEY;
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
    `Thank you for leaving the puzzle "${title}" for FourFind.`,
    'Your support helps make the puzzle bank more interesting. I will review the submission before adding it to a future puzzle set.',
    '',
    'Have fun playing today.',
    'FourFind',
  ].join('\n');

  return {
    from: `FourFind <${from}>`,
    to: [submission.contactEmail],
    reply_to: replyTo,
    subject: 'Thank you for submitting a FourFind puzzle',
    text,
    html: [
      `<p>Hi ${escapeHtml(nickname)},</p>`,
      `<p>Thank you for leaving the puzzle "<strong>${escapeHtml(title)}</strong>" for FourFind.</p>`,
      '<p>Your support helps make the puzzle bank more interesting. I will review the submission before adding it to a future puzzle set.</p>',
      '<p>Have fun playing today.<br />FourFind</p>',
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

  if (request.method === 'OPTIONS') return json({});

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

  if (path === '/api/puzzles' && request.method === 'GET') {
    const submissions = await readSubmissions(env);
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

  if (path === '/api/admin/submissions' && request.method === 'GET') {
    if (!requireAdmin(request, env)) return json({ error: '管理员密钥无效。' }, 401);
    return json({ submissions: await readSubmissions(env) });
  }

  if (path === '/api/admin/scores' && request.method === 'DELETE') {
    if (!requireAdmin(request, env)) return json({ error: 'Invalid admin key.' }, 401);
    const nickname = String(url.searchParams.get('nickname') || '').trim().toLowerCase();
    if (!nickname) return json({ error: 'Missing nickname.' }, 400);
    const deleted = await env.DB.prepare('DELETE FROM scores WHERE lower(trim(nickname)) = ?').bind(nickname).run();
    const scores = await readScores(env);
    return json({ deleted: Number(deleted.meta?.changes || 0), leaders: publicScoreboard(scores) });
  }

  const match = path.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if (match && request.method === 'PATCH') {
    if (!requireAdmin(request, env)) return json({ error: '管理员密钥无效。' }, 401);
    const body = await request.json().catch(() => null);
    if (!STATUSES.has(body?.status)) return json({ error: '审核状态无效。' }, 400);
    const updatedAt = new Date().toISOString();
    const updated = await env.DB.prepare(
      'UPDATE submissions SET status = ?, updated_at = ? WHERE id = ?',
    ).bind(body.status, updatedAt, match[1]).run();
    if (Number(updated.meta?.changes || 0) === 0) return json({ error: '投稿不存在。' }, 404);
    const submission = (await readSubmissions(env)).find((item) => item.id === match[1]);
    return json({ submission });
  }

  if (match && request.method === 'DELETE') {
    if (!requireAdmin(request, env)) return json({ error: '管理员密钥无效。' }, 401);
    const deleted = await env.DB.prepare('DELETE FROM submissions WHERE id = ?').bind(match[1]).run();
    if (Number(deleted.meta?.changes || 0) === 0) return json({ error: '投稿不存在。' }, 404);
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
