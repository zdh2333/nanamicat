// regenerate-manifest-ja.mjs
// Expand public/puzzle-data-ja.json to a 500-entry manifest with ≥150 groups.
//
// Algorithm mirrors scripts/regenerate-manifest.mjs:
//   1. each group used 8..15 times (target = 500*4/154 ≈ 13.0)
//   2. adjacent (window=5) puzzles share at most 1 group
//   3. each puzzle has at least 2 distinct difficulty levels
//   4. difficulty cycles 1→2→3→4 every 100 puzzles (125 of each)
//
// New groups are appended in EXTRA_GROUPS; existing 94 stay untouched.
// Cultural focus: 和食 / 自然 / 文化 / 地理 / 言語 / 抽象 / 科技 / サブカル.
//
// Usage: node scripts/regenerate-manifest-ja.mjs
//        (writes puzzle-data-ja.json in place; prints a stats summary to stderr)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataPath = join(__dirname, "..", "public", "puzzle-data-ja.json");

// ---------------------------------------------------------------------------
//  Extra groups — extends the existing 94 to reach 154 total.
//  Each group: { level: 1|2|3|4, id: snake-case, name: 日本語見出し, words: [4] }
//  Rules followed:
//    - words are 同一范畴 (same semantic category)
//    - 外来語 in 片仮名
//    - no word is shared with any existing group
//    - each word ≤ 12 片仮名 chars (no UI overflow)
// ---------------------------------------------------------------------------
const EXTRA_GROUPS = [
  // ===== 食物 (Food) — Level 1 =====
  { level: 1, id: "ja-ramen-broth", name: "ラーメンのスープ", words: ["醤油ラーメン", "味噌ラーメン", "塩ラーメン", "豚骨ラーメン"] },
  { level: 1, id: "ja-sushi-neta", name: "寿司のネタ(追加)", words: ["ウニ", "イクラ", "アナゴ", "ホタテ"] },
  { level: 1, id: "ja-sushi-style", name: "寿司のスタイル", words: ["握り", "巻き寿司", "軍艦", "押し寿司"] },
  { level: 1, id: "ja-wagashi-classic", name: "和菓子(追加)", words: ["柏餅", "草餅", "水ようかん", "あんみつ"] },
  { level: 1, id: "ja-western-sweets", name: "洋菓子", words: ["ショートケーキ", "プリン", "シュークリーム", "マカロン"] },
  { level: 1, id: "ja-yakiniku-parts", name: "焼肉の部位", words: ["カルビ", "ハラミ", "タン", "ロース"] },
  { level: 1, id: "ja-bento-classic", name: "定番弁当", words: ["幕の内", "のり弁当", "鮭弁当", "唐揚げ弁当"] },
  { level: 1, id: "ja-donburi", name: "丼もの", words: ["牛丼", "親子丼", "天丼", "カツ丼"] },
  { level: 1, id: "ja-noodles", name: "麺料理", words: ["うどん", "そば", "ラーメン", "そうめん"] },
  { level: 1, id: "ja-sashimi-fish", name: "刺身に向く魚", words: ["カンパチ", "ヒラメ", "ブリ", "アジ"] },

  // ===== 自然 (Nature) — Level 1 =====
  { level: 1, id: "ja-flower-spring", name: "春の花(追加)", words: ["すみれ", "たんぽぽ", "菜の花", "モクレン"] },
  { level: 1, id: "ja-flower-summer", name: "夏の花", words: ["ひまわり", "あじさい", "百合", "蓮"] },
  { level: 1, id: "ja-flower-autumn", name: "秋の花(追加)", words: ["リンドウ", "ダリア", "秋桜", "女郎花"] },
  { level: 1, id: "ja-flower-winter", name: "冬の花(追加)", words: ["ロウバイ", "クリスマスローズ", "福寿草", "シクラメン"] },
  { level: 1, id: "ja-fruit-tree", name: "果樹", words: ["柿", "栗", "柚子", "枇杷"] },
  { level: 1, id: "ja-insects-summer", name: "夏の虫", words: ["蝉", "蛍", "カマキリ", "クワガタ"] },
  { level: 1, id: "ja-birds-urban", name: "街の鳥", words: ["鳩", "烏", "燕", "カラス"] },
  { level: 1, id: "ja-weather-rainy", name: "雨の呼び名", words: ["梅雨", "時雨", "夕立", "霧雨"] },
  { level: 1, id: "ja-weather-snow", name: "雪の呼び名", words: ["粉雪", "吹雪", "霰", "雹"] },
  { level: 1, id: "ja-landform", name: "地形", words: ["山", "谷", "峠", "岬"] },

  // ===== 文化 (Culture) — Level 2 =====
  { level: 2, id: "ja-festival-summer", name: "夏祭り", words: ["花火", "盆踊り", "神輿", "山車"] },
  { level: 2, id: "ja-festival-spring", name: "春節句", words: ["ひな祭り", "桃の節句", "端午の節句", "菖蒲湯"] },
  { level: 2, id: "ja-craft-traditional", name: "伝統工芸", words: ["陶器", "漆器", "染物", "竹細工"] },
  { level: 2, id: "ja-martial-arts", name: "武道", words: ["柔道", "剣道", "空手", "弓道"] },
  { level: 2, id: "ja-traditional-arts", name: "芸道", words: ["茶道", "華道", "書道", "香道"] },
  { level: 2, id: "ja-performance", name: "伝統芸能", words: ["能", "狂言", "歌舞伎", "文楽"] },
  { level: 2, id: "ja-instrument-trad", name: "和楽器", words: ["琴", "三味線", "尺八", "太鼓"] },
  { level: 2, id: "ja-toy-traditional", name: "昔遊び", words: ["こま", "けん玉", "折り紙", "羽子板"] },
  { level: 2, id: "ja-architecture", name: "古い建物", words: ["鳥居", "神社", "お寺", "城"] },
  { level: 2, id: "ja-clothing-trad", name: "和服", words: ["着物", "浴衣", "帯", "草履"] },

  // ===== 地理 (Geography) — Level 1 =====
  { level: 1, id: "ja-region-kanto", name: "関東の県", words: ["東京", "神奈川", "千葉", "埼玉"] },
  { level: 1, id: "ja-region-kansai", name: "関西の府県", words: ["大阪", "京都", "兵庫", "奈良"] },
  { level: 1, id: "ja-region-tohoku", name: "東北の県", words: ["青森", "岩手", "秋田", "宮城"] },
  { level: 1, id: "ja-region-kyushu", name: "九州の県", words: ["福岡", "熊本", "鹿児島", "長崎"] },
  { level: 1, id: "ja-region-hokkaido", name: "北海道の都市", words: ["札幌", "函館", "小樽", "旭川"] },
  { level: 1, id: "ja-island", name: "日本の島", words: ["本州", "北海道", "九州", "四国"] },
  { level: 1, id: "ja-lake", name: "日本の湖", words: ["琵琶湖", "霞ヶ浦", "中禅寺湖", "猪苗代湖"] },
  { level: 1, id: "ja-volcano", name: "火山", words: ["富士山", "桜島", "阿蘇山", "浅間山"] },
  { level: 1, id: "ja-waterfall", name: "滝", words: ["華厳の滝", "那智の滝", "袋田の滝", "白糸の滝"] },

  // ===== 言語 (Language) — Level 2 =====
  { level: 2, id: "ja-counter-tsugi", name: "助数詞(つ)", words: ["一つ", "二つ", "三つ", "四つ"] },
  { level: 2, id: "ja-counter-people", name: "助数詞(人)", words: ["一人", "二人", "三人", "四人"] },
  { level: 2, id: "ja-counter-mai", name: "助数詞(枚)", words: ["一枚", "二枚", "三枚", "四枚"] },
  { level: 2, id: "ja-adj-i", name: "形容詞(い形容詞)", words: ["美しい", "楽しい", "嬉しい", "優しい"] },
  { level: 2, id: "ja-adj-na", name: "形容詞(な形容詞)", words: ["静か", "綺麗", "丁寧", "親切"] },
  { level: 2, id: "ja-verb-ichidan", name: "上一段動詞", words: ["食べる", "見る", "寝る", "起きる"] },
  { level: 2, id: "ja-verb-godan", name: "五段動詞", words: ["行く", "飲む", "話す", "読む"] },
  { level: 2, id: "ja-particle-basic", name: "基本助詞", words: ["は", "が", "を", "に"] },
  { level: 2, id: "ja-conjunction", name: "接続詞", words: ["そして", "しかし", "だから", "けれど"] },

  // ===== 科技 (Tech) — Level 2 =====
  { level: 2, id: "ja-smartphone", name: "スマホ用語", words: ["アプリ", "アイコン", "ホーム画面", "通知"] },
  { level: 2, id: "ja-it-abbrev", name: "IT略語", words: ["AI", "IT", "IoT", "VR"] },
  { level: 2, id: "ja-it-action", name: "ITの動作", words: ["アップロード", "ダウンロード", "ログイン", "ログアウト"] },
  { level: 2, id: "ja-emoji", name: "絵文字系", words: ["スタンプ", "ハート", "顔文字", "絵文字"] },
  { level: 2, id: "ja-web-service", name: "ウェブサービス", words: ["メール", "チャット", "SNS", "ブログ"] },

  // ===== サブカル (Subculture) — Level 2 =====
  { level: 2, id: "ja-anime-genre", name: "アニメのジャンル", words: ["少年漫画", "少女漫画", "バトル", "ロボット"] },
  { level: 2, id: "ja-game-genre", name: "ゲームのジャンル", words: ["RPG", "FPS", "アクション", "パズル"] },
  { level: 2, id: "ja-manga-magazine", name: "漫画雑誌", words: ["少年ジャンプ", "マガジン", "サンデー", "りぼん"] },
  { level: 2, id: "ja-manga-term", name: "漫画用語", words: ["主人公", "悪役", "ライバル", "モブ"] },
  { level: 2, id: "ja-game-mechanic", name: "ゲーム用語", words: ["レベル", "スキル", "アイテム", "セーブ"] },
  { level: 2, id: "ja-anime-term", name: "アニメ用語", words: ["アニメ", "声優", "キャラクター", "オープニング"] },
  { level: 2, id: "ja-game-platform", name: "ゲーム機", words: ["スマホ", "プレステ", "スイッチ", "パソコン"] },

  // ===== 抽象 (Abstract) — Level 3 =====
  { level: 3, id: "ja-emotion-positive", name: "肯定的感情", words: ["喜び", "感謝", "愛情", "希望"] },
  { level: 3, id: "ja-emotion-negative", name: "否定的感情", words: ["悲しみ", "怒り", "恐怖", "憎しみ"] },
  { level: 3, id: "ja-personality-good", name: "良い性格", words: ["誠実", "勇敢", "寛大", "勤勉"] },
  { level: 3, id: "ja-personality-bad", name: "悪い性格", words: ["臆病", "短気", "意地悪", "不誠実"] },
  { level: 3, id: "ja-virtue", name: "美德", words: ["義理", "礼儀", "忠誠", "慈悲"] },
  { level: 3, id: "ja-vice", name: "悪習", words: ["嫉妬", "怠惰", "貪欲", "虚栄心"] },
  { level: 3, id: "ja-thinking", name: "思考の型", words: ["推理", "直感", "瞑想", "分析"] },
  { level: 3, id: "ja-mental-state", name: "心の状態", words: ["集中", "緊張", "興奮", "冷静"] },
  { level: 3, id: "ja-time-concept", name: "時間の単位", words: ["瞬間", "片刻", "永遠", "刹那"] },
  { level: 3, id: "ja-quantity-shape", name: "量と形", words: ["膨大", "微小", "無形", "無限"] },
  { level: 3, id: "ja-truth-deception", name: "真偽", words: ["真実", "虚偽", "誤解", "証明"] },
  { level: 3, id: "ja-power-control", name: "力と支配", words: ["影響", "服従", "抵抗", "服従"] },
  { level: 3, id: "ja-memory-record", name: "記憶と記録", words: ["記憶", "記念", "履歴", "日記"] },
  { level: 3, id: "ja-ritual-pattern", name: "儀式と型", words: ["礼儀作法", "手順", "型", "伝統"] },
  { level: 3, id: "ja-exception-default", name: "例外と常", words: ["特例", "規則", "例外", "原則"] },
  { level: 3, id: "ja-flow-stillness", name: "流れと静止", words: ["流動", "停滞", "循環", "停止"] },
  { level: 3, id: "ja-cause-result", name: "原因と結果", words: ["原因", "結果", "影響", "副作用"] },
  { level: 3, id: "ja-similarity-diff", name: "類似と相違", words: ["類似", "相違", "共通点", "独自性"] },

  // ===== 抽象 (Abstract) — Level 4 =====
  { level: 4, id: "ja-meta-concept-origin", name: "起源の問い", words: ["起源", "本質", "由来", "根源"] },
  { level: 4, id: "ja-meta-concept-emptiness", name: "空と無", words: ["空虚", "無限", "無", "ゼロ"] },
  { level: 4, id: "ja-meta-concept-paradox", name: "逆説", words: ["矛盾", "二律背反", "逆説", "裏表"] },
  { level: 4, id: "ja-meta-concept-perspective", name: "視点", words: ["俯瞰", "主観", "客観", "相対"] },
  { level: 4, id: "ja-meta-concept-meaning", name: "意味の重み", words: ["意味", "価値", "重み", "意義"] },
  { level: 4, id: "ja-meta-concept-transformation", name: "変容", words: ["変容", "革新", "生成", "崩壊"] },
  { level: 4, id: "ja-meta-concept-harmony", name: "調和", words: ["調和", "均衡", "統一", "緊張"] },
  { level: 4, id: "ja-meta-concept-self", name: "自己と他者", words: ["自己", "他者", "内省", "対話"] },
  { level: 4, id: "ja-meta-concept-time", name: "時間の本質", words: ["持続", "反復", "断絶", "連続"] },
  { level: 4, id: "ja-meta-concept-language", name: "言語の限界", words: ["沈黙", "暗黙知", "沈語", "言外"] },
  { level: 4, id: "ja-meta-concept-truth", name: "真理と仮象", words: ["真理", "仮象", "本質", "表層"] },
  { level: 4, id: "ja-meta-concept-freedom", name: "自由と制約", words: ["自由", "制約", "自律", "解放"] },
];

