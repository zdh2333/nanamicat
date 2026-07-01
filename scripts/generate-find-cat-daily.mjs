// Generate the daily Find the Cat scenes.
//
// Usage:
//   node scripts/generate-find-cat-daily.mjs
//   node scripts/generate-find-cat-daily.mjs --dry-run
//   node scripts/generate-find-cat-daily.mjs --date=2026-07-02 --count=2
//   DAILY_FIND_CAT_COMMIT=1 node scripts/generate-find-cat-daily.mjs
//
// Real image generation uses Gemini. Dry-run only prints the selected plan.
// Add --write-mock when you intentionally want SVG placeholders on disk for UI QA.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_COUNT = 2;
const MANIFEST_PATH = path.join(ROOT, 'daily/data/find-cat-scenes.json');
const PUBLIC_DIR = path.join(ROOT, 'public/find-cat');
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
const STYLE_ID = 'nanami-cozy-watercolor-v1';
const STYLE_PROMPT = [
  'Consistent Nanami Cat Daily hidden-cat scene.',
  'Warm hand-drawn watercolor and colored-pencil illustration, cozy Japanese-European home atmosphere.',
  'Cream paper texture, honey sunlight, sage green and soft yellow accents, deep navy sketch outlines.',
  'Square composition, readable objects, playful but not childish, no UI, no text, no watermark.',
  'Nanami is a small black cat with yellow eyes and a tiny gold ribbon, partially hidden but findable.'
].join(' ');

const ROOM_BANK = [
  ['sunroom-study', 'a sunlit study with a green armchair, wood desk, window plants, books, mug, and woven rug'],
  ['attic-library', 'a cozy attic library with low shelves, stacked books, a brass lamp, cushions, and a sloped window'],
  ['bakery-kitchen', 'a tiny bakery kitchen with a checkered cloth, cooling bread, herbs, ceramic bowls, and warm tiles'],
  ['rainy-window-cafe', 'a quiet window cafe corner with rain outside, round table, pastries, plants, and a coat rack'],
  ['plant-shop', 'a compact plant shop with terracotta pots, hanging ivy, seed packets, watering cans, and a stool'],
  ['laundry-nook', 'a cheerful laundry nook with folded towels, baskets, sunny window, detergent shelf, and slippers'],
  ['music-room', 'a small music room with upright piano, guitar stand, sheet music, soft lamp, and patterned rug'],
  ['craft-table', 'a craft table with washi tape, paper scraps, scissors, paint jars, pinboard, and fabric rolls'],
  ['bookstore-aisle', 'a narrow independent bookstore aisle with a ladder, display table, paper lantern, and stacked novels'],
  ['greenhouse-corner', 'an indoor greenhouse corner with glass panes, ferns, watering can, clay pots, and wooden bench'],
  ['tea-room', 'a calm tea room with low table, cushions, teapot, hanging scroll, shelves, and afternoon light'],
  ['studio-apartment', 'a compact studio apartment with sofa bed, side table, curtain, shelf plants, and framed prints'],
  ['toy-shelf', 'a nostalgic toy shelf corner with wooden blocks, plush toys, picture books, lamp, and storage boxes'],
  ['sewing-room', 'a sewing room with fabric bolts, mannequin, thread spools, sewing machine, and pin cushions'],
  ['garden-shed', 'a tidy garden shed interior with gloves, tools, seed trays, boots, sunhat, and window vines'],
  ['breakfast-room', 'a breakfast room with toast, jam jars, fruit bowl, yellow chairs, and morning newspaper'],
  ['artist-loft', 'an artist loft with easel, paint palette, canvas stacks, skylight, stools, and plants'],
  ['reading-corner', 'a reading corner with blanket, book cart, floor lamp, framed cats, side table, and soft rug'],
  ['ceramic-studio', 'a ceramic studio with clay pots, shelves, glaze jars, apron, and a small kiln corner'],
  ['flower-workbench', 'a florist workbench with ribbons, bouquets, vases, kraft paper, scissors, and sunny window'],
  ['night-desk', 'a gentle night desk scene with moonlit window, notebook, lamp, tea cup, blanket, and shelf plants'],
  ['picnic-veranda', 'a covered veranda with picnic basket, cushions, potted herbs, gingham cloth, and garden view'],
  ['museum-office', 'a charming tiny museum office with catalog cards, fossils, map drawers, desk lamp, and labels hidden from view'],
  ['stationery-shop', 'a stationery shop display with notebooks, stamps, pencils, memo pads, washi rolls, and paper bags'],
  ['winter-cabin', 'a warm winter cabin interior with fireplace, knitted socks, books, cocoa, pine garland, and window snow'],
  ['summer-porch', 'a breezy summer porch with bamboo blinds, lemonade, fans, sandals, plants, and woven mat'],
  ['retro-computer', 'a retro computer desk with beige monitor, sticky notes without text, floppy disks, lamp, and coffee mug'],
  ['aquarium-room', 'a quiet room with small aquarium, plants, blue reflections, books, chair, and round rug'],
  ['kimono-closet', 'a tidy closet room with folded fabrics, wooden hangers, baskets, mirror, and paper screen'],
  ['miniature-gallery', 'a miniature gallery corner with tiny houses, display shelves, model trees, work lamp, and boxes']
];

