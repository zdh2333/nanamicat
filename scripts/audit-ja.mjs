// audit-ja.mjs — Japanese habit auditor for public/puzzle-data-ja.json.
//
// Eight required checks (all must ✅):
//   1. Verb conjugation consistency (上一段/下一段/五段/カ変/サ変/plain)
//   2. No 简体/敬体 mix within a group
//   3. Loanwords should be written in 片仮名 (denylist of common katakana-only words)
//   4. Cultural fit to Japan (denylist of clearly Chinese/Korean/etc. words)
//   5. Word length — no > 12 片仮名 characters in a single word
//   6. Same category within group (script-style consistency)
//   7. No cross-group word duplicates
//   8. Per 100-puzzle block, all 4 difficulty levels present
//
// Usage: node scripts/audit-ja.mjs
//        exit 0 on all ✅, exit 1 on any ❌.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, "..", "public", "puzzle-data-ja.json");
const data = JSON.parse(readFileSync(dataPath, "utf8"));

const bank = data.textGroupBank ?? [];
const manifest = data.textPuzzleManifest ?? [];
const bankById = Object.fromEntries(bank.map((g) => [g.id, g]));

const results = []; // { name, ok, failures: [...] }
function check(name, fn) {
  const failures = [];
  try {
    fn(failures);
  } catch (err) {
    failures.push(`internal: ${err.message}`);
  }
  results.push({ name, ok: failures.length === 0, failures });
  process.stdout.write(`${failures.length === 0 ? "✅" : "❌"} ${name}\n`);
  for (const f of failures) process.stdout.write(`     - ${f}\n`);
}

// ---------------------------------------------------------------------------
//  Helpers — Japanese script & morphology
// ---------------------------------------------------------------------------
const HIRA = /[\u3040-\u309f]/;
const KATA = /[\u30a0-\u30ff\u31f0-\u31ff]/;
const KANJI = /[\u4e00-\u9fff]/;
const LONG_KATAKANA = /[ァ-ヿー]{13,}/;

const KEI_TAI_ENDINGS = /(?:ます|ません|ました|ませんでした|ましょう|まして)$/;
const DICTIONARY_VERB_HINT =
  /(?:る|す|く|ぐ|む|ぶ|ぬ|う|つ)$/;

// Common loanwords that should always be in katakana. If a bank word is the
// kanji/hanzi version, that's a flag.
const LOANWORD_DENYLIST = [
  // coffee
  { katakana: "コーヒー", bad: ["珈琲"] },
  // beer
  { katakana: "ビール", bad: ["麦酒"] },
  // wine
  { katakana: "ワイン", bad: ["葡萄酒"] },
  // bread
  { katakana: "パン", bad: ["麵包", "面包"] },
  // butter
  { katakana: "バター", bad: ["牛酪", "黄油"] },
  // cheese
  { katakana: "チーズ", bad: ["乾酪", "乳酪"] },
  // chocolate
  { katakana: "チョコレート", bad: ["巧克力", "巧克力糖"] },
  // cake
  { katakana: "ケーキ", bad: ["蛋糕"] },
  // cookie
  { katakana: "クッキー", bad: ["餅乾"] },
  // program
  { katakana: "プログラム", bad: ["程式", "程序"] },
  // computer
  { katakana: "コンピューター", bad: ["電算機", "計算機"] },
  // internet
  { katakana: "インターネット", bad: ["網際網路", "网际网络", "互聯網"] },
  // smartphone
  { katakana: "スマートフォン", bad: ["智慧型手機"] },
  // app
  { katakana: "アプリ", bad: ["應用程式", "应用程序"] },
  // mail
  { katakana: "メール", bad: ["電子郵件", "电子邮件"] },
  // SNS
  { katakana: "sns", bad: ["社交網絡", "社交网络"] },
  // blog
  { katakana: "ブログ", bad: ["部落格", "博客"] },
  // ice cream
  { katakana: "アイスクリーム", bad: ["冰淇淋"] },
  // hamburger
  { katakana: "ハンバーガー", bad: ["漢堡", "汉堡"] },
  // pizza
  { katakana: "ピザ", bad: ["披薩"] },
  // hot dog
  { katakana: "ホットドッグ", bad: ["熱狗", "热狗"] },
];

