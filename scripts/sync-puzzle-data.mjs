import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json");
const iosOut = source;
const publicOut = join(root, "public/puzzle-data.json");
const docsOut = join(root, "docs/text-puzzle-manifest-v2.json");

const raw = readFileSync(source, "utf8");
JSON.parse(raw);

copyFileSync(source, publicOut);
writeFileSync(docsOut, `${JSON.stringify(JSON.parse(raw), null, 2)}\n`);

console.log("Synced puzzle-data.json → public/ and docs/");
console.log("Source of truth:", iosOut);
