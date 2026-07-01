const STATUSES = new Set(['pending', 'reviewed', 'included', 'rejected', 'approved']);
const REVIEW_STATUSES = new Set(['pending', 'reviewed', 'included', 'rejected']);
const GROUP_COLORS = ['yellow', 'green', 'blue', 'purple'];
const SCORE_KEY_PATTERN = /^(text-(\d{3}|built-in-\d+|community-\d+)|image-(yellow|green|blue|purple)-(yellow|green|blue|purple)-\d+)$/;
const MEME_TONE_FALLBACKS = {
  cute: ['Small paws. Big plans.', 'Just a tiny boss with soft beans.', 'Certified snack supervisor.', 'Purrfectly innocent. Mostly.'],
  grumpy: ['I heard everything. I approve nothing.', 'This face says no meetings.', 'Touch the bowl, then we talk.', 'My patience is currently buffering.'],
  dramatic: ['This meeting could have been a nap.', 'Behold, the tragedy of an empty bowl.', 'I require applause and tuna.', 'A tiny crisis, performed daily.'],
  office: ['Meeting? I thought you said feeding.', 'I excel in napping and overthinking.', 'My desk. My rules. My nap schedule.', '9 to 5? More like nap to snack.'],
  japanese: ['今日は、猫が正しい。', '会議より、ひなたぼっこ。', 'おやつの時間を守りましょう。', 'この顔、承認待ちです。']
};

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

function json(data, status = 200, extraHeaders = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(extraHeaders ?? {}) },
  });
}

function fallbackMemeCaptions(tone = 'office') {
  return MEME_TONE_FALLBACKS[tone] || MEME_TONE_FALLBACKS.office;
}

function sanitizeMemeCaptions(value, tone = 'office') {
  const raw = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/\n|(?<=\.)\s+/)
      .map((line) => line.replace(/^[-*\d.\s"']+|["']+$/g, '').trim());
  const captions = [];
  for (const item of raw) {
    const caption = String(item || '').replace(/\s+/g, ' ').trim();
    if (!caption || caption.length > 90 || captions.includes(caption)) continue;
    captions.push(caption);
    if (captions.length >= 4) break;
  }
  return captions.length ? captions : fallbackMemeCaptions(tone);
}

function buildMemePrompt({ tone = 'office', locale = 'en' } = {}) {
  const language = locale === 'ja' || tone === 'japanese'
    ? 'Japanese'
    : locale === 'zh'
      ? 'Simplified Chinese'
      : 'English';
  return [
    'Generate exactly four short cat meme captions for Nanami Cat Daily.',
    `Tone: ${tone}. Language: ${language}.`,
    'Each caption must be under 70 characters, playful, safe for all ages, and easy to put on a share card.',
    'Return only a JSON array of strings. No markdown.'
  ].join('\n');
}

async function generateGeminiMemeCaptions(env, { tone, locale }) {
  if (!env.GEMINI_API_KEY) return null;
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const geminiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildMemePrompt({ tone, locale }) }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 220,
        responseMimeType: 'application/json'
      }
    })
  });
  if (!geminiResponse.ok) throw new Error('Gemini caption generation failed.');
  const payload = await geminiResponse.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
  try {
    return sanitizeMemeCaptions(JSON.parse(text), tone);
  } catch {
    return sanitizeMemeCaptions(text, tone);
  }
}

