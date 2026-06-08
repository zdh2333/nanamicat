// verify-puzzles.mjs — re-runs the same analysis I did by hand, but on the
// new puzzle-data.json. Use it after any data change to confirm we actually
// improved things instead of making them worse.
//
// Usage: node scripts/verify-puzzles.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, "..", "public", "puzzle-data.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

const bank = data.textGroupBank;
const manifest = data.textPuzzleManifest;
const bankById = Object.fromEntries(bank.map((g) => [g.id, g]));

let fail = 0;
function check(label, ok, detail = "") {
  const tag = ok ? "✅" : "❌";
  console.log(`  ${tag} ${label}${detail ? "  " + detail : ""}`);
  if (!ok) fail += 1;
}

console.log("=".repeat(60));
console.log("📊 verify-puzzles.mjs — 谜题数据体检");
console.log("=".repeat(60));
console.log(`组库: ${bank.length} 组 | 题目: ${manifest.length} 题`);
console.log();

// --- 1. 词条重复体检 (必须 0)
console.log("🐛 词条重复检查");
const inGroupDup = bank.filter((g) => new Set(g.words).size !== g.words.length);
check("组内 4 词无重复", inGroupDup.length === 0, inGroupDup.length ? `(违例 ${inGroupDup.length})` : "");

const wordToGroups = new Map();
bank.forEach((g) => g.words.forEach((w) => {
  if (!wordToGroups.has(w)) wordToGroups.set(w, []);
  wordToGroups.get(w).push(g.id);
}));
const crossDup = [...wordToGroups.entries()].filter(([, gs]) => gs.length > 1);
check("跨组无共享词", crossDup.length === 0, crossDup.length ? `(${crossDup.length} 个词撞组)` : "");

let perPuzzleDup = 0;
for (const entry of manifest) {
  const words = entry.groupIds.flatMap((gid) => bankById[gid]?.words || []);
  if (new Set(words).size !== words.length) perPuzzleDup += 1;
}
check("一题 16 词无重复", perPuzzleDup === 0, perPuzzleDup ? `(${perPuzzleDup} 题)` : "");
console.log();

// --- 2. 错乱组修复
console.log("🩹 错乱组修复检查");
const rootVeg = bankById["root-vegetables"];
check("根茎菜 全是根茎", rootVeg && ["萝卜", "土豆", "山药", "芋头"].every((w) => rootVeg.words.includes(w)),
  rootVeg ? `(现: ${rootVeg.words.join("/")})` : "(缺组)");

const tea = bankById["tea-types"];
check("茶类 全是真茶类", tea && tea.words.every((w) => ["绿茶", "红茶", "青茶", "黑茶", "黄茶", "白茶", "乌龙", "普洱"].includes(w)),
  tea ? `(现: ${tea.words.join("/")})` : "(缺组)");

const proxy = bankById["proxies"];
check("代理物 不含'缩影'", proxy && !proxy.words.includes("缩影"),
  proxy ? `(现: ${proxy.words.join("/")})` : "(缺组)");

const calibrate = bankById["calibrate-via-failure"];
check("用失败校准成功 不含'复盘'", calibrate && !calibrate.words.includes("复盘"),
  calibrate ? `(现: ${calibrate.words.join("/")})` : "(缺组)");
console.log();

// --- 3. 难度分布
console.log("📈 难度分布 (max-group-level 判定)");
const diffCount = {};
for (const entry of manifest) {
  const maxL = Math.max(...entry.groupIds.map((gid) => bankById[gid]?.level || 0));
  diffCount[maxL] = (diffCount[maxL] || 0) + 1;
}
for (const d of [1, 2, 3, 4]) {
  const c = diffCount[d] || 0;
  console.log(`  L${d}: ${c} (${(c / manifest.length * 100).toFixed(1)}%)`);
}
console.log();