// Words that are clearly Chinese/Korean/etc. — must not appear in the JA bank.
const FOREIGN_DENYLIST = [
  // Chinese
  "电脑", "電腦", "软件", "軟件", "网络", "網路", "你好", "老师", "學生",
  "朋友", "飞机", "飛機", "出租車", "計程車", "短信", "手機",
  // Korean
  "김치", "치킨", "비빔밥", "라면",
  // generic pan-Asian that has a Japanese-specific form we should use
  "炒饭", "炒飯", "米饭", "米飯",
];

// ---------------------------------------------------------------------------
//  Check 1: Verb conjugation consistency
// ---------------------------------------------------------------------------
check("check-1 動詞変形合理性", (out) => {
  // A group is treated as "verb-like" if all 4 words end in a verb-y suffix.
  // For those, all 4 must share the same conjugation form.
  for (const g of bank) {
    const looksVerb = g.words.every((w) => DICTIONARY_VERB_HINT.test(w) || KATA.test(w) === false && /[るくすぐむぶぬうつ]$/.test(w));
    if (!looksVerb) continue;
    const forms = g.words.map((w) => classifyVerbForm(w));
    const distinct = new Set(forms);
    if (distinct.size > 1) {
      out.push(`group ${g.id} (${g.name}) mixes verb forms: ${[...distinct].join(" | ")} → ${JSON.stringify(g.words)}`);
    }
  }
});

function classifyVerbForm(w) {
  if (KEI_TAI_ENDINGS.test(w)) return "敬体(〜ます等)";
  if (/(?:ん|ない|なかった)$/.test(w)) return "否定形";
  if (/た$/.test(w)) return "タ形";
  if (/て$/.test(w) || /で$/.test(w)) return "テ形";
  if (/(?:ば|なら)$/.test(w)) return "仮定形";
  if (/(?:よう|ましょう|たい)$/.test(w)) return "意向形";
  if (/(?:られる|させる|られる)$/.test(w)) return "受身/使役";
  if (/(?:る|す|く|ぐ|む|ぶ|ぬ|う|つ)$/.test(w)) return "辞書形";
  return "その他";
}

// ---------------------------------------------------------------------------
//  Check 2: No 简体/敬体 mix within a group
// ---------------------------------------------------------------------------
check("check-2 简体敬体混在検出", (out) => {
  for (const g of bank) {
    const hasKeitai = g.words.some((w) => KEI_TAI_ENDINGS.test(w));
    const hasPlain = g.words.some(
      (w) => /(?:る|す|く|ぐ|む|ぶ|ぬ|う|つ)$/.test(w) && !KEI_TAI_ENDINGS.test(w),
    );
    if (hasKeitai && hasPlain) {
      out.push(`group ${g.id} (${g.name}) mixes 敬体 and 简体: ${JSON.stringify(g.words)}`);
    }
  }
});

// ---------------------------------------------------------------------------
//  Check 3: Loanwords should be in katakana
// ---------------------------------------------------------------------------
check("check-3 外来語は片仮名", (out) => {
  for (const g of bank) {
    for (const w of g.words) {
      for (const rule of LOANWORD_DENYLIST) {
        if (rule.bad.includes(w)) {
          out.push(`group ${g.id}: word "${w}" should be "${rule.katakana}"`);
        }
      }
    }
  }
});