const HIDE_SPOTS = [
  { id: 'leafy-right', target: { x: 76, y: 64 }, hint: 'Nanami loves leafy corners.', prompt: 'Hide Nanami peeking from behind a large leafy plant in the right third of the image; the cat center is around 76% x and 64% y.' },
  { id: 'under-table', target: { x: 54, y: 74 }, hint: 'Look below the table line.', prompt: 'Hide Nanami low under or beside the main table; the cat center is around 54% x and 74% y.' },
  { id: 'shelf-shadow', target: { x: 82, y: 36 }, hint: 'A shelf shadow has bright eyes.', prompt: 'Hide Nanami among dark shelf shadows in the upper-right area; the cat center is around 82% x and 36% y.' },
  { id: 'curtain-left', target: { x: 24, y: 42 }, hint: 'Check where fabric meets light.', prompt: 'Hide Nanami peeking from behind a curtain or hanging fabric on the left side; the cat center is around 24% x and 42% y.' },
  { id: 'basket-low', target: { x: 34, y: 78 }, hint: 'One basket has ears.', prompt: 'Hide Nanami tucked near a basket or storage box low in the image; the cat center is around 34% x and 78% y.' },
  { id: 'chair-back', target: { x: 63, y: 52 }, hint: 'The chair is not alone.', prompt: 'Hide Nanami partly behind a chair back or cushion near the center-right; the cat center is around 63% x and 52% y.' }
];

function parseArgs(argv) {
  const args = { date: new Date().toISOString().slice(0, 10), count: DEFAULT_COUNT, dryRun: false, writeMock: false, commit: process.env.DAILY_FIND_CAT_COMMIT === '1' };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--write-mock') args.writeMock = true;
    else if (arg === '--commit') args.commit = true;
    else if (arg.startsWith('--date=')) args.date = arg.slice(7);
    else if (arg.startsWith('--count=')) args.count = Number(arg.slice(8));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error('--date must be YYYY-MM-DD');
  if (!Number.isInteger(args.count) || args.count < 1 || args.count > 4) throw new Error('--count must be an integer from 1 to 4');
  return args;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sceneBank() {
  return ROOM_BANK.flatMap(([roomId, roomPrompt], roomIndex) =>
    HIDE_SPOTS.map((spot, spotIndex) => ({
      sceneId: `${STYLE_ID}-${roomId}-${spot.id}`,
      roomId,
      roomPrompt,
      spotId: spot.id,
      hint: spot.hint,
      target: spot.target,
      title: `${roomId.replaceAll('-', ' ')} ${spotIndex + 1}`,
      prompt: [
        STYLE_PROMPT,
        `Scene: ${roomPrompt}.`,
        spot.prompt,
        `Composition seed: room ${roomIndex + 1}, hide spot ${spotIndex + 1}.`
      ].join('\n')
    }))
  );
}

function normalizeManifest(manifest) {
  return {
    version: 1,
    generatedAt: manifest?.generatedAt || null,
    styleId: manifest?.styleId || STYLE_ID,
    scenes: Array.isArray(manifest?.scenes) ? manifest.scenes : []
  };
}

function chooseScenes({ manifest, date, count }) {
  const existingForDate = manifest.scenes.filter((scene) => scene.date === date);
  if (existingForDate.length >= count) return { existingForDate, selected: [] };

  const used = new Set(manifest.scenes.map((scene) => scene.sceneId));
  const available = sceneBank()
    .filter((scene) => !used.has(scene.sceneId))
    .sort((a, b) => hashString(`${date}:${a.sceneId}`) - hashString(`${date}:${b.sceneId}`));
  const need = count - existingForDate.length;
  if (available.length < need) {
    throw new Error(`Find Cat scene bank exhausted: need ${need}, available ${available.length}. Add more ROOM_BANK/HIDE_SPOTS entries.`);
  }
  return { existingForDate, selected: available.slice(0, need) };
}

function svgEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function writeDryRunSvg({ scene, outPath }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#f8f1e4"/>
  <rect x="44" y="44" width="936" height="936" rx="38" fill="#fff7df" stroke="#12345f" stroke-width="16"/>
  <path d="M120 230 C260 130 380 270 520 170 C660 70 790 210 910 150" fill="none" stroke="#f5c94a" stroke-width="32" stroke-linecap="round" opacity=".5"/>
  <rect x="120" y="230" width="230" height="230" rx="18" fill="#bfe6ff" stroke="#12345f" stroke-width="10"/>
  <rect x="612" y="210" width="260" height="390" rx="18" fill="#b87934" stroke="#12345f" stroke-width="10"/>
  <circle cx="510" cy="590" r="145" fill="#8fbd6d" stroke="#12345f" stroke-width="12"/>
  <ellipse cx="520" cy="770" rx="300" ry="84" fill="#f5c94a" opacity=".55"/>
  <circle cx="${scene.target.x * 10.24}" cy="${scene.target.y * 10.24}" r="34" fill="#141820"/>
  <circle cx="${scene.target.x * 10.24 - 11}" cy="${scene.target.y * 10.24 - 5}" r="5" fill="#ffd95c"/>
  <circle cx="${scene.target.x * 10.24 + 11}" cy="${scene.target.y * 10.24 - 5}" r="5" fill="#ffd95c"/>
  <text x="512" y="940" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#12345f">${svgEscape(scene.roomId)} / ${svgEscape(scene.spotId)}</text>
</svg>`;
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, svg, 'utf8');
}

async function writeGeminiPng({ prompt, outPath }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set; use --dry-run to test without API quota.');
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input: [{ type: 'text', text: prompt }]
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini image generation failed ${response.status}: ${body.slice(0, 500)}`);
  }
  const payload = await response.json();
  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  const base64 = payload?.output_image?.data
    || payload?.outputImage?.data
    || outputItems.find((item) => item?.type === 'image' && item?.data)?.data
    || outputItems.find((item) => item?.image?.data)?.image?.data;
  if (!base64) throw new Error('Gemini response did not include image data.');
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.from(base64, 'base64'));
}