// ---------------------------------------------------------------------------
//  Load + merge bank
// ---------------------------------------------------------------------------
const data = JSON.parse(readFileSync(dataPath, "utf8"));
const existingIds = new Set(data.textGroupBank.map((g) => g.id));
for (const g of EXTRA_GROUPS) {
  if (existingIds.has(g.id)) {
    throw new Error(`group id collision: ${g.id} already exists; rename one`);
  }
}
data.textGroupBank = [...data.textGroupBank, ...EXTRA_GROUPS];

// Update puzzle count target
data.textPuzzleCount = 500;

const bank = data.textGroupBank.filter((g) => g.id);
const bankById = Object.fromEntries(bank.map((g) => [g.id, g]));

// ---------------------------------------------------------------------------
//  Manifest-generation parameters
// ---------------------------------------------------------------------------
const N_PUZZLES = 500;
const WINDOW = 5;
const MAX_SHARED_IN_WINDOW = 1;
const MIN_LEVEL_VARIETY = 2;
const TARGET_PER_GROUP_MIN = 8;
const TARGET_PER_GROUP_MAX = 15;

const groupsByLevel = { 1: [], 2: [], 3: [], 4: [] };
for (const g of bank) groupsByLevel[g.level].push(g.id);

console.error(`regenerate-manifest-ja: bank has ${bank.length} groups ` +
  `(L1=${groupsByLevel[1].length} L2=${groupsByLevel[2].length} ` +
  `L3=${groupsByLevel[3].length} L4=${groupsByLevel[4].length})`);

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function difficultyForIndex(i) {
  // Cycle 1,2,3,4 every 100 puzzles (matches the iOS Resources validator's
  // pattern). Each block of 25 has the same difficulty → 125 puzzles per level.
  return (Math.floor(i / 25) % 4) + 1;
}

