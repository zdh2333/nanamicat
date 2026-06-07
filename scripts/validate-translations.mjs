import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = process.argv[2] || join(root, "NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json");
const data = JSON.parse(readFileSync(path, "utf8"));
const terms = data.englishPuzzleTerms ?? {};
const required = new Set();

for (const group of data.textGroupBank ?? []) {
  required.add(group.name);
  for (const word of group.words ?? []) required.add(word);
}

for (const theme of data.puzzleThemes ?? []) required.add(theme);
for (const note of data.redHerringNotes ?? []) required.add(note);
for (const entry of data.textPuzzleManifest ?? []) {
  required.add(entry.theme);
  required.add(entry.redHerring);
}

const missing = [...required].filter((term) => !String(terms[term] || "").trim());
if (missing.length) {
  console.error(`Missing ${missing.length} English puzzle terms:`);
  for (const term of missing) console.error(` - ${term}`);
  process.exit(1);
}

console.log(`OK: ${required.size} required terms covered by ${Object.keys(terms).length} English terms`);
