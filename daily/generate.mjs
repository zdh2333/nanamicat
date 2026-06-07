// daily/generate.mjs
// Daily puzzle generation pipeline for the MeowGrid / NanamiCat game.
// Reads/writes daily/data/image-puzzles.json and daily/data/text-puzzles.json,
// saves AI-generated images to public/daily-puzzles/<YYYY-MM-DD>/...
//
// Usage:
//   node daily/generate.mjs                 # full run
//   node daily/generate.mjs --dry-run       # mock everything, verify file structure
//   node daily/generate.mjs --only=text     # skip image gen
//   node daily/generate.mjs --text=5 --image=5
//
// Requires: OPENAI_API_KEY env var (not needed for --dry-run)

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || '1024x1024';
const DEFAULT_TEXT_COUNT = 10;
const DEFAULT_IMAGE_COUNT = 10;
const DIFFICULTY_IDS = ['yellow', 'green', 'blue', 'purple'];
const DIFFICULTY_LABELS = { yellow: '明黄 直观分类', green: '青绿 常识联想', blue: '靛蓝 跨域关系', purple: '紫玄 细节线索' };

// ---------- CLI ----------

function parseArgs(argv) {
  const args = { dryRun: false, only: null, text: DEFAULT_TEXT_COUNT, image: DEFAULT_IMAGE_COUNT, distribution: null };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--only=')) args.only = arg.slice(7);
    else if (arg.startsWith('--text=')) args.text = Number(arg.slice(7));
    else if (arg.startsWith('--image=')) args.image = Number(arg.slice(8));
    else if (arg.startsWith('--image-distribution=')) args.distribution = arg.slice(21).split(',').map(Number);
  }
  return args;
}

// ---------- Files ----------

const PATHS = {
  dailyImage: path.join(ROOT, 'daily/data/image-puzzles.json'),
  dailyText: path.join(ROOT, 'daily/data/text-puzzles.json'),
  publicPuzzles: path.join(ROOT, 'public/daily-puzzles'),
};

