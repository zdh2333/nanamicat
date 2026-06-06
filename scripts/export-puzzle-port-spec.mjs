/**
 * Extract puzzle engine constants from src/main.jsx for Swift port documentation.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "src/main.jsx"), "utf8");

function extractConst(name) {
  const re = new RegExp(`const ${name} = ([\\s\\S]*?);\\n\\n`, "m");
  const match = source.match(re);
  if (!match) throw new Error(`Missing ${name}`);
  return match[1];
}

const names = [
  "textGroupBank",
  "puzzleThemes",
  "redHerringNotes",
  "englishPuzzleTerms"
];

const sections = names.map((name) => {
  const raw = extractConst(name);
  return `### \`${name}\`\n\n\`\`\`javascript\nconst ${name} = ${raw};\n\`\`\`\n`;
});

const algo = `
## 生成算法（与 Web 一致）

### \`getTodayIndex(max)\`
\`\`\`javascript
const now = new Date();
return (now.getUTCFullYear() * 372 + now.getUTCMonth() * 31 + now.getUTCDate()) % max;
\`\`\`

### \`buildTextPuzzles()\`
- \`textPuzzleCount = 100\`
- 每题 \`difficulty = min(4, floor(index / 25) + 1)\`
- \`candidates = textGroupBank.filter(g => g.level <= difficulty)\`
- \`offsets = [0,7,19,31].map(step => (index*5 + step + difficulty*3) % candidates.length)\`
- 4 组各取 \`candidates[offsets[groupSlot]]\`，item id: \`text-{n}-{groupSlot}-{word}\` 等价 \`textItem(word, puzzleId)\`
- puzzle id: \`text-{String(index+1).padStart(3,'0')}\`

### 游戏常量
| 常量 | 值 |
|------|-----|
| maxMistakes | 4 |
| textPuzzleCount | 100 |

### Swift 文件映射
| Web | Swift |
|-----|-------|
| textGroupBank | \`PuzzleData.textGroupBank\` |
| buildTextPuzzles | \`PuzzleEngine.buildTextPuzzles()\` |
| getTodayIndex | \`PuzzleEngine.todayIndex(count:)\` |
| englishPuzzleTerms | \`PuzzleLocalization.terms\` |
| localStorage keys | \`UserDefaultsKeys\` |
`;

const doc = `# NanamiCat Puzzle Engine — Swift 移植对照

> 自动生成自 \`src/main.jsx\`。逻辑必须与 Web 完全一致以保证 \`puzzleId\` 与计分去重。

${sections.join("\n")}

${algo}
`;

writeFileSync(join(root, "docs/puzzle-port-spec.md"), doc);
console.log("Wrote docs/puzzle-port-spec.md");