// Map of major CF-reported English city names (and a few aliases) to
// short, ASCII-safe prefix tokens used in auto-generated nicknames. We
// keep them in a single transliteration table so the worker doesn't ship
// a full city database — the goal is "good enough" defaults like
// "Shenzhen4821" or "上海3521", not exhaustive geocoding. Falls back to
// the country code (e.g. "JP", "US", "FR") when the city is missing.
const CITY_TO_PREFIX = {
  // Greater China
  'beijing': 'Beijing', 'shanghai': 'Shanghai', 'guangzhou': 'Guangzhou',
  'shenzhen': 'Shenzhen', 'chengdu': 'Chengdu', 'hangzhou': 'Hangzhou',
  'nanjing': 'Nanjing', 'wuhan': 'Wuhan', 'xian': 'Xian', "xi'an": 'Xian',
  'suzhou': 'Suzhou', 'tianjin': 'Tianjin', 'chongqing': 'Chongqing',
  'qingdao': 'Qingdao', 'dalian': 'Dalian', 'xiamen': 'Xiamen',
  'changsha': 'Changsha', 'zhengzhou': 'Zhengzhou', 'kunming': 'Kunming',
  'shenyang': 'Shenyang', 'haerbin': 'Haerbin', 'harbin': 'Haerbin',
  'jinan': 'Jinan', 'fuzhou': 'Fuzhou', 'hefei': 'Hefei',
  'ningbo': 'Ningbo', 'wuxi': 'Wuxi', 'dongguan': 'Dongguan',
  'foshan': 'Foshan', 'taipei': 'Taipei', 'kaohsiung': 'Kaohsiung',
  'hong kong': 'HongKong', 'macau': 'Macau', 'macao': 'Macau',
  // Japan
  'tokyo': 'Tokyo', 'osaka': 'Osaka', 'kyoto': 'Kyoto', 'yokohama': 'Yokohama',
  'nagoya': 'Nagoya', 'sapporo': 'Sapporo', 'fukuoka': 'Fukuoka',
  'kobe': 'Kobe', 'sendai': 'Sendai', 'hiroshima': 'Hiroshima',
  // Korea
  'seoul': 'Seoul', 'busan': 'Busan', 'incheon': 'Incheon',
  // SEA
  'singapore': 'Singapore', 'bangkok': 'Bangkok', 'kuala lumpur': 'KualaLumpur',
  'jakarta': 'Jakarta', 'manila': 'Manila', 'hanoi': 'Hanoi',
  'ho chi minh city': 'Hanoi', 'phnom penh': 'PhnomPenh',
  // US
  'new york': 'NewYork', 'los angeles': 'LosAngeles', 'san francisco': 'SanFrancisco',
  'seattle': 'Seattle', 'chicago': 'Chicago', 'boston': 'Boston',
  'austin': 'Austin', 'miami': 'Miami', 'denver': 'Denver',
  'houston': 'Houston', 'dallas': 'Dallas', 'atlanta': 'Atlanta',
  'portland': 'Portland', 'san diego': 'SanDiego', 'washington': 'Washington',
  'philadelphia': 'Philadelphia', 'toronto': 'Toronto', 'vancouver': 'Vancouver',
  'montreal': 'Montreal', 'mexico city': 'MexicoCity',
  // EU
  'london': 'London', 'paris': 'Paris', 'berlin': 'Berlin', 'madrid': 'Madrid',
  'rome': 'Roma', 'barcelona': 'Barcelona', 'amsterdam': 'Amsterdam',
  'brussels': 'Brussels', 'vienna': 'Vienna', 'zurich': 'Zurich',
  'geneva': 'Geneva', 'munich': 'Munich', 'hamburg': 'Hamburg',
  'copenhagen': 'Copenhagen', 'stockholm': 'Stockholm', 'oslo': 'Oslo',
  'helsinki': 'Helsinki', 'warsaw': 'Warsaw', 'prague': 'Prague',
  'budapest': 'Budapest', 'athens': 'Athens', 'lisbon': 'Lisbon',
  'porto': 'Porto', 'dublin': 'Dublin', 'edinburgh': 'Edinburgh',
  'manchester': 'Manchester', 'milan': 'Milan', 'florence': 'Florence',
  'venice': 'Venice', 'naples': 'Naples',
  // AU / NZ
  'sydney': 'Sydney', 'melbourne': 'Melbourne', 'brisbane': 'Brisbane',
  'perth': 'Perth', 'auckland': 'Auckland', 'wellington': 'Wellington',
  // Others
  'dubai': 'Dubai', 'doha': 'Doha', 'riyadh': 'Riyadh', 'tel aviv': 'TelAviv',
  'istanbul': 'Istanbul', 'cairo': 'Cairo', 'cape town': 'CapeTown',
  'johannesburg': 'Johannesburg', 'mumbai': 'Mumbai', 'delhi': 'Delhi',
  'bangalore': 'Bangalore', 'bengaluru': 'Bangalore', 'chennai': 'Chennai',
  'kolkata': 'Kolkata', 'sao paulo': 'SaoPaulo', 'rio de janeiro': 'Rio',
  'buenos aires': 'BuenosAires', 'moscow': 'Moscow', 'st petersburg': 'StPetersburg',
  'saint petersburg': 'StPetersburg', 'kiev': 'Kiev', 'kyiv': 'Kiev',
  'bucharest': 'Bucharest', 'sofia': 'Sofia', 'belgrade': 'Belgrade',
  'zagreb': 'Zagreb', 'vilnius': 'Vilnius', 'riga': 'Riga', 'tallinn': 'Tallinn',
  'reykjavik': 'Reykjavik'
};