async function readJson(p, fallback) {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(p, data) {
  await writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- OpenAI ----------

async function callOpenAiJson({ system, user, model = TEXT_MODEL, maxRetries = 3 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = 1000 * 2 ** attempt;
      console.warn(`  OpenAI ${res.status}, retry in ${wait}ms (${attempt}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${body}`);
    }
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  }
  throw new Error('OpenAI call failed after retries');
}

async function generateImage({ prompt, outPath, dryRun }) {
  if (dryRun) {
    return { url: 'mock://' + outPath, bytes: 0 };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: IMAGE_SIZE, n: 1, response_format: 'b64_json' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`gpt-image-2 error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const buffer = Buffer.from(data.data[0].b64_json, 'base64');
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buffer);
  return { url: 'file://' + outPath, bytes: buffer.length };
}

// ---------- Prompts ----------

const PLANNER_SYSTEM = `你是一名 NYT Connections 风格的中文分类谜题出题人。
为游戏「喵格谜 MeowGrid | NanamiCat」出题，规则：
1. 每题 16 个词，分 4 组，每组 4 个词共享一个隐藏主题。
2. 必须**唯一解** — 任何词被错放到另一组的可能性必须被排除。
3. 难度档位与品牌调性严格对齐：
   - yellow 明黄 直观分类：具体物件，单层语义
   - green 青绿 常识联想：概念/用途/场景
   - blue 靛蓝 跨域关系：跨类别抽象关联
   - purple 紫玄 细节线索：抽象/视觉/关系型
4. 拒绝项：近义词组、跨语言歧义词、一词多义模糊词、中文生僻字、同音字。
5. 品牌反例（禁止）：冷 SaaS dashboard、灰度工具、卡通幼稚、彩虹装饰。

只输出 JSON。`;

const PLANNER_USER = (difficultyLabel, count, type) => `今天为「${difficultyLabel}」档出 ${count} 道${type === 'text' ? '文字' : '图题'}题。
要求：
- 每道 4 组，每组 4 项
- 组名 2-4 个汉字
- 项目用具体名词（不要"物品类"、"形状"等太泛的词）
- 每组 4 项必须是同一档语义、视觉或概念上紧密相关
- 跨组不能有合理歧义

输出 JSON 格式：
{
  "puzzles": [
    {
      "theme_hint": "一句话提示语（不直接说答案）",
      "groups": [
        { "name": "组名1", "items": ["词1", "词2", "词3", "词4"] },
        { "name": "组名2", "items": ["词1", "词2", "词3", "词4"] },
        { "name": "组名3", "items": ["词1", "词2", "词3", "词4"] },
        { "name": "组名4", "items": ["词1", "词2", "词3", "词4"] }
      ]
    }
  ]
}`;

const VALIDATOR_SYSTEM = `你是 Connections 谜题唯一解审核员。
严格判断：除了给定的 4 组，是否还有任何其他合理的 4-组-分法。
如有歧义，输出 invalid 并指出哪个词可以放别处。`;

const VALIDATOR_USER = (puzzle) => `判断下面这道题是否**唯一解**：
${JSON.stringify(puzzle, null, 2)}

输出 JSON：
{
  "valid": true | false,
  "score": 1-5,
  "issues": ["如果有歧义词，列出 e.g. 'item X 也能归到 Y 组'"]
}
5=完全唯一，4=小瑕疵可接受，≤3=必须重做。`;

const IMAGE_PROMPT = (subject) => `Use case: product visual reference for a 16-tile photographic puzzle.
Asset type: single photographic subject tile.
Subject: ${subject}
Style: high quality realistic photography, bright neutral lighting, strong object recognition, clean uncluttered background.
Composition: square crop, single centered subject, no overlap, no border, no frame.
Constraints: no people, no text, no labels, no logos, no watermark, no decorative elements.`;

// ---------- Pipeline ----------

function difficultyForIndex(idx, distribution) {
  if (distribution && distribution.length === 4) {
    const sum = distribution.reduce((a, b) => a + b, 0);
    const target = idx % sum;
    let acc = 0;
    for (let i = 0; i < 4; i++) {
      acc += distribution[i];
      if (target < acc) return DIFFICULTY_IDS[i];
    }
  }
  return DIFFICULTY_IDS[idx % 4];
}

async function generatePuzzlesBatch({ difficulty, count, type, dryRun }) {
  if (count === 0) return [];
  console.log(`\n[${difficulty}] generating ${count} ${type} puzzles…`);
  if (dryRun) {
    return Array.from({ length: count }, (_, i) => ({
      theme_hint: `mock ${difficulty} ${type} ${i + 1}`,
      groups: DIFFICULTY_IDS.map((_, gi) => ({
        name: `mock-${difficulty}-g${gi}`,
        items: [`item-${difficulty}-${i}-${gi}-1`, `-2`, `-3`, `-4`],
      })),
    }));
  }
  const sys = PLANNER_SYSTEM;
  const user = PLANNER_USER(DIFFICULTY_LABELS[difficulty], count, type);
  const { puzzles } = await callOpenAiJson({ system: sys, user });
  return puzzles;
}

async function validatePuzzle(puzzle, type, dryRun) {
  if (dryRun) return { valid: true, score: 5, issues: [] };
  try {
    return await callOpenAiJson({ system: VALIDATOR_SYSTEM, user: VALIDATOR_USER(puzzle) });
  } catch (err) {
    console.warn(`  validation failed: ${err.message}`);
    return { valid: false, score: 0, issues: [err.message] };
  }
}

function toImagePuzzleSpec(groups, urls) {
  // groups = [{name, items:[4 strings]}], urls = 4 arrays of 4 URLs
  return groups.map((g, gi) => `${g.name}|${urls[gi].join(',')}`);
}

function toTextPuzzleSpec(groups) {
  return groups.map((g) => [g.name, ...g.items]);
}

async function generateImagesForPuzzle(puzzle, { date, difficulty, puzzleIndex, dryRun }) {
  const urls = [];
  for (let gi = 0; gi < puzzle.groups.length; gi++) {
    const group = puzzle.groups[gi];
    const groupUrls = [];
    for (let vi = 0; vi < group.items.length; vi++) {
      const item = group.items[vi];
      const fileName = `g${gi}-${vi + 1}.jpg`;
      const relPath = `/daily-puzzles/${date}/${difficulty}-${puzzleIndex}/${fileName}`;
      const absPath = path.join(PATHS.publicPuzzles, date, `${difficulty}-${puzzleIndex}`, fileName);
      console.log(`  [${difficulty}-${puzzleIndex}/g${gi}-${vi + 1}] ${item}`);
      const prompt = IMAGE_PROMPT(item);
      await generateImage({ prompt, outPath: absPath, dryRun });
      groupUrls.push(relPath);
    }
    urls.push(groupUrls);
  }
  return urls;
}

async function runImagePipeline({ count, distribution, dryRun, date, existing }) {
  const plan = [];
  for (let i = 0; i < count; i++) {
    const diff = difficultyForIndex(i, distribution);
    plan.push({ idx: i, difficulty: diff });
  }
  const grouped = {};
  for (const p of plan) (grouped[p.difficulty] = grouped[p.difficulty] || []).push(p.idx);

  const newPuzzles = { yellow: [], green: [], blue: [], purple: [] };
  for (const [diff, indices] of Object.entries(grouped)) {
    const puzzles = await generatePuzzlesBatch({ difficulty: diff, count: indices.length, type: 'image', dryRun });
    for (let k = 0; k < puzzles.length; k++) {
      const puzzle = puzzles[k];
      const puzzleIndex = existing[diff].length + k;
      // validate (1 retry)
      let v = await validatePuzzle(puzzle, 'image', dryRun);
      if (!v.valid && v.score <= 3 && !dryRun) {
        console.warn(`  retry ${diff}-${puzzleIndex} (score ${v.score})`);
        const retry = await generatePuzzlesBatch({ difficulty: diff, count: 1, type: 'image', dryRun });
        if (retry[0]) {
          Object.assign(puzzle, retry[0]);
          v = await validatePuzzle(puzzle, 'image', dryRun);
        }
      }
      if (!v.valid && v.score <= 3) {
        console.warn(`  skip ${diff}-${puzzleIndex} (failed validation)`);
        continue;
      }
      console.log(`  ✓ ${diff}-${puzzleIndex} (score ${v.score})`);
      const urls = await generateImagesForPuzzle(puzzle, { date, difficulty: diff, puzzleIndex, dryRun });
      newPuzzles[diff].push(toImagePuzzleSpec(puzzle.groups, urls));
    }
  }
  return newPuzzles;
}

async function runTextPipeline({ count, dryRun, existing }) {
  // For text mode, generate per-difficulty so each difficulty's simpleTextPuzzles grows evenly.
  const perDiff = Math.max(1, Math.ceil(count / 4));
  const newText = { yellow: [], green: [], blue: [], purple: [] };
  let made = 0;
  for (const diff of DIFFICULTY_IDS) {
    if (made >= count) break;
    const want = Math.min(perDiff, count - made);
    const puzzles = await generatePuzzlesBatch({ difficulty: diff, count: want, type: 'text', dryRun });
    for (let k = 0; k < puzzles.length; k++) {
      const puzzle = puzzles[k];
      let v = await validatePuzzle(puzzle, 'text', dryRun);
      if (!v.valid && v.score <= 3 && !dryRun) {
        console.warn(`  retry text ${diff} ${k} (score ${v.score})`);
        const retry = await generatePuzzlesBatch({ difficulty: diff, count: 1, type: 'text', dryRun });
        if (retry[0]) { Object.assign(puzzle, retry[0]); v = await validatePuzzle(puzzle, 'text', dryRun); }
      }
      if (!v.valid && v.score <= 3) { console.warn(`  skip text ${diff} ${k}`); continue; }
      console.log(`  ✓ text ${diff} ${k} (score ${v.score})`);
      newText[diff].push(toTextPuzzleSpec(puzzle.groups));
      made++;
    }
  }
  return newText;
}

// ---------- Git ----------

async function gitCommitAndPush(message) {
  return new Promise((resolve, reject) => {
    const authorName = process.env.GIT_AUTHOR_NAME || 'nanamicat-bot';
    const authorEmail = process.env.GIT_AUTHOR_EMAIL || 'bot@nanamicat.com';
    const run = (args, opts = {}) => new Promise((res, rej) => {
      const child = spawn('git', args, { cwd: ROOT, ...opts });
      let out = '', err = '';
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (err += d));
      child.on('close', (code) => (code === 0 ? res(out.trim()) : rej(new Error(`git ${args.join(' ')} → ${code}: ${err}`))));
    });
    (async () => {
      try {
        await run(['add', 'daily/data/image-puzzles.json', 'daily/data/text-puzzles.json', 'public/daily-puzzles/']);
        const status = await run(['status', '--porcelain']);
        if (!status) {
          console.log('  no changes to commit');
          return resolve(false);
        }
        await run(['-c', `user.name=${authorName}`, '-c', `user.email=${authorEmail}`, 'commit', '-m', message]);
        const remote = await run(['remote']).catch(() => '');
        if (remote.trim()) {
          try { await run(['push']); } catch (e) { console.warn(`  push failed (non-fatal): ${e.message}`); }
        }
        resolve(true);
      } catch (e) { reject(e); }
    })();
  });
}

// ---------- Main ----------

async function main() {
  const args = parseArgs(process.argv);
  const date = todayDate();
  console.log(`[daily-puzzles] date=${date} dryRun=${args.dryRun} text=${args.text} image=${args.image}`);
  if (!args.dryRun && !process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set; pass --dry-run to test without API.');
    process.exit(2);
  }

  const dailyImage = await readJson(PATHS.dailyImage, { version: 1, generatedAt: null, yellow: [], green: [], blue: [], purple: [] });
  const dailyText = await readJson(PATHS.dailyText, { version: 1, generatedAt: null, yellow: [], green: [], blue: [], purple: [] });
  if (!Array.isArray(dailyImage.yellow)) dailyImage.yellow = [];
  if (!Array.isArray(dailyImage.green)) dailyImage.green = [];
  if (!Array.isArray(dailyImage.blue)) dailyImage.blue = [];
  if (!Array.isArray(dailyImage.purple)) dailyImage.purple = [];
  if (!Array.isArray(dailyText.yellow)) dailyText.yellow = [];
  if (!Array.isArray(dailyText.green)) dailyText.green = [];
  if (!Array.isArray(dailyText.blue)) dailyText.blue = [];
  if (!Array.isArray(dailyText.purple)) dailyText.purple = [];

  let newImage = { yellow: [], green: [], blue: [], purple: [] };
  let newText = { yellow: [], green: [], blue: [], purple: [] };

  if (args.only !== 'text') {
    newImage = await runImagePipeline({
      count: args.image,
      distribution: args.distribution,
      dryRun: args.dryRun,
      date,
      existing: dailyImage,
    });
  }
  if (args.only !== 'image') {
    newText = await runTextPipeline({ count: args.text, dryRun: args.dryRun, existing: dailyText });
  }

  const made = [...Object.values(newImage), ...Object.values(newText)].flat().length;
  if (made === 0) {
    console.log('\n[daily-puzzles] nothing generated, exit.');
    return;
  }

  if (args.dryRun) {
    console.log(`\n[daily-puzzles] dry run planned ${made} puzzle entries; no files were written.`);
    return;
  }

  for (const d of DIFFICULTY_IDS) {
    if (newImage[d].length) dailyImage[d] = [...dailyImage[d], ...newImage[d]];
    if (newText[d].length) dailyText[d] = [...dailyText[d], ...newText[d]];
  }
  dailyImage.generatedAt = new Date().toISOString();
  dailyImage.version = 1;
  dailyText.generatedAt = new Date().toISOString();
  dailyText.version = 1;

  await writeJson(PATHS.dailyImage, dailyImage);
  await writeJson(PATHS.dailyText, dailyText);
  console.log(`\n[daily-puzzles] wrote ${made} new puzzle entries`);

  if (!args.dryRun && process.env.DAILY_COMMIT === '1') {
    try {
      const committed = await gitCommitAndPush(`chore(daily): add ${made} puzzles for ${date}`);
      if (committed) console.log('  git commit + push done');
    } catch (e) {
      console.warn(`  git step failed: ${e.message}`);
    }
  }
}

main().catch((err) => {
  console.error('[daily-puzzles] FATAL:', err);
  process.exit(1);
});