async function gitCommitAndPush(message) {
  const authorName = process.env.GIT_AUTHOR_NAME || 'nanamicat-bot';
  const authorEmail = process.env.GIT_AUTHOR_EMAIL || 'bot@nanamicat.com';
  const run = (args) => new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: ROOT });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`git ${args.join(' ')} -> ${code}: ${stderr}`)));
  });
  await run(['add', 'daily/data/find-cat-scenes.json', 'public/find-cat/']);
  const status = await run(['status', '--porcelain']);
  if (!status) return false;
  await run(['-c', `user.name=${authorName}`, '-c', `user.email=${authorEmail}`, 'commit', '-m', message]);
  const remote = await run(['remote']).catch(() => '');
  if (remote.trim()) await run(['push']);
  return true;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifest = normalizeManifest(await readJson(MANIFEST_PATH, null));
  const { existingForDate, selected } = chooseScenes({ manifest, date: args.date, count: args.count });
  console.log(`[find-cat-daily] date=${args.date} count=${args.count} dryRun=${args.dryRun} writeMock=${args.writeMock}`);
  if (selected.length === 0) {
    console.log(`[find-cat-daily] ${existingForDate.length} scenes already exist for ${args.date}; nothing to generate.`);
    return;
  }
  if (args.dryRun && !args.writeMock) {
    for (let index = 0; index < selected.length; index += 1) {
      const slot = existingForDate.length + index + 1;
      const scene = selected[index];
      console.log(`  planned scene-${slot}: ${scene.sceneId} target=${scene.target.x},${scene.target.y}`);
    }
    console.log('[find-cat-daily] dry run only; no files written.');
    return;
  }

  const nextScenes = [];
  for (let index = 0; index < selected.length; index += 1) {
    const slot = existingForDate.length + index + 1;
    const scene = selected[index];
    const extension = args.writeMock ? 'svg' : 'png';
    const publicPath = `/find-cat/${args.date}/scene-${slot}.${extension}`;
    const outPath = path.join(PUBLIC_DIR, args.date, `scene-${slot}.${extension}`);
    console.log(`  scene-${slot}: ${scene.sceneId}`);
    if (args.writeMock) await writeDryRunSvg({ scene, outPath });
    else await writeGeminiPng({ prompt: scene.prompt, outPath });
    nextScenes.push({
      id: `${args.date}-${slot}`,
      date: args.date,
      slot,
      sceneId: scene.sceneId,
      styleId: STYLE_ID,
      imageUrl: publicPath,
      target: scene.target,
      hitRadius: 9,
      hint: scene.hint,
      title: scene.title,
      prompt: scene.prompt,
      generatedAt: new Date().toISOString(),
      generator: args.writeMock ? 'mock-svg' : `gemini:${GEMINI_MODEL}`
    });
  }

  manifest.scenes = [...manifest.scenes, ...nextScenes]
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot);
  manifest.generatedAt = new Date().toISOString();
  manifest.styleId = STYLE_ID;
  await writeJson(MANIFEST_PATH, manifest);
  console.log(`[find-cat-daily] wrote ${nextScenes.length} scenes`);

  if (args.commit) {
    const committed = await gitCommitAndPush(`chore(find-cat): add daily scenes for ${args.date}`);
    console.log(committed ? '[find-cat-daily] committed and pushed' : '[find-cat-daily] no git changes to commit');
  }
}

main().catch((error) => {
  console.error('[find-cat-daily] FATAL:', error);
  process.exit(1);
});
