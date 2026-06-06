import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imagePuzzleCatalog, realImagePuzzleIndexes } from '../src/puzzles.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const summary = {};
const referencedLocalSets = new Set();

for (const [difficulty, puzzles] of Object.entries(imagePuzzleCatalog)) {
  const realIndexes = realImagePuzzleIndexes[difficulty] || [];
  summary[difficulty] = { total: puzzles.length, real: realIndexes.length };

  puzzles.forEach((puzzle, puzzleIndex) => {
    if (puzzle.groups.length !== 4) {
      failures.push(`${difficulty}-${puzzleIndex}: expected 4 groups, found ${puzzle.groups.length}`);
    }

    const groupNames = new Set();
    const itemIds = new Set();
    puzzle.groups.forEach((group, groupIndex) => {
      if (group.items.length !== 4) {
        failures.push(`${difficulty}-${puzzleIndex} group ${groupIndex}: expected 4 items, found ${group.items.length}`);
      }
      if (groupNames.has(group.name)) failures.push(`${difficulty}-${puzzleIndex}: duplicate group name "${group.name}"`);
      groupNames.add(group.name);

      group.items.forEach((item) => {
        if (itemIds.has(item.id)) failures.push(`${difficulty}-${puzzleIndex}: duplicate item id "${item.id}"`);
        itemIds.add(item.id);
      });
    });

    if (itemIds.size !== 16) failures.push(`${difficulty}-${puzzleIndex}: expected 16 unique items, found ${itemIds.size}`);
  });

  for (const puzzleIndex of realIndexes) {
    const puzzle = puzzles[puzzleIndex];
    for (const item of puzzle.items) {
      if (!item.imageUrl.startsWith('/')) continue;
      const imagePath = path.join(root, 'public', item.imageUrl.slice(1));
      const localSet = item.imageUrl.match(/^\/puzzles\/([^/]+)\//)?.[1];
      if (localSet) referencedLocalSets.add(localSet);
      try {
        await access(imagePath);
        if ((await stat(imagePath)).size === 0) failures.push(`${item.imageUrl}: empty image file`);
      } catch {
        failures.push(`${item.imageUrl}: missing image file`);
      }
    }
  }
}

const puzzleSetsPath = path.join(root, 'public', 'puzzles');
for (const entry of await readdir(puzzleSetsPath, { withFileTypes: true })) {
  if (entry.isDirectory() && !referencedLocalSets.has(entry.name)) {
    failures.push(`/puzzles/${entry.name}: image set is not referenced by any playable real-image puzzle`);
  }
}

console.table(summary);
if (failures.length) {
  console.error(`Puzzle validation failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Puzzle validation passed.');
