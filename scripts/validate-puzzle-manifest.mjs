import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/validate-puzzle-manifest.mjs <manifest.json>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(path, "utf8"));
const bank = data.textGroupBank ?? [];
const manifest = data.textPuzzleManifest ?? data.puzzles ?? [];
const count = data.textPuzzleCount ?? 100;

const bankById = new Map(bank.map((g) => [g.id, g]));
const errors = [];

if (bank.length === 0) errors.push("textGroupBank is empty");

const bankIds = new Set();
const wordToGroup = new Map();
for (const g of bank) {
  if (!g.id) errors.push("group missing id");
  else if (bankIds.has(g.id)) errors.push(`duplicate group id: ${g.id}`);
  else bankIds.add(g.id);
  if (![1, 2, 3, 4].includes(g.level)) errors.push(`group ${g.id}: level must be 1-4`);
  if (!Array.isArray(g.words) || g.words.length !== 4) errors.push(`group ${g.id}: words must be length 4`);
  if (g.words?.some((w) => /[甲乙丙丁]$/.test(w))) errors.push(`group ${g.id}: word ends with 甲乙丙丁 suffix`);
  for (const word of g.words ?? []) {
    if (wordToGroup.has(word)) {
      errors.push(`duplicate word "${word}" in groups ${wordToGroup.get(word)} and ${g.id}`);
    } else {
      wordToGroup.set(word, g.id);
    }
  }
}

if (manifest.length !== count) {
  errors.push(`manifest length ${manifest.length} != textPuzzleCount ${count}`);
}

const usedKeys = new Set();

manifest.forEach((entry, index) => {
  const n = index + 1;
  const expectedD = Math.min(4, Math.floor(index / 25) + 1);
  if (entry.difficulty !== expectedD) {
    errors.push(`text-${String(n).padStart(3, "0")}: difficulty ${entry.difficulty} != expected ${expectedD}`);
  }

  const ids = entry.groupIds;
  if (!Array.isArray(ids) || ids.length !== 4) {
    errors.push(`text-${String(n).padStart(3, "0")}: groupIds must be length 4`);
    return;
  }

  const unique = new Set(ids);
  if (unique.size !== 4) errors.push(`text-${String(n).padStart(3, "0")}: duplicate groupIds in puzzle`);

  const key = [...ids].sort().join("|");
  if (usedKeys.has(key)) errors.push(`duplicate puzzle combination: ${key}`);
  else usedKeys.add(key);

  let hasHigh = false;
  for (const id of ids) {
    const g = bankById.get(id);
    if (!g) {
      errors.push(`text-${String(n).padStart(3, "0")}: unknown group id ${id}`);
      continue;
    }
    if (g.level > entry.difficulty) {
      errors.push(`text-${String(n).padStart(3, "0")}: group ${id} level ${g.level} > puzzle difficulty ${entry.difficulty}`);
    }
    if (g.level === entry.difficulty) hasHigh = true;
  }
  if (entry.difficulty >= 2 && !hasHigh) {
    errors.push(`text-${String(n).padStart(3, "0")}: difficulty ${entry.difficulty} puzzle needs at least one level-${entry.difficulty} group`);
  }
});

if (errors.length) {
  console.error("VALIDATION FAILED\n");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}

console.log(`OK: ${bank.length} groups, ${manifest.length} unique puzzles`);
