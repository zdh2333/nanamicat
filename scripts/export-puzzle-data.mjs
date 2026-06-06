/**
 * @deprecated Use `npm run sync:puzzles` instead.
 * Kept as a thin alias so older docs/scripts keep working.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const script = join(dirname(fileURLToPath(import.meta.url)), "sync-puzzle-data.mjs");
const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
process.exit(result.status ?? 1);