// ---------------------------------------------------------------------------
//  Check 4: Cultural fit to Japan
// ---------------------------------------------------------------------------
check("check-4 文化貼合日本", (out) => {
  for (const g of bank) {
    for (const w of g.words) {
      if (FOREIGN_DENYLIST.includes(w)) {
        out.push(`group ${g.id}: foreign-sounding word "${w}" is not Japanese-specific`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
//  Check 5: Word length — no > 12 katakana chars
// ---------------------------------------------------------------------------
check("check-5 詞長 (片仮名 ≤ 12)", (out) => {
  for (const g of bank) {
    for (const w of g.words) {
      const m = w.match(LONG_KATAKANA);
      if (m) out.push(`group ${g.id}: word "${w}" has ${m[0].length} consecutive katakana chars`);
    }
  }
});

// ---------------------------------------------------------------------------
//  Check 6: Same category within group (script-style consistency)
// ---------------------------------------------------------------------------
check("check-6 同一范畴の語彙 (一組内)", (out) => {
  for (const g of bank) {
    const tags = g.words.map(scriptTag);
    // If the 4 words split across 3+ distinct script tags, the group is
    // likely mixing categories. Allowable:
    //   - 1 tag: pure (e.g., all 漢字 nouns)
    //   - 2 tags: typically a primary script + 1 verb/suffix word (e.g., verb
    //     group mixing 上一段/五段 stems, or "kanji noun + する verb" pair)
    const distinct = new Set(tags);
    if (distinct.size >= 3) {
      out.push(`group ${g.id} (${g.name}) has ${distinct.size} script styles: ${JSON.stringify(g.words)} → ${[...distinct].join(" | ")}`);
    }
  }
});

function scriptTag(w) {
  const hasKanji = KANJI.test(w);
  const hasKata = KATA.test(w);
  const hasHira = HIRA.test(w);
  if (hasKanji && !hasKata && !hasHira) return "漢字のみ";
  if (hasKata && !hasKanji && !hasHira) return "片仮名のみ";
  if (hasHira && !hasKanji && !hasKata) return "平仮名のみ";
  if (hasKanji && hasHira && !hasKata) return "漢字+平仮名";
  if (hasKanji && hasKata) return "漢字+片仮名";
  if (hasHira && hasKata) return "平仮名+片仮名";
  return "その他";
}

// ---------------------------------------------------------------------------
//  Check 7: No cross-group word duplicates
// ---------------------------------------------------------------------------
check("check-7 跨組無重複詞", (out) => {
  const seen = new Map();
  for (const g of bank) {
    for (const w of g.words) {
      if (seen.has(w)) {
        out.push(`word "${w}" appears in groups ${seen.get(w)} and ${g.id}`);
      } else {
        seen.set(w, g.id);
      }
    }
  }
});

// ---------------------------------------------------------------------------
//  Check 8: 100-puzzle difficulty distribution
// ---------------------------------------------------------------------------
check("check-8 100 題内難度分布", (out) => {
  for (let start = 0; start < manifest.length; start += 100) {
    const block = manifest.slice(start, start + 100);
    const seen = new Set(block.map((e) => e.difficulty));
    if (seen.size < 2) {
      out.push(`block ${start + 1}-${start + block.length}: only difficulty ${[...seen].join(",")} (expected mix)`);
    }
    // Also: should have at least 4 distinct levels across the whole 500
  }
  // Whole-manifest: every level should appear at least once
  const allDiff = new Set(manifest.map((e) => e.difficulty));
  for (const d of [1, 2, 3, 4]) {
    if (!allDiff.has(d)) out.push(`difficulty ${d} is missing from the entire manifest`);
  }
  // Per 100-block: each of L1..L4 should be present at least once
  for (let start = 0; start < manifest.length; start += 100) {
    const block = manifest.slice(start, start + 100);
    const diffs = new Set(block.map((e) => e.difficulty));
    for (const d of [1, 2, 3, 4]) {
      if (!diffs.has(d)) out.push(`block ${start + 1}-${start + block.length}: difficulty ${d} missing`);
    }
  }
});

// ---------------------------------------------------------------------------
//  Summary
// ---------------------------------------------------------------------------
const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log("");
console.log(`Summary: ${pass} ✅  ${fail} ❌  (${results.length} total)`);

if (fail > 0) {
  process.exit(1);
}
process.exit(0);