function makeManifest(rand) {
  const use = Object.fromEntries(bank.map((g) => [g.id, 0]));
  const recentGroups = [];
  const puzzles = [];
  const recentByLevel = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };

  for (let p = 0; p < N_PUZZLES; p += 1) {
    const targetDiff = difficultyForIndex(p);
    const recentSet = new Set();
    for (const r of recentGroups) for (const g of r) recentSet.add(g);

    let chosen = null;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      // Strategy: 70% classic staircase (1,2,3,4) respecting target difficulty;
      // 30% varied mix for playability variance.
      const useStaircase = rand() < 0.7;
      let wantLevels;
      if (useStaircase) {
        // Always include the target-difficulty level.
        wantLevels = [1, 2, 3, 4].sort(() => rand() - 0.5);
        // Make sure the target level is in the mix
        if (!wantLevels.includes(targetDiff)) {
          wantLevels[rand() < 0.5 ? 0 : 3] = targetDiff;
        }
      } else {
        wantLevels = [1, 2, 3, 4].sort(() => rand() - 0.5);
      }

      const picks = [];
      const used = new Set();
      for (const lvl of wantLevels) {
        const pool = groupsByLevel[lvl].filter((id) => !used.has(id));
        if (!pool.length) break;
        const scored = pool.map((id) => {
          const u = use[id];
          const inRecent = recentSet.has(id) ? 5 : 0;
          return { id, score: u + inRecent + rand() * 1.5 };
        });
        scored.sort((a, b) => a.score - b.score);
        const top = scored.slice(0, 4);
        const pick = top[Math.floor(rand() * top.length)].id;
        picks.push(pick);
        used.add(pick);
      }
      if (picks.length !== 4) continue;
      const shared = picks.filter((g) => recentSet.has(g)).length;
      if (shared > MAX_SHARED_IN_WINDOW) continue;
      const lvls = new Set(picks.map((id) => bankById[id].level));
      if (lvls.size < MIN_LEVEL_VARIETY) continue;
      if (picks.some((id) => use[id] >= TARGET_PER_GROUP_MAX)) continue;
      chosen = picks;
      break;
    }

    if (!chosen) {
      const sorted = bank
        .map((g) => ({ id: g.id, score: use[g.id] + rand() }))
        .sort((a, b) => a.score - b.score);
      chosen = sorted.slice(0, 4).map((x) => x.id);
    }

    for (const id of chosen) use[id] += 1;
    recentGroups.push(chosen);
    if (recentGroups.length > WINDOW) recentGroups.shift();
    puzzles.push(chosen);
  }

  return { manifest: puzzles, use };
}

