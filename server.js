import express from 'express';
import nodemailer from 'nodemailer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const dataFile = path.join(dataDir, 'submissions.json');
const scoresFile = path.join(dataDir, 'scores.json');
const port = Number(process.env.PORT || 4173);
const isProduction = process.env.NODE_ENV === 'production';
const adminKey = process.env.ADMIN_KEY || '';
const mailFrom = process.env.MAIL_FROM || 'noreply@nanamicat.com';
const groupColors = ['yellow', 'green', 'blue', 'purple'];
const scoreKeyPattern = /^(text-(built-in-\d+|community-\d+)|image-(yellow|green|blue|purple)-(yellow|green|blue|purple)-\d+)$/;
const rateLimits = new Map();
const mailTransport = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function readSubmissions() {
  try {
    const parsed = JSON.parse(await readFile(dataFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    await mkdir(dataDir, { recursive: true });
    if (error.code === 'ENOENT') await writeFile(dataFile, '[]\n', 'utf8');
    return [];
  }
}

async function saveSubmissions(submissions) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(submissions, null, 2)}\n`, 'utf8');
}

async function readScores() {
  try {
    const parsed = JSON.parse(await readFile(scoresFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    await mkdir(dataDir, { recursive: true });
    if (error.code === 'ENOENT') await writeFile(scoresFile, '[]\n', 'utf8');
    return [];
  }
}

async function saveScores(scores) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(scoresFile, `${JSON.stringify(scores, null, 2)}\n`, 'utf8');
}

function consumeRateLimit(request, bucket, limit, windowSeconds) {
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  const windowId = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `${bucket}:${ip}:${windowId}`;
  const current = rateLimits.get(key) || 0;
  if (current >= limit) return false;
  rateLimits.set(key, current + 1);
  if (rateLimits.size > 10000) {
    for (const storedKey of rateLimits.keys()) {
      if (!storedKey.endsWith(`:${windowId}`)) rateLimits.delete(storedKey);
    }
  }
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
  if (!scoreKeyPattern.test(puzzleKey)) return 'Invalid puzzle key.';
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
      color: groupColors[groupIndex],
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

function requireAdmin(request, response, next) {
  if (!adminKey) {
    response.status(503).json({ error: '生产环境尚未配置 ADMIN_KEY。' });
    return;
  }
  if (request.get('x-admin-key') !== adminKey) {
    response.status(401).json({ error: '管理员密钥无效。' });
    return;
  }
  next();
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function sendThankYouEmail(submission) {
  if (!submission.contactEmail) return { status: 'not_requested' };
  if (!mailTransport) {
    return {
      status: 'not_configured',
      error: 'SMTP is not configured.',
      from: mailFrom,
    };
  }

  try {
    await mailTransport.sendMail({
      from: `"MeowGrid" <${mailFrom}>`,
      to: submission.contactEmail,
      subject: 'Thank you for submitting a MeowGrid puzzle',
      text: [
        `Hi ${submission.nickname},`,
        '',
        `Thank you for leaving the puzzle "${submission.title}" for MeowGrid.`,
        'Your support helps make the puzzle bank more interesting. I will review the submission before adding it to a future puzzle set.',
        '',
        'Have fun playing today.',
        'MeowGrid',
      ].join('\n'),
      html: `
        <p>Hi ${escapeHtml(submission.nickname)},</p>
        <p>Thank you for leaving the puzzle "<strong>${escapeHtml(submission.title)}</strong>" for MeowGrid.</p>
        <p>Your support helps make the puzzle bank more interesting. I will review the submission before adding it to a future puzzle set.</p>
        <p>Have fun playing today.<br />MeowGrid</p>
      `,
    });
    return { status: 'sent', sentAt: new Date().toISOString(), from: mailFrom };
  } catch (error) {
    return {
      status: 'failed',
      error: error.message,
      from: mailFrom,
    };
  }
}

import { mountDevApi } from './server/dev-api.js';

const app = express();
app.use(express.json({ limit: '100kb' }));
mountDevApi(app, dataDir, { adminKey, allowOpenAdmin: !isProduction && !adminKey });

app.post('/api/submissions', async (request, response) => {
  if (!consumeRateLimit(request, 'submissions', 20, 86400)) {
    response.status(429).json({ error: 'Too many submissions. Please try again later.' });
    return;
  }
  const validationError = validateSubmission(request.body);
  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }

  const submissions = await readSubmissions();
  const groups = request.body.groups.map((group) => ({
    name: String(group.name).trim(),
    words: group.words.map((word) => String(word).trim()),
  }));
  const submission = {
    id: randomUUID(),
    nickname: String(request.body.nickname).trim(),
    title: String(request.body.title || groups[0]?.name || 'Untitled submission').trim(),
    contactEmail: String(request.body.contactEmail || '').trim(),
    groups,
    status: 'pending',
    thankYouEmail: { status: 'not_requested' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  submission.thankYouEmail = await sendThankYouEmail(submission);
  submissions.unshift(submission);
  await saveSubmissions(submissions);
  response.status(201).json({ submission });
});

app.get('/api/scores', async (_request, response) => {
  response.json({ leaders: publicScoreboard(await readScores()) });
});

app.post('/api/scores', async (request, response) => {
  if (!consumeRateLimit(request, 'scores', 120, 3600)) {
    response.status(429).json({ error: 'Too many score submissions. Please try again later.' });
    return;
  }
  const validationError = validateScore(request.body);
  if (validationError) {
    response.status(400).json({ error: validationError });
    return;
  }
  const scores = await readScores();
  const nickname = String(request.body.nickname).trim().slice(0, 32);
  const mode = request.body.mode;
  const puzzleKey = String(request.body.puzzleKey).trim().slice(0, 120);
  const dedupeKey = `${nickname.toLowerCase()}|${mode}|${puzzleKey}`;
  let score = scores.find((item) => item.dedupeKey === dedupeKey);
  const existed = Boolean(score);
  if (!score) {
    score = {
      id: randomUUID(),
      dedupeKey,
      nickname,
      mode,
      puzzleKey,
      points: mode === 'image' ? 3 : 1,
      createdAt: new Date().toISOString(),
    };
    scores.unshift(score);
    await saveScores(scores);
  }
  response.status(existed ? 200 : 201).json({ score, leaders: publicScoreboard(scores) });
});

app.get('/api/admin/submissions', requireAdmin, async (_request, response) => {
  response.json({ submissions: await readSubmissions() });
});

app.delete('/api/admin/scores', requireAdmin, async (request, response) => {
  const nickname = String(request.query.nickname || '').trim().toLowerCase();
  if (!nickname) {
    response.status(400).json({ error: 'Missing nickname.' });
    return;
  }
  const scores = await readScores();
  const nextScores = scores.filter((score) => String(score.nickname || '').trim().toLowerCase() !== nickname);
  await saveScores(nextScores);
  response.json({ deleted: scores.length - nextScores.length, leaders: publicScoreboard(nextScores) });
});

app.patch('/api/admin/submissions/:id', requireAdmin, async (request, response) => {
  const allowedStatuses = new Set(['pending', 'reviewed', 'included', 'rejected', 'approved']);
  let nextStatus = String(request.body?.status || '').trim();
  if (nextStatus === 'approved') nextStatus = 'included';
  if (!allowedStatuses.has(nextStatus)) {
    response.status(400).json({ error: '审核状态无效。' });
    return;
  }
  const submissions = await readSubmissions();
  const submission = submissions.find((item) => item.id === request.params.id);
  if (!submission) {
    response.status(404).json({ error: '投稿不存在。' });
    return;
  }
  submission.status = nextStatus;
  submission.updatedAt = new Date().toISOString();
  await saveSubmissions(submissions);
  response.json({ submission });
});

app.delete('/api/admin/submissions/:id', requireAdmin, async (request, response) => {
  const submissions = await readSubmissions();
  const nextSubmissions = submissions.filter((item) => item.id !== request.params.id);
  if (nextSubmissions.length === submissions.length) {
    response.status(404).json({ error: '投稿不存在。' });
    return;
  }
  await saveSubmissions(nextSubmissions);
  response.status(204).end();
});

if (isProduction) {
  app.use(express.static(path.join(root, 'dist')));
  app.use((_request, response) => response.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`NanamiCat server running at http://localhost:${port}`);
  if (!adminKey) console.warn('ADMIN_KEY is not configured; admin routes are disabled.');
});