function regionFromRequest(request) {
  // Cloudflare Workers populate request.cf on every request. The fields
  // can be missing when the request comes from a non-CF edge (rare for
  // us, since everything is on nanamicat.com) or when geo lookup failed.
  const cf = request?.cf ?? {};
  const rawCity = String(cf.city || '').trim();
  const rawCountry = String(cf.country || '').trim();
  const cityKey = rawCity.toLowerCase();
  if (cityKey && CITY_TO_PREFIX[cityKey]) return CITY_TO_PREFIX[cityKey];
  if (rawCity) {
    // Unknown city — sanitise it (drop spaces, punctuation) and cap at
    // 16 chars so the suffix "1234" still leaves a sane total length.
    const cleaned = rawCity.replace(/[^A-Za-z\u4e00-\u9fff]+/g, '').slice(0, 16);
    if (cleaned) return cleaned;
  }
  if (rawCountry) {
    // Country-only fallback. Some CF countries read as alpha-2 codes
    // (JP, US), some as full names ("Japan"); we keep whatever CF gave
    // us after a light tidy.
    return rawCountry.length <= 3 ? rawCountry.toUpperCase() : rawCountry;
  }
  return null;
}

async function readPuzzleSubmissionRows(env, { limit = 100 } = {}) {
  const result = await env.DB.prepare(`
    SELECT id, player_id, nickname, title, groups_json, status, created_at, updated_at
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
    groups: parseSubmissionGroups(row.groups_json),
    status: row.status === 'approved' ? 'included' : row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function insertSubmission(env, submission) {
  const now = submission.updatedAt || submission.createdAt || new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO puzzle_submissions (
      id, player_id, nickname, title, groups_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    submission.id,
    submission.playerId || null,
    submission.nickname,
    submission.title,
    JSON.stringify(submission.groups),
    submission.status === 'approved' ? 'included' : submission.status,
    submission.createdAt || now,
    submission.updatedAt || now,
  ).run();
}

async function readScores(env) {
  // Cap each read at 1000 most-recent rows.  publicScoreboard() only surfaces
  // the top 50 unique nicknames, so anything older is irrelevant to the
  // leaderboard UI and would just slow the read.
  const SCORE_READ_LIMIT = 1000;
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, dedupe_key, nickname, mode, puzzle_key, points, created_at
      FROM scores ORDER BY created_at DESC LIMIT ?`,
    ).bind(SCORE_READ_LIMIT).all();
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
    FROM score_events ORDER BY created_at DESC LIMIT ?`,
  ).bind(SCORE_READ_LIMIT).all();
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
  if (nickname.length > 24) return 'Nickname is too long (max 24 characters).';
  if (!['text', 'image'].includes(body?.mode)) return 'Invalid puzzle mode.';
  const puzzleKey = String(body?.puzzleKey || '').trim();
  if (!puzzleKey) return 'Missing puzzle key.';
  if (!SCORE_KEY_PATTERN.test(puzzleKey)) return 'Invalid puzzle key.';
  return null;
}

function buildApprovedTextPuzzles(submissions) {
  const approvedGroups = submissions
    .filter((submission) => submission.status === 'approved' || submission.status === 'included')
    .sort((a, b) => String(a.updated_at || a.updatedAt || a.created_at || a.createdAt || '')
      .localeCompare(String(b.updated_at || b.updatedAt || b.created_at || b.createdAt || '')))
    .flatMap((submission) => submission.groups
      .filter((group) => hasCompleteBilingualGroups([group]))
      .map((group) => ({ ...group, sourceId: submission.id })));

  const puzzles = [];
  const englishPuzzleTerms = {};
  for (const group of approvedGroups) {
    englishPuzzleTerms[group.name] = group.englishName;
    group.words.forEach((word, index) => {
      englishPuzzleTerms[word] = group.englishWords[index];
    });
  }

  for (let index = 0; index + 3 < approvedGroups.length; index += 4) {
    const puzzleNumber = Math.floor(index / 4) + 1;
    const chunk = approvedGroups.slice(index, index + 4);
    const puzzleId = stableCommunityPuzzleId(chunk);
    const groups = chunk.map((group, groupIndex) => ({
      id: `${puzzleId}-g${groupIndex + 1}`,
      name: group.name,
      level: groupIndex + 1,
      items: group.words.map((word) => ({
        id: `${puzzleId}-${word}`,
        label: word,
      })),
      sourceId: group.sourceId,
    }));
    puzzles.push({
      id: puzzleId,
      label: `社区题 ${puzzleNumber}`,
      theme: '游客贡献',
      type: 'text',
      difficulty: 4,
      redHerring: '由玩家投稿并经后台审核收录。',
      groups,
    });
    englishPuzzleTerms['游客贡献'] = 'Community contribution';
    englishPuzzleTerms['由玩家投稿并经后台审核收录。'] = 'Submitted by players and approved in review.';
  }
  return { puzzles, englishPuzzleTerms };
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
    const englishName = String(group?.englishName || group?.enName || '').trim();
    const rawEnglishWords = Array.isArray(group?.englishWords)
      ? group.englishWords
      : Array.isArray(group?.enWords)
        ? group.enWords
        : [];
    const englishWords = rawEnglishWords.map((word) => String(word).trim()).filter(Boolean);
    return { name, words, englishName, englishWords };
  });
  const filled = normalized.filter(Boolean);
  if (!filled.length) throw new Error('Puzzle submissions must contain at least 1 group');
  if (filled.length > 10) throw new Error('Puzzle submissions can include at most 10 groups');
  return filled;
}

function hasCompleteBilingualGroups(groups) {
  return Array.isArray(groups) && groups.length > 0 && groups.every((group) =>
    String(group?.name || '').trim() &&
    Array.isArray(group?.words) &&
    group.words.map((word) => String(word).trim()).filter(Boolean).length === 4 &&
    String(group?.englishName || '').trim() &&
    Array.isArray(group?.englishWords) &&
    group.englishWords.map((word) => String(word).trim()).filter(Boolean).length === 4
  );
}

function stableCommunityPuzzleId(groups) {
  const key = groups.map((group) => group.sourceId).join('|');
  let hash = 2166136261;
  for (const char of key) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `community-${(hash >>> 0).toString(36)}`;
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
  if (nickname.length > 24) return 'Nickname is too long (max 24 characters).';
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
      if (word.length > 24) return 'Words must be 24 characters or fewer.';
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
    groups,
    status: 'pending',
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

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/admin' || path === '/admin/') {
    return Response.redirect(`${url.origin}/control-panel`, 302);
  }

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });

  if (path === '/api/meme-captions' && request.method === 'POST') {
    if (!await consumeRateLimit(request, env, 'meme-captions', 60, 3600)) {
      return json({ error: 'Too many caption requests. Please try again later.' }, 429);
    }
    const body = await request.json().catch(() => ({}));
    const tone = String(body?.tone || 'office').trim().toLowerCase();
    const locale = String(body?.locale || 'en').trim().toLowerCase();
    try {
      const captions = await generateGeminiMemeCaptions(env, { tone, locale });
      return json({
        captions: captions || fallbackMemeCaptions(tone),
        source: captions ? 'gemini' : 'fallback'
      });
    } catch {
      return json({ captions: fallbackMemeCaptions(tone), source: 'fallback' });
    }
  }

  if (path === '/api/submissions' && request.method === 'POST') {
    if (!await consumeRateLimit(request, env, 'submissions', 20, 86400)) {
      return json({ error: 'Too many submissions. Please try again later.' }, 429);
    }
    const body = await request.json().catch(() => null);
    const validationError = validateSubmission(body);
    if (validationError) return json({ error: validationError }, 400);
    const submission = normalizeSubmission(body);
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
    // Short cache so repeat reads within a session avoid hitting the worker +
    // D1 again. The board changes slowly, so a 30s browser cache (with a brief
    // stale-while-revalidate window) is a safe, low-risk freshness trade-off.
    return json({ leaderboard: result.results ?? [] }, 200, {
      'cache-control': 'public, max-age=30, stale-while-revalidate=60',
    });
  }

  // Read-only geo hint. Returns a sanitised region string the client
  // uses as the default-nickname prefix. The endpoint is intentionally
  // side-effect free so cold-start upserts can call it without polluting
  // the players table with a half-minted row.
  if (path === '/api/region' && request.method === 'GET') {
    return json({ region: regionFromRequest(request) });
  }

  if (path === '/api/player' && request.method === 'POST') {
    // Rate-limit player registration: 20 / hour / IP.  Without this an
    // attacker can spam unique nicknames to bloat the `players` table or
    // collide with an existing player's nickname to merge accounts.
    if (!await consumeRateLimit(request, env, 'player-reg', 20, 3600)) {
      return json({ error: 'Too many registration requests. Please try again later.' }, 429);
    }
    try {
      const body = await request.json();
      const nickname = cleanNickname(body.nickname);
      const playerId = String(body.playerId || '').trim();
      const now = new Date().toISOString();
      // The region is purely a hint for the client's default-nickname
      // generator. It never reaches the database — we don't want to
      // attach city data to a player account.
      const region = regionFromRequest(request);

      if (playerId) {
        const existing = await env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(playerId).first();
        if (existing) {
          await env.DB.prepare('UPDATE players SET nickname = ?, updated_at = ? WHERE id = ?')
            .bind(nickname, now, playerId).run();
          return json({ player: { ...existing, nickname, updated_at: now }, region });
        }
      }

      // Fallback: match by nickname. The client may have lost their
      // playerId (cleared localStorage, new device) but kept the same
      // nickname — in that case we adopt the existing account so all
      // of their clears stay attributed to one leaderboard row.
      const byName = await env.DB.prepare('SELECT * FROM players WHERE nickname = ?').bind(nickname).first();
      if (byName) {
        // If the client now carries a different ID (e.g. they cleared
        // localStorage and got a fresh UUID), migrate the row to the
        // new ID. This keeps the player's identity consistent across
        // devices. We preserve text_clears and total_score so the
        // rename doesn't reset the leaderboard counters.
        if (playerId && byName.id !== playerId) {
          await env.DB.prepare(`
            UPDATE players SET id = ?, updated_at = ? WHERE id = ?
          `).bind(playerId, now, byName.id).run();
          return json({
            player: { ...byName, id: playerId, nickname, updated_at: now },
            region
          });
        }
        await env.DB.prepare('UPDATE players SET nickname = ?, updated_at = ? WHERE id = ?')
          .bind(nickname, now, byName.id).run();
        return json({ player: { ...byName, nickname, updated_at: now }, region });
      }

      // Brand new player — honour the client-supplied playerId if
      // present so the localStorage identity sticks even before the
      // user has ever interacted with the leaderboard.
      const id = playerId || newId('player');
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
        region
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
      const groups = normalizeGroups(body.groups);
      const title = deriveSubmissionTitle({ title: body.title, groups, nickname });
      const now = new Date().toISOString();
      const id = newId('submission');

      await env.DB.prepare(`
        INSERT INTO puzzle_submissions (id, player_id, nickname, title, groups_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(id, playerId, nickname, title, JSON.stringify(groups), now, now).run();

      return json({
        submission: {
          id,
          player_id: playerId,
          nickname,
          title,
          groups,
          status: 'pending',
          created_at: now,
          updated_at: now,
        },
      }, 201);
    } catch (error) {
      const badRequest = /required|must|needs|characters|invalid|group|submission/i.test(error.message);
      return json({ error: error.message }, badRequest ? 400 : 500);
    }
  }

  if (path === '/api/puzzles' && request.method === 'GET') {
    const result = await env.DB.prepare(`
      SELECT id, player_id, nickname, title, groups_json, status, created_at, updated_at
      FROM puzzle_submissions
      ORDER BY updated_at ASC, created_at ASC
    `).all();
    const submissions = (result.results ?? []).map(serializeSubmission);
    return json(buildApprovedTextPuzzles(submissions));
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
      SELECT id, player_id, nickname, title, groups_json, status, created_at, updated_at
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
    let groups = null;
    if (Array.isArray(body?.groups)) {
      try {
        groups = normalizeGroups(body.groups);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
    }
    if (status === 'included' && groups && !hasCompleteBilingualGroups(groups)) {
      return json({ error: 'Included submissions require English group names and four English words per group' }, 400);
    }
    const now = new Date().toISOString();
    if (status === 'included' && !groups) {
      const current = await env.DB.prepare(`
        SELECT groups_json FROM puzzle_submissions WHERE id = ?
      `).bind(adminPuzzleMatch[1]).first();
      groups = parseSubmissionGroups(current?.groups_json);
    }
    if (status === 'included' && !hasCompleteBilingualGroups(groups)) {
      return json({ error: 'Included submissions require English group names and four English words per group' }, 400);
    }
    const updated = groups
      ? await env.DB.prepare(`
          UPDATE puzzle_submissions SET status = ?, groups_json = ?, updated_at = ? WHERE id = ?
        `).bind(status, JSON.stringify(groups), now, adminPuzzleMatch[1]).run()
      : await env.DB.prepare(`
          UPDATE puzzle_submissions SET status = ?, updated_at = ? WHERE id = ?
        `).bind(status, now, adminPuzzleMatch[1]).run();
    if (!updated.meta?.changes) return json({ error: 'Submission not found' }, 404);
    const row = await env.DB.prepare(`
      SELECT id, player_id, nickname, title, groups_json, status, created_at, updated_at
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
    let groups = null;
    if (Array.isArray(body?.groups)) {
      try {
        groups = normalizeGroups(body.groups);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
    }
    if (status === 'included' && groups && !hasCompleteBilingualGroups(groups)) {
      return json({ error: 'Included submissions require English group names and four English words per group' }, 400);
    }
    const updatedAt = new Date().toISOString();
    if (status === 'included' && !groups) {
      const current = await env.DB.prepare(
        'SELECT groups_json FROM puzzle_submissions WHERE id = ?',
      ).bind(match[1]).first();
      groups = parseSubmissionGroups(current?.groups_json);
    }
    if (status === 'included' && !hasCompleteBilingualGroups(groups)) {
      return json({ error: 'Included submissions require English group names and four English words per group' }, 400);
    }
    const updated = groups
      ? await env.DB.prepare(
          'UPDATE puzzle_submissions SET status = ?, groups_json = ?, updated_at = ? WHERE id = ?',
        ).bind(status, JSON.stringify(groups), updatedAt, match[1]).run()
      : await env.DB.prepare(
          'UPDATE puzzle_submissions SET status = ?, updated_at = ? WHERE id = ?',
        ).bind(status, updatedAt, match[1]).run();
    if (Number(updated.meta?.changes || 0) === 0) return json({ error: '投稿不存在。' }, 404);
    const row = await env.DB.prepare(`
      SELECT id, player_id, nickname, title, groups_json, status, created_at, updated_at
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