// --- 4. 组使用频次均衡 (目标 8-15)
console.log("📊 组使用频次均衡");
const groupUse = {};
for (const entry of manifest) for (const gid of entry.groupIds) groupUse[gid] = (groupUse[gid] || 0) + 1;
const counts = Object.values(groupUse);
counts.sort((a, b) => a - b);
const median = counts[Math.floor(counts.length / 2)];
const avg = counts.reduce((s, c) => s + c, 0) / counts.length;
const max = counts[counts.length - 1];
const min = counts[0];
console.log(`  使用次数: min=${min} median=${median} avg=${avg.toFixed(1)} max=${max}`);
const overused = counts.filter((c) => c > 18).length;
const underused = counts.filter((c) => c < 8).length;
check("没有组用 > 18 次", overused === 0, overused ? `(违例 ${overused} 组)` : "");
check("没有组用 < 8 次", underused === 0, underused ? `(违例 ${underused} 组)` : "");
console.log();

// --- 5. 邻题不撞组 (核心体验)
console.log("🎯 邻题不撞组 (核心: 治'过了几关就重复')");
function countSharedGroups(a, b) {
  return a.groupIds.filter((g) => b.groupIds.includes(g)).length;
}
const window = 5; // 5 题窗口
let recentOverlaps = 0;
for (let i = 0; i < manifest.length; i++) {
  const recent = new Set();
  for (let j = Math.max(0, i - window); j < i; j++) {
    for (const g of manifest[j].groupIds) recent.add(g);
  }
  const shared = manifest[i].groupIds.filter((g) => recent.has(g)).length;
  if (shared >= 2) recentOverlaps += 1;  // 2+ 共享就算"撞组"
}
const overlapRate = recentOverlaps / manifest.length;
console.log(`  ${window} 题窗口内 ≥2 共享组的题数: ${recentOverlaps} / ${manifest.length} = ${(overlapRate*100).toFixed(1)}%`);
check(`5 题窗口撞组率 < 30% (旧: ~65%)`, overlapRate < 0.30);
console.log();

// --- 6. 60 题滑窗模拟
console.log("🧪 60 题滑窗体感");
let repeatInRecent = 0;
const recentBuffer = new Set();
for (let i = 0; i < Math.min(60, manifest.length); i++) {
  const shared = manifest[i].groupIds.filter((g) => recentBuffer.has(g)).length;
  if (shared >= 1) repeatInRecent += 1;
  for (const g of manifest[i].groupIds) recentBuffer.add(g);
  if (recentBuffer.size > 16) {
    // keep only last 3 puzzles' groups
    const keep = manifest.slice(Math.max(0, i - 2), i + 1).flatMap((e) => e.groupIds);
    recentBuffer.clear();
    keep.forEach((g) => recentBuffer.add(g));
  }
}
console.log(`  60 题内 '本组在前几题出现过' 的题数: ${repeatInRecent} (旧: 39)`);
check(`60 题体感撞组 < 20 (旧: 39)`, repeatInRecent < 20);
console.log();

// --- 7. 抽象组警告
console.log("🔮 抽象组警告 (词条全抽象的组)");
const abstractGroups = bank.filter((g) => g.level >= 3);
const allAbstract = abstractGroups.filter((g) => g.words.every((w) =>
  ["信任", "习惯", "默契", "惯例", "定义", "标签化", "归类", "下定论", "维护", "折旧", "延迟", "机会",
   "留白", "沉默", "空椅", "省略号", "口音", "握姿", "审美", "节奏感"].includes(w)
));
console.log(`  全抽象词组: ${allAbstract.length} (旧: 14, 目标: ≤4)`);
if (allAbstract.length) {
  allAbstract.forEach((g) => console.log(`     - [${g.id}] ${g.name}: ${g.words.join("/")}`));
}
check("全抽象词组 ≤ 4", allAbstract.length <= 4);
console.log();

console.log("=".repeat(60));
if (fail === 0) {
  console.log("🎉 全部检查通过");
} else {
  console.log(`❌ ${fail} 项未通过`);
  process.exit(1);
}
