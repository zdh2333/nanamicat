import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "src/main.jsx"), "utf8");

function extractConst(name) {
  if (name === "textGroupBank") {
    const iife = source.match(/const textGroupBank = \(\(\) => \{([\s\S]*?)\}\)\(\);/m);
    if (iife) {
      return eval(`(() => {${iife[1]}})()`);
    }
    const plain = source.match(/const textGroupBank = (\[[\s\S]*?\]);/m);
    if (plain) {
      return eval(`(${plain[1]})`);
    }
  }
  const re = new RegExp(`const ${name} = ([\\s\\S]*?);\\n\\n`, "m");
  const match = source.match(re);
  if (!match) throw new Error(`Missing ${name}`);
  return eval(`(${match[1]})`);
}

const payload = {
  textGroupBank: extractConst("textGroupBank"),
  puzzleThemes: extractConst("puzzleThemes"),
  redHerringNotes: extractConst("redHerringNotes"),
  englishPuzzleTerms: extractConst("englishPuzzleTerms"),
  maxMistakes: 4,
  textPuzzleCount: 100
};

const out = join(root, "NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json");
writeFileSync(out, JSON.stringify(payload, null, 2));
console.log("Wrote", out);