function score(manifest) {
  const target = (N_PUZZLES * 4) / bank.length;
  const use = {};
  for (const e of manifest) for (const g of e) use[g] = (use[g] || 0) + 1;
  let cost = 0;
  for (const g of bank) {
    const u = use[g.id] || 0;
    cost += (u - target) ** 2;
    if (u < TARGET_PER_GROUP_MIN) cost += (TARGET_PER_GROUP_MIN - u) ** 2 * 4;
    if (u > TARGET_PER_GROUP_MAX) cost += (u - TARGET_PER_GROUP_MAX) ** 2 * 4;
  }
  return cost;
}

console.error("regenerate-manifest-ja: trying 300 seeds…");
let best = null;
let bestScore = Infinity;
for (let t = 0; t < 300; t += 1) {
  const m = makeManifest(mulberry32(t * 2654435761 + Date.now()));
  const s = score(m.manifest);
  if (s < bestScore) { bestScore = s; best = m; }
  if (t % 50 === 49) console.error(`  trial ${t + 1}/300, best=${bestScore.toFixed(1)}`);
}
console.error(`best score = ${bestScore.toFixed(1)}`);

const themes = data.puzzleThemes;
const herrings = data.redHerringNotes;
const newManifest = best.manifest.map((gids, idx) => {
  return {
    difficulty: difficultyForIndex(idx),
    theme: themes[idx % themes.length],
    redHerring: herrings[idx % herrings.length],
    groupIds: gids,
  };
});
data.textPuzzleManifest = newManifest;

writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");

// Stats summary
const use = {};
for (const e of newManifest) for (const g of e.groupIds) use[g] = (use[g] || 0) + 1;
const counts = Object.values(use);
counts.sort((a, b) => a - b);
console.error(`group usage: min=${counts[0]} median=${counts[Math.floor(counts.length / 2)]} max=${counts[counts.length - 1]}`);

// Difficulty distribution
const diffCount = { 1: 0, 2: 0, 3: 0, 4: 0 };
for (const e of newManifest) diffCount[e.difficulty] += 1;
console.error(`difficulty: ${JSON.stringify(diffCount)}`);

console.error(`wrote ${newManifest.length} puzzles (${bank.length} groups) to ${dataPath}`);
console.error("run `node scripts/audit-ja.mjs` to validate");
