import React, { useEffect, useLayoutEffect, useMemo, useState, useRef, lazy, Suspense, Component } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  Dices,
  Globe2,
  HelpCircle,
  Palette,
  PenLine,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  X
} from "lucide-react";
import "./styles.css";
import StickyAdBar from "./StickyAdBar.jsx";
import {
  buildTextPuzzles,
  getTodayIndex,
  getTodayIndexBalanced,
  pickBalancedNext,
  loadPuzzleCatalog,
  mostAbstractGroup
} from "./puzzleEngine.js";
import {
  getStreak,
  getRecentCompletions,
  getProgress,
  getTodayIsoDate,
  puzzleIndexForDate,
  recordCompletion,
  readResume,
  writeResume,
  clearResume,
  shouldResume
} from "./progress.js";
import {
  trackPageView,
  trackGameStart,
  trackGameComplete,
  trackGameFail,
  trackShareClick
} from "./analytics.js";
import AdSlot from "./AdSlot.jsx";

// Archive is rarely used on first visit; lazy-load it so the home board
// bundles less code. A small skeleton keeps the layout stable.
const Archive = lazy(() => import("./Archive.jsx"));

function ArchiveFallback() {
  return (
    <section className="panel" aria-busy="true">
      <p style={{ textAlign: "center", color: "var(--muted)" }}>Loading archive…</p>
    </section>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <main className="page page-loading" role="alert" style={{ textAlign: "center", padding: "40px 24px" }}>
          <p style={{ fontSize: "1.1rem", marginBottom: "16px" }}>
            Something went wrong loading the puzzle. Please refresh to try again.
          </p>
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_MAX_MISTAKES = 4;

const hintEconomy = {
  initialBalance: 3,
  clearsPerReward: 3
};

const playedPuzzleStorageKey = "nanamicat.playedPuzzleIds";

function getStored(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Local storage is optional for gameplay.
  }
}

function readStoredInt(key, fallback) {
  const raw = getStored(key, String(fallback));
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readPlayedPuzzleIds(pool) {
  try {
    const raw = getStored(playedPuzzleStorageKey, "[]");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(pool.map((item) => item.id));
    return parsed.filter((id) => typeof id === "string" && valid.has(id));
  } catch {
    return [];
  }
}

function writePlayedPuzzleIds(ids) {
  setStored(playedPuzzleStorageKey, JSON.stringify(ids));
}

function pickNextPuzzleIndex(pool, playedIds, preferredStart = 0, predicate = () => true) {
  const candidates = pool
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => predicate(item));
  if (!candidates.length) return 0;

  const played = new Set(playedIds);
  const unplayed = candidates.filter(({ item }) => !played.has(item.id));
  const source = unplayed.length ? unplayed : candidates;
  const sortedIndexes = source.map(({ index }) => index).sort((a, b) => a - b);
  const hit = sortedIndexes.find((index) => index >= preferredStart);
  return hit ?? sortedIndexes[0];
}

const difficultyMeta = {
  1: { zh: "直观分类", en: "Direct sets", ja: "わかりやすい分類", className: "level-yellow" },
  2: { zh: "常识联想", en: "Familiar links", ja: "なじみのある連想", className: "level-green" },
  3: { zh: "跨域关系", en: "Cross-domain", ja: "分野をまたぐ関係", className: "level-blue" },
  4: { zh: "细节线索", en: "Detail clues", ja: "細かいヒント", className: "level-purple" }
};

function difficultyLabel(level, locale) {
  return difficultyMeta[level]?.[locale] ?? difficultyMeta[1][locale];
}

function NanamiCatMascot({ size = "header", showCelebration = false, className = "", altText = "喵格谜" }) {
  const dimensions = {
    mini: 28,
    header: 28,
    gameHeader: 52,
    empty: 72,
    celebration: 120
  };
  const dim = dimensions[size] || 28;
  const cardSize = size === "gameHeader" ? 64 : null;

  let src = "/nanamicat_mascot_standard.webp?v=2";
  if (size === "empty") {
    src = "/nanamicat_mascot_empty.webp?v=2";
  } else if (size === "celebration" || showCelebration) {
    src = "/nanamicat_mascot_celebration.webp?v=2";
  }

  if (cardSize) {
    return (
      <div className={`mascot-card${className ? ` ${className}` : ""}`}>
        <img src={src} alt={altText} className="mascot-card-img" width="76" height="76" decoding="async" fetchPriority="high" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={altText}
      width={dim}
      height={dim}
      className={className}
      decoding="async"
      loading={size === "celebration" || size === "empty" ? "lazy" : "eager"}
      style={{ display: "block", objectFit: "contain", width: `${dim}px`, height: `${dim}px` }}
    />
  );
}

const themes = [
  { id: "default", zh: "默认", en: "Default", ja: "デフォルト" },
  { id: "mist", zh: "雾灰", en: "Mist", ja: "ミスト" },
  { id: "sage", zh: "鼠尾草", en: "Sage", ja: "セージ" },
  { id: "clay", zh: "陶土", en: "Clay", ja: "クレイ" }
];

const copy = {
  zh: {
    appName: "喵格谜",
    kicker: "每日分类谜题",
    language: "English / 日本語",
    help: "玩法说明",
    rulesBody: "16 个词里找出 4 组，每组 4 个。\n点选 4 个后提交，最多失误 4 次。",
    rulesExampleTitle: "例子",
    rulesExampleName: "早餐主食",
    rulesExampleWords: "油条 · 包子 · 豆浆 · 烧饼",
    rulesExampleNote: "↑ 这 4 个属于同一组",
    rulesClose: "知道了",
    theme: "主题",
    mistakes: "失误",
    shuffle: "打乱",
    clear: "取消",
    hint: "提示",
    submit: "提交",
    next: "换一题",
    nextAfterComplete: "下一题",
    share: "分享结果",
    leaderboard: "排行榜",
    contribute: "贡献谜题",
    admin: "后台",
    playerName: "昵称",
    saveName: "保存昵称",
    scoreText: "文字通关",
    totalScore: "总分",
    recent: "最近时间",
    submitPuzzle: "提交谜题",
    puzzleTitle: "谜题标题",
    contactEmail: "联系邮箱（可选）",
    groupName: "组名",
    words: "4 个词，用逗号分隔",
    savePuzzle: "提交到后台",
    addGroup: "添加一组",
    removeGroup: "删除本组",
    adminPuzzles: "投稿",
    adminScores: "成绩事件",
    adminGroupCount: "%d 组",
    adminGroupWords: "词条",
    adminEnglishName: "英文组名",
    adminEnglishWords: "英文词条",
    sponsorLabel: "赞助本题",
    sponsorTitle: "喜欢这个小游戏，可以请我喝杯咖啡。",
    sponsorBody: "微信扫码赞助，支持继续做中文题库、历史题和主题包。",
    zoomPay: "点击放大",
    payCaption: "微信支付",
    intro: "找出四组隐藏关联，每组四个项目。",
    chooseFour: "请先选择 4 个项目再提交。",
    clearedSelection: "已取消当前选择。",
    wrong: "这四个项目不在同一组，再试一次。",
    out: "失误次数已用完，继续尝试完成本题。",
    complete: "四组全部找到了。",
    savedScore: "成绩已写入排行榜。",
    needsName: "设置昵称后，通关会累计到排行榜。",
    abstract: "本题最抽象的一组",
    hintsEmpty: "提示次数已用完。每通关三题可获得 1 次提示。",
    hintsEarned: "通关三题，获得 1 次提示。",
    contributionLead: "最少 1 组、最多 10 组，每组须有组名和 4 个词。投稿进入待审核。",
    leaderboardLead: "保存昵称即可上榜，尚未通关也会显示为 0 次。",
    adminLead: "后台由 Cloudflare Access 保护，只给开发者查看。",
    emptyLeaderboard: "还没有玩家上榜，保存昵称成为第一个。",
    joinedLeaderboard: "已加入排行榜，通关 %d 次。",
    emptySubmissions: "还没有投稿。",
    statusPending: "待审核",
    statusReviewed: "已查看",
    statusIncluded: "已编入",
    statusRejected: "已拒绝",
    submissionSavedPending: "投稿已保存为待审核。",
    thankYouEmailSent: "投稿成功，感谢邮件已发送。",
    thankYouEmailNotSent: "投稿成功，但感谢邮件暂未发送（稍后可重试）。"
  },
  en: {
    appName: "MeowGrid",
    kicker: "Daily category puzzle",
    language: "中文 / 日本語",
    help: "Rules",
    rulesBody: "Find 4 groups of 4 from 16 words.\nSelect 4, then submit. Four mistakes allowed.",
    rulesExampleTitle: "Example",
    rulesExampleName: "Breakfast staples",
    rulesExampleWords: "Youtiao · Bun · Soy milk · Shaobing",
    rulesExampleNote: "↑ these four belong together",
    rulesClose: "Got it",
    theme: "Theme",
    mistakes: "Mistakes",
    shuffle: "Shuffle",
    clear: "Clear",
    hint: "Hint",
    submit: "Submit",
    next: "Next puzzle",
    nextAfterComplete: "Next puzzle",
    share: "Share",
    leaderboard: "Leaderboard",
    contribute: "Contribute",
    admin: "Admin",
    playerName: "Nickname",
    saveName: "Save name",
    scoreText: "Text clears",
    totalScore: "Score",
    recent: "Recent",
    submitPuzzle: "Submit puzzle",
    puzzleTitle: "Puzzle title",
    contactEmail: "Contact email (optional)",
    groupName: "Group name",
    words: "4 words, comma separated",
    savePuzzle: "Send to admin",
    addGroup: "Add group",
    removeGroup: "Remove group",
    adminPuzzles: "Submissions",
    adminScores: "Score events",
    adminGroupCount: "%d groups",
    adminGroupWords: "Words",
    adminEnglishName: "English group name",
    adminEnglishWords: "English words",
    sponsorLabel: "Support this puzzle",
    sponsorTitle: "If you like this small game, you can buy me a coffee.",
    sponsorBody: "Use WeChat Pay to support more Chinese puzzles, archives, and theme packs.",
    zoomPay: "Zoom",
    payCaption: "WeChat Pay",
    intro: "Find four hidden groups, four items per group.",
    chooseFour: "Choose 4 items before submitting.",
    clearedSelection: "Selection cleared.",
    wrong: "Those four items do not belong together.",
    out: "Mistakes are gone. You can still finish the puzzle.",
    complete: "All four groups found.",
    savedScore: "Score saved to the leaderboard.",
    needsName: "Set a nickname to track clears on the leaderboard.",
    abstract: "Most abstract group",
    hintsEmpty: "No hints left. Clear three puzzles to earn one more.",
    hintsEarned: "Cleared three puzzles — +1 hint.",
    contributionLead: "Submit 1–10 groups. Each needs a name and exactly four words. Review starts as pending.",
    leaderboardLead: "Save a nickname to join — you'll show 0 clears until you finish a puzzle.",
    adminLead: "Admin is protected by Cloudflare Access and is only visible to developers.",
    emptyLeaderboard: "No players yet. Save a nickname to be the first.",
    joinedLeaderboard: "Joined the leaderboard with %d clear(s).",
    emptySubmissions: "No submissions yet.",
    statusPending: "Pending",
    statusReviewed: "Reviewed",
    statusIncluded: "Included",
    statusRejected: "Rejected",
    submissionSavedPending: "Submission saved as pending.",
    thankYouEmailSent: "Submission saved and thank-you email sent.",
    thankYouEmailNotSent: "Submission saved, but thank-you email was not sent yet."
  },
  // Japanese UI copy. The puzzle DATA itself (group names, words) lives in
  // public/puzzle-data-ja.json — a separate file with Japanese-native
  // word choices. The text below is just chrome (buttons, hints, errors).
  // Translation choices favor plainspoken daily-life Japanese over
  // 直訳的 wording that would feel stiff on a casual puzzle site.
  ja: {
    appName: "ナナミキャット",
    kicker: "毎日のことばパズル",
    language: "中文 / English",
    help: "遊び方",
    rulesBody: "16個のことばから4つのグループ(各4語)を見つけよう。\n4つ選んで送信。まちがいは4回まで。",
    rulesExampleTitle: "例",
    rulesExampleName: "和食の朝食",
    rulesExampleWords: "味噌汁 · 焼き魚 · ご飯 · 納豆",
    rulesExampleNote: "↑ この4つは同じグループ",
    rulesClose: "わかった",
    theme: "テーマ",
    mistakes: "ミス",
    shuffle: "シャッフル",
    clear: "クリア",
    hint: "ヒント",
    submit: "送信",
    next: "次の問題",
    nextAfterComplete: "次の問題へ",
    share: "結果をシェア",
    leaderboard: "ランキング",
    contribute: "問題を投稿",
    admin: "管理",
    playerName: "ニックネーム",
    saveName: "名前を保存",
    scoreText: "クリア数",
    totalScore: "スコア",
    recent: "更新時刻",
    submitPuzzle: "問題を投稿",
    puzzleTitle: "問題のタイトル",
    contactEmail: "連絡先メール(任意)",
    groupName: "グループ名",
    words: "4つのことば、カンマ区切り",
    savePuzzle: "管理者に送信",
    addGroup: "グループを追加",
    removeGroup: "このグループを削除",
    adminPuzzles: "投稿一覧",
    adminScores: "スコア履歴",
    adminGroupCount: "%d グループ",
    adminGroupWords: "ことば",
    adminEnglishName: "英訳グループ名",
    adminEnglishWords: "英訳ことば",
    sponsorLabel: "この問題を応援",
    sponsorTitle: "このゲームが気に入ったら、ご支援いただけると嬉しいです。",
    sponsorBody: "WeChat Payで応援していただけると、日本語パズルの追加開発を続けられます。",
    zoomPay: "拡大",
    payCaption: "WeChat Pay",
    intro: "4つの隠れたグループを4つずつ見つけよう。",
    chooseFour: "4つ選んでから送信してください。",
    clearedSelection: "選択を解除しました。",
    wrong: "この4つは同じグループではありません。",
    out: "ミスを使い切りました。あきらめずに続けてね。",
    complete: "4つのグループをすべて発見!",
    savedScore: "スコアをランキングに保存しました。",
    needsName: "ニックネームを設定するとクリア数が記録されます。",
    abstract: "もっとも抽象的なグループ",
    hintsEmpty: "ヒントを使い切りました。3問クリアで1回補充されます。",
    hintsEarned: "3問クリアで +1 ヒント獲得!",
    contributionLead: "1〜10グループ。各グループに名前と4つのことばが必要。投稿はレビュー待ちです。",
    leaderboardLead: "ニックネームを保存すると参加できます。クリア前でも0回で表示されます。",
    adminLead: "管理画面はCloudflare Accessで保護されています。",
    emptyLeaderboard: "まだランキングに誰もいません。最初の参加者になろう!",
    joinedLeaderboard: "%d クリアでランキングに参加しました。",
    emptySubmissions: "まだ投稿がありません。",
    statusPending: "審査待ち",
    statusReviewed: "確認済み",
    statusIncluded: "採用",
    statusRejected: "却下",
    submissionSavedPending: "投稿を保存しました(審査待ち)。",
    thankYouEmailSent: "投稿を保存し、お礼メールを送信しました。",
    thankYouEmailNotSent: "投稿は保存しましたが、お礼メールはまだ送信されていません。"
  }
};

// ──────────────────────────────────────────────────────────────────────────
//  Per-locale SEO metadata. Used by the <head> meta injection effect and the
//  /today landing view. Long-tail keyword targets (en/zh/ja) are tuned to
//  match what users actually search for: "today's puzzle", "free word
//  puzzle", "no signup word game", "ことばパズル", "文字分类游戏",
//  "Wordle alternative", "NYT Connections alternative".
// ──────────────────────────────────────────────────────────────────────────
const SEO_BY_LOCALE = {
  en: {
    ogLocale: "en_US",
    hreflang: "en",
    appName: "Nanami Cat",
    siteUrl: "https://nanamicat.com",
    home: {
      title: "Nanami Cat - Today's Daily Word Categories Puzzle",
      description: "Play today's free daily word category puzzle. Sort sixteen words into four hidden groups. A free Wordle alternative inspired by NYT Connections. No sign-up required."
    },
    today: {
      title: "Today's Word Puzzle - Free Daily Category Game | Nanami Cat",
      description: "Play today's word puzzle free. Sort 16 words into 4 hidden groups every day. No signup, no download. A daily brain teaser and NYT Connections alternative.",
      h1: "Today's Word Puzzle - Free Daily Category Game",
      lead: "Welcome to today's free word puzzle. Sort sixteen words into four hidden groups, share your result, and come back tomorrow for a new one.",
      cta: "Play Today's Puzzle",
      featuresTitle: "Why players love today's puzzle",
      features: [
        "Free daily word puzzle - no signup, no download, no ads between groups",
        "Four difficulty levels from easy direct sets to the abstract purple group",
        "Streak tracking and an archive of the last 30 days",
        "Available in English, Chinese (中文), and Japanese (日本語)"
      ],
      faqTitle: "Today's puzzle - frequently asked questions",
      faq: [
        { q: "Is today's puzzle really free?", a: "Yes. Nanami Cat is a free daily word puzzle with no signup, no download, and no paywall. Open the page and play." },
        { q: "How is today's puzzle different from yesterday's?", a: "A new theme and four new groups unlock at midnight UTC. Yesterday's puzzle stays playable in the archive." },
        { q: "Can I share today's result?", a: "Yes. Hit the share button on the result screen to copy a Connections-style emoji block to your clipboard, or use the system share sheet on mobile." }
      ]
    }
  },
  zh: {
    ogLocale: "zh_CN",
    hreflang: "zh-CN",
    appName: "喵格谜",
    siteUrl: "https://nanamicat.com",
    home: {
      title: "喵格谜 - 今日单词分类游戏",
      description: "今日免费文字分类谜题。每天把 16 个词分成 4 组,免费在线玩,无需注册,支持中英日三语。"
    },
    today: {
      title: "今日单词分类游戏 - 免费每日文字分类谜题 | 喵格谜",
      description: "今天的免费文字分类游戏:每天 16 个词分成 4 个隐藏组,无需注册,类 NYT Connections 的每日挑战,支持中英日三语。",
      h1: "今日单词分类游戏 - 免费每日文字分类谜题",
      lead: "今天的免费文字分类谜题已上线。把十六个词分成四组,失误四次内完成,看能拿到多少分。",
      cta: "开始今天的题",
      featuresTitle: "为什么玩家喜欢今日单词分类游戏",
      features: [
        "完全免费,无需注册、下载或登录",
        "四个难度等级,从直观分类到最抽象的紫色组",
        "连续天数记录 + 最近 30 天历史题",
        "支持中文 / English / 日本語 三语切换"
      ],
      faqTitle: "今日游戏 - 常见问题",
      faq: [
        { q: "今天的游戏真的免费吗?", a: "完全免费。打开网页即可玩,无需注册、无需下载,也没有付费墙。" },
        { q: "今天的题和昨天有什么不同?", a: "每天 0 点(UTC)更新主题与分组,昨天的题可在历史题库中继续玩。" },
        { q: "可以分享今日成绩吗?", a: "可以。在结算页点击分享即可复制类 Connections 的 emoji 结果,或调用系统的原生分享面板。" }
      ]
    }
  },
  ja: {
    ogLocale: "ja_JP",
    hreflang: "ja",
    appName: "ナナミキャット",
    siteUrl: "https://nanamicat.com",
    home: {
      title: "ナナミキャット - 今日のことばパズル(無料)",
      description: "今日の無料ことばパズル。毎日16語を4つの隠れたグループに分けよう。登録不要、NYT Connections 風の毎日の脳トレ。日本語・中文・English 対応。"
    },
    today: {
      title: "今日のことばパズル - 無料の毎日文字分類ゲーム | ナナミキャット",
      description: "今日の無料ことばパズル:16語を4つの隠れたグループに分類する毎日の脳トレ。登録不要、ダウンロード不要、NYT Connections 風の日本語パズル。",
      h1: "今日のことばパズル - 無料の毎日文字分類ゲーム",
      lead: "今日の無料ことばパズルへようこそ。16のことばを4つの隠れたグループに分け、結果をシェアして、明日も新しい問題にチャレンジしましょう。",
      cta: "今日の問題にチャレンジ",
      featuresTitle: "プレイヤーに人気の理由",
      features: [
        "完全無料・登録不要・ダウンロード不要",
        "直感的な黄色から抽象的な紫まで4段階の難易度",
        "連続日数記録 + 過去30日分の履歴",
        "日本語・中文・English 3言語対応"
      ],
      faqTitle: "今日のパズル - よくある質問",
      faq: [
        { q: "今日のパズルは本当に無料ですか?", a: "完全無料です。登録・ダウンロード・課金なしでブラウザですぐ遊べます。" },
        { q: "今日の問題と昨日の問題の違いは?", a: "毎日0時(UTC)にテーマとグループが更新されます。昨日の問題は履歴ページで遊べます。" },
        { q: "今日の結果をシェアできますか?", a: "はい。クリア画面のシェアボタンで Connections 風の絵文字結果をコピー、またはスマートフォンの共有パネルを呼び出せます。" }
      ]
    }
  }
};

function getSeo(locale) {
  return SEO_BY_LOCALE[locale] || SEO_BY_LOCALE.en;
}

// ──────────────────────────────────────────────────────────────────────────
//  <head> meta injection helpers. All of them are idempotent: they update the
//  existing node if present, otherwise create one. Tag ids (`data-meta`,
//  `data-link`, `data-jsonld`) are used as lookup keys so we never duplicate.
// ──────────────────────────────────────────────────────────────────────────

function setMetaContent(name, content, isProperty = false) {
  if (!name || content == null) return;
  const attr = isProperty ? "property" : "name";
  const selector = `meta[${attr}="${CSS.escape(name)}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, name);
    document.head.appendChild(node);
  }
  if (node.getAttribute("content") !== content) {
    node.setAttribute("content", content);
  }
}

function setLinkHref(key, href, rel = "canonical", hreflang) {
  // `key` is just an internal id we tag onto the node so we can find/remove
  // it later. Multiple hreflang links can coexist, so we look them up by
  // rel+hreflang, not by key.
  if (hreflang) {
    const selector = `link[rel="${rel}"][hreflang="${hreflang}"]`;
    let node = document.head.querySelector(selector);
    if (!node) {
      node = document.createElement("link");
      node.setAttribute("rel", rel);
      node.setAttribute("hreflang", hreflang);
      document.head.appendChild(node);
    }
    if (node.getAttribute("href") !== href) node.setAttribute("href", href);
    return;
  }
  const selector = `link[rel="${rel}"][data-link-key="${key}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    // Prefer the static <link rel="canonical"> in index.html if present —
    // we just rewrite its href rather than appending a second one.
    if (rel === "canonical") {
      node = document.head.querySelector('link[rel="canonical"]');
    }
    if (!node) {
      node = document.createElement("link");
      node.setAttribute("rel", rel);
      node.setAttribute("data-link-key", key);
      document.head.appendChild(node);
    }
  }
  if (node.getAttribute("href") !== href) node.setAttribute("href", href);
}

function injectJsonLd(key, payload) {
  if (!payload) return;
  const id = `jsonld-${key}`;
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("script");
    node.type = "application/ld+json";
    node.id = id;
    document.head.appendChild(node);
  }
  const serialised = JSON.stringify(payload);
  if (node.textContent !== serialised) node.textContent = serialised;
}

function removeJsonLd(key) {
  const node = document.getElementById(`jsonld-${key}`);
  if (node && node.parentNode) node.parentNode.removeChild(node);
}

function buildGameSchema(locale) {
  const seo = getSeo(locale);
  return {
    "@context": "https://schema.org",
    "@type": "Game",
    "name": seo.appName,
    "alternateName": ["MeowGrid", "ナナミキャット", "喵格谜", "Nanami Cat"],
    "url": seo.siteUrl,
    "description": seo.home.description,
    "image": `${seo.siteUrl}/nanamicat_mascot_celebration.webp`,
    "genre": ["Word game", "Puzzle", "Brain teaser"],
    "gamePlatform": "Web Browser",
    "applicationCategory": "GameApplication",
    "operatingSystem": "Any",
    "inLanguage": ["en", "zh-CN", "ja"],
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "publisher": {
      "@type": "Organization",
      "name": "Nanami Cat",
      "url": seo.siteUrl
    }
  };
}

function buildBreadcrumbSchema(locale, pathForView) {
  const seo = getSeo(locale);
  const labels = {
    en: { home: "Home", today: "Today's Word Puzzle" },
    zh: { home: "首页", today: "今日单词分类游戏" },
    ja: { home: "ホーム", today: "今日のことばパズル" }
  };
  const tr = labels[locale] || labels.en;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": tr.home, "item": `${seo.siteUrl}/?lang=${locale}` },
      { "@type": "ListItem", "position": 2, "name": tr.today, "item": `${seo.siteUrl}${pathForView}?lang=${locale}` }
    ]
  };
}

function localizePuzzleTerm(value, locale, terms = {}) {
  return locale === "en" ? terms[value] ?? value : value;
}

function puzzleLabel(puzzle, locale) {
  const number = Number(puzzle.id.split("-").at(-1));
  if (locale === "en") return `Text puzzle ${number}`;
  if (locale === "ja") return `ことばパズル ${number}`;
  return puzzle.label;
}

function puzzleTheme(puzzle, locale, terms) {
  return localizePuzzleTerm(puzzle.theme, locale, terms);
}

function itemLabel(item, locale, terms) {
  if (item.label) return localizePuzzleTerm(item.label, locale, terms);
  // ja and zh: item.alt is already in the right language (ja catalog has
  // Japanese alts, zh catalog has Chinese alts). Only en needs the map.
  if (locale === "zh" || locale === "ja") return item.alt;
  const match = item.alt.match(/^(.*) (\d+)$/);
  if (!match) return localizePuzzleTerm(item.alt, locale, terms);
  return `${localizePuzzleTerm(match[1], locale, terms)} ${match[2]}`;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function submissionGroups(item) {
  if (Array.isArray(item?.groups)) return item.groups;
  try {
    const parsed = JSON.parse(item?.groups_json || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function submissionSummary(item, t) {
  if (item?.summary) return item.summary;
  const groups = submissionGroups(item);
  const names = groups.map((group) => group.name).filter(Boolean);
  if (names.length) {
    return `${t.adminGroupCount.replace("%d", String(names.length))}：${names.join(" / ")}`;
  }
  return item?.title || "-";
}

function humanizeApiError(message, locale = getStored("nanamicat.locale", (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en")) {
  if (message === "Not found") {
    return (locale === "zh" ? "服务暂不可用，请稍后再试。" : (locale === "ja" ? "サービスに接続できません。しばらくしてからもう一度お試しください。" : "Service unavailable. Please try again later."));
  }
  return message;
}

function resolveViewFromPath(pathname) {
  if (pathname.startsWith("/admin")) return { view: "admin", pinnedDate: null };
  if (pathname.startsWith("/leaderboard")) return { view: "leaderboard", pinnedDate: null };
  if (pathname.startsWith("/contribute")) return { view: "contribute", pinnedDate: null };
  if (pathname.startsWith("/archive")) return { view: "archive", pinnedDate: null };
  if (pathname.startsWith("/today")) return { view: "today", pinnedDate: null };
  if (pathname.startsWith("/puzzle/")) {
    const m = pathname.match(/^\/puzzle\/(\d{4}-\d{2}-\d{2})\/?$/);
    if (m) return { view: "game", pinnedDate: m[1] };
  }
  return { view: "game", pinnedDate: null };
}

function adminRequestHeaders() {
  const key = getStored("nanamicat.adminKey", "");
  return key ? { "x-admin-key": key } : {};
}

async function api(path, options = {}) {
  const locale = getStored("nanamicat.locale", (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en");
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(path.startsWith("/api/admin") ? adminRequestHeaders() : {}),
        ...(options.headers ?? {})
      }
    });
  } catch {
    throw new Error((locale === "zh" ? "网络连接失败，请检查网络后重试。" : (locale === "ja" ? "ネットワーク接続に失敗しました。" : "Network error. Check your connection and try again.")));
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallback = response.status >= 500
      ? ((locale === "zh" ? "服务器暂时不可用，请稍后再试。" : (locale === "ja" ? "サーバーが応答しません。しばらくしてからもう一度。" : "Server unavailable. Please try again later.")))
      : ((locale === "zh" ? "请求失败，请稍后重试。" : (locale === "ja" ? "リクエストに失敗しました。" : "Request failed. Please try again.")));
    throw new Error(humanizeApiError(payload.error || fallback, locale));
  }
  return payload;
}

function App() {
  const [catalog, setCatalog] = useState(null);
  const [pool, setPool] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [playedPuzzleIds, setPlayedPuzzleIds] = useState([]);
  const [locale, setLocale] = useState(() => {
    // 1. `?lang=xx` query parameter wins — that's the signal hreflang uses
    //    to tell crawlers this is a language-specific URL, and we mirror it
    //    on the runtime side so a click on the Japanese hreflang actually
    //    renders in Japanese.
    if (typeof location !== "undefined") {
      try {
        const url = new URL(location.href);
        const qp = (url.searchParams.get("lang") || "").toLowerCase();
        if (qp === "en" || qp === "zh" || qp === "ja") return qp;
        if (qp === "zh-cn" || qp === "zh-hans") return "zh";
      } catch {
        // ignore — fall through to stored/navigator detection
      }
    }
    const stored = getStored("nanamicat.locale", null);
    if (stored === "zh" || stored === "en" || stored === "ja") return stored;
    // Pick the closest supported locale from the browser's accept-language.
    // Order matters: ja is checked before en so a Japanese locale never
    // falls through to English by accident.
    const lang = (navigator.language || navigator.languages?.[0] || "en").toLowerCase();
    if (lang.startsWith("ja")) return "ja";
    if (lang.startsWith("zh")) return "zh";
    return "en";
  });
  const [theme, setTheme] = useState(() => getStored("nanamicat.theme", "default"));
  const initialRoute = resolveViewFromPath(location.pathname);
  const [view, setView] = useState(initialRoute.view);
  const [pinnedDate, setPinnedDate] = useState(initialRoute.pinnedDate);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [boardShuffleSeed, setBoardShuffleSeed] = useState(0);
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [hintBalance, setHintBalance] = useState(() => readStoredInt("nanamicat.hintBalance", hintEconomy.initialBalance));
  const [completedPuzzleCount, setCompletedPuzzleCount] = useState(() => readStoredInt("nanamicat.completedPuzzleCount", 0));
  const [message, setMessage] = useState("");
  const [boardShake, setBoardShake] = useState(false);
  const [mascotBounce, setMascotBounce] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [nickname, setNickname] = useState(() => getStored("nanamicat.nickname", ""));
  const [streak, setStreak] = useState(() => getStreak());
  const [recentCompletions, setRecentCompletions] = useState(() => getRecentCompletions());
  const [gameStartTs, setGameStartTs] = useState(() => Date.now());
  const [playerId, setPlayerId] = useState(() => getStored("nanamicat.playerId", ""));
  const [leaderboard, setLeaderboard] = useState([]);
  const [adminPuzzles, setAdminPuzzles] = useState([]);
  const [adminScores, setAdminScores] = useState([]);
  const [form, setForm] = useState(() => ({
    email: "",
    groups: [{ name: "", words: "" }]
  }));
  const [apiNotice, setApiNotice] = useState("");
  const [adminKeyInput, setAdminKeyInput] = useState(() => getStored("nanamicat.adminKey", ""));
  // Tracks the puzzleId we've already applied a resume for. Stops the
  // "persist" effect from racing with the "restore" effect on first mount
  // — without this, the persist effect can briefly write a blank board
  // before the restore effect gets a chance to read from localStorage.
  const resumeAppliedFor = useRef(null);

  const t = copy[locale];
  const englishTerms = catalog?.englishPuzzleTerms ?? {};
  const maxMistakes = catalog?.maxMistakes ?? DEFAULT_MAX_MISTAKES;
  const currentIndex = pool.length ? puzzleIndex % pool.length : 0;
  const puzzle = pool[currentIndex] ?? { id: "loading", groups: [], theme: "", difficulty: 1, redHerring: "", label: "" };
  const items = useMemo(
    () => (pool.length ? shuffle(puzzle.groups.flatMap((group) => group.items)) : []),
    [puzzle.id, pool.length, boardShuffleSeed]
  );
  const solvedIds = solved.flatMap((group) => group.items.map((item) => item.id));
  const activeItems = items.filter((item) => !solvedIds.includes(item.id));
  const remainingMistakes = Math.max(0, maxMistakes - mistakes);
  const isGameOver = mistakes >= maxMistakes && solved.length < (puzzle.groups?.length ?? 4);
  const isComplete = pool.length > 0 && puzzle.groups.length === 4 && solved.length === puzzle.groups.length;
  const abstractGroup = isComplete ? mostAbstractGroup(puzzle.groups) : null;
  // Namespace the resume key by locale so zh and ja saves never collide
  // (both catalogs use "text-001", "text-002", … as puzzle IDs).
  const resumeId = `${locale}:${puzzle.id}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadPuzzleCatalog(locale);
        const built = buildTextPuzzles(data);
        if (cancelled) return;
        setCatalog(data);
        setPool(built);
        const played = readPlayedPuzzleIds(built);
        setPlayedPuzzleIds(played);
        // Map played ids -> their actual puzzle objects so the "balanced"
        // picker can score overlap against the player's whole recent history
        // (capped at 50 so we don't burn cycles on a 500-element pool scan).
        // Combined with maxShared=0, this gives "every puzzle I click is
        // 4 groups I have not seen in my last 50 plays" — which is the
        // closest we can get to "every puzzle feels brand new" without
        // exhaustively excluding the entire playedPuzzleIds list.
        const recentPuzzles = played
          .slice(-50)
          .map((id) => built.find((p) => p.id === id))
          .filter(Boolean);
        const initialPuzzleIndex = initialRoute.pinnedDate
          ? puzzleIndexForDate(initialRoute.pinnedDate, built.length)
          : getTodayIndexBalanced(built, recentPuzzles, 50, 0);
        setPuzzleIndex(initialPuzzleIndex);
      } catch (error) {
        if (!cancelled) setCatalogError(error.message);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (!helpOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") setHelpOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [helpOpen]);

  useEffect(() => {
    function onPopState() {
      const next = resolveViewFromPath(location.pathname);
      setView(next.view);
      setPinnedDate(next.pinnedDate);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (catalogLoading) return undefined;
    async function refreshCatalog() {
      if (document.hidden) return;
      try {
        const data = await loadPuzzleCatalog(locale);
        const built = buildTextPuzzles(data);
        if (!built.length) return;
        const prevSignature = catalog
          ? `${catalog.textPuzzleCount}:${catalog.textGroupBank?.length}:${(catalog.communityPuzzles ?? []).map((item) => item.id).join(",")}`
          : "";
        const nextSignature = `${data.textPuzzleCount}:${data.textGroupBank?.length}:${(data.communityPuzzles ?? []).map((item) => item.id).join(",")}`;
        if (prevSignature && prevSignature !== nextSignature) {
          setCatalog(data);
          setPool(built);
          setApiNotice((locale === "zh" ? "题库已更新，下一题将使用新题目。" : (locale === "ja" ? "問題が更新されました。次の問題から反映されます。" : "Puzzle catalog updated. New puzzles apply on the next round.")));
        }
      } catch {
        // keep current catalog
      }
    }
    function onVisibilityChange() {
      if (!document.hidden) refreshCatalog();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [catalog, catalogLoading, locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setStored("nanamicat.theme", theme);
  }, [theme]);

  useEffect(() => {
    setStored("nanamicat.locale", locale);
    document.documentElement.lang = locale === "zh" ? "zh-CN" : locale === "ja" ? "ja" : "en";
  }, [locale]);

  useEffect(() => {
    if (!pool.length) return;
    const normalized = playedPuzzleIds.filter((id) => pool.some((item) => item.id === id));
    if (normalized.length !== playedPuzzleIds.length) {
      setPlayedPuzzleIds(normalized);
      writePlayedPuzzleIds(normalized);
    }
  }, [playedPuzzleIds, pool]);

  function markPuzzlePlayed(puzzleId) {
    if (!puzzleId || puzzleId === "loading" || !pool.length) return;
    setPlayedPuzzleIds((current) => {
      const valid = current.filter((id) => pool.some((item) => item.id === id));
      if (valid.includes(puzzleId)) return valid;
      const next = [...valid, puzzleId];
      const stored = next.length >= pool.length ? [] : next;
      writePlayedPuzzleIds(stored);
      return stored;
    });
  }

  // useLayoutEffect (NOT useEffect) so the restore commits BEFORE the
  // persist effect gets a chance to run in the same commit. This is the
  // critical part of the resume flow — if both effects run in the same
  // tick with stale state, the persist effect writes a blank board and
  // clobbers the resume we just read.
  useLayoutEffect(() => {
    if (pool.length && puzzle.id !== "loading") {
      const resume = readResume(resumeId);
      if (shouldResume(resume, resumeId, maxMistakes)) {
        const restoredSolved = (resume.solvedNames || [])
          .map((name) => puzzle.groups.find((g) => g.name === name))
          .filter(Boolean);
        setSelected(resume.selected || []);
        setSolved(restoredSolved);
        setMistakes(resume.mistakes || 0);
        setHintIndex(0);
        if (resume.gameStartTs) setGameStartTs(resume.gameStartTs);
        resumeAppliedFor.current = resumeId;
        if (resume.updatedAt && Date.now() - new Date(resume.updatedAt).getTime() < 30 * 60 * 1000) {
          setApiNotice((locale === "zh" ? "已恢复上次的进度。" : (locale === "ja" ? "前回の続きから再開します。" : "Resumed your last game.")));
        }
        setMessage((locale === "zh" ? "继续上次的进度。" : (locale === "ja" ? "前回の続きから。" : "Continuing where you left off.")));
      } else {
        resetPuzzleState();
        if (resume) clearResume(resumeId);
        setGameStartTs(Date.now());
        setMessage(t.intro);
        setApiNotice("");
        resumeAppliedFor.current = resumeId;
      }
    } else {
      resetPuzzleState();
      setGameStartTs(Date.now());
      setMessage(t.intro);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id, locale, pool.length, maxMistakes]);

  // When the URL points to a specific date (/puzzle/:date), jump the board
  // to that puzzle. Reset state so we never carry selections across pages.
  useEffect(() => {
    if (!pinnedDate || !pool.length) return;
    const target = puzzleIndexForDate(pinnedDate, pool.length);
    if (target !== puzzleIndex) {
      setPuzzleIndex(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedDate, pool.length]);

  // Fire page_view + game_start whenever the active puzzle (or pinned date)
  // changes. Catches both "new daily" and "from archive" navigation.
  useEffect(() => {
    if (!pool.length) return;
    trackPageView(location.pathname);
    trackGameStart({ puzzleId: puzzle.id, date: pinnedDate || getTodayIsoDate() });
    setGameStartTs(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id, pinnedDate, pool.length]);

  // Persist the in-progress board to localStorage on every meaningful state
  // change, so a refresh or a "come back tomorrow" tab restore can pick it
  // up. We skip the first run after a puzzle switch — that's the resume
  // effect's job, and racing with it would briefly overwrite restored state
  // with a blank board.
  useEffect(() => {
    if (!pool.length || puzzle.id === "loading") return;
    if (resumeAppliedFor.current !== resumeId) {
      // The restore effect hasn't run yet for this puzzle; let it finish
      // first so we don't clobber the resume we're about to load.
      return;
    }
    if (isComplete) {
      clearResume(resumeId);
      return;
    }
    writeResume(resumeId, {
      date: pinnedDate || getTodayIsoDate(),
      selected,
      solvedNames: solved.map((g) => g.name),
      mistakes,
      gameStartTs,
      completed: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id, selected, solved, mistakes, isComplete, gameStartTs, pinnedDate, pool.length]);

  // Update <head> meta tags per view AND per locale. Covers:
  //   - document.title
  //   - <meta name="description">
  //   - <meta property="og:title">, og:description, og:url, og:locale
  //   - <link rel="canonical"> (per-locale-aware URL)
  //   - <link rel="alternate" hreflang="…"> (refreshed per view+locale)
  //
  // This is the runtime mirror of the static tags in index.html. The static
  // tags win for crawlers that don't run JS; these win for everyone else
  // (sharing, social previews, in-page navigation).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const seo = getSeo(locale);
    const baseAppName = seo.appName;
    const today = getTodayIsoDate();

    const titles = {
      game: pinnedDate
        ? `${pinnedDate} · ${baseAppName} - ${locale === "zh" ? "每日文字分类谜题" : (locale === "ja" ? "毎日のことばパズル" : "Daily Word Puzzle")}`
        : seo.home.title,
      today: seo.today.title,
      archive: locale === "zh"
        ? `题库历史 - ${baseAppName}`
        : (locale === "ja" ? `履歴 - ${baseAppName}` : `Puzzle Archive - ${baseAppName}`),
      leaderboard: locale === "zh"
        ? `排行榜 - ${baseAppName}`
        : (locale === "ja" ? `ランキング - ${baseAppName}` : `Leaderboard - ${baseAppName}`),
      contribute: locale === "zh"
        ? `投稿谜题 - ${baseAppName}`
        : (locale === "ja" ? `問題を投稿 - ${baseAppName}` : `Submit a Puzzle - ${baseAppName}`),
      admin: "Admin - Nanami Cat"
    };

    const descriptions = {
      game: pinnedDate
        ? (locale === "zh"
            ? `${pinnedDate} 的 ${baseAppName} 文字分类谜题:把 16 个词分成 4 组,免费,无需注册。`
            : (locale === "ja"
                ? `${pinnedDate} の ${baseAppName} ことばパズル:16語を4つのグループに分けよう。無料・登録不要。`
                : `${pinnedDate} · ${baseAppName} - free daily word puzzle. Sort 16 words into 4 groups. No signup.`))
        : seo.home.description,
      today: seo.today.description,
      archive: locale === "zh"
        ? `回放过去 30 天的每日文字分类谜题,本地记录完成状态。`
        : (locale === "ja" ? `過去30日分のみことばパズルを遊べます。ローカルで進捗記録。` : `Play previous daily word puzzles. Local progress tracking.`),
      leaderboard: locale === "zh"
        ? `${baseAppName} 文字分类谜题排行榜,保存昵称即可上榜。`
        : (locale === "ja" ? `${baseAppName} ことばパズル ランキング。ニックネームで参加。` : `${baseAppName} leaderboard - save a nickname to join.`),
      contribute: locale === "zh"
        ? `向 ${baseAppName} 投稿原创文字分类谜题。1-10 组,审核通过后即编入题库。`
        : (locale === "ja" ? `${baseAppName} へ問題投稿。1〜10グループ、レビュー後に収録。` : `Submit original word puzzles to ${baseAppName}. 1-10 groups, reviewed before inclusion.`),
      admin: "Admin panel"
    };

    const currentView = view;
    const nextTitle = titles[currentView] || titles.game;
    const nextDescription = descriptions[currentView] || descriptions.game;
    const pathForView = currentView === "today" ? "/today" : "/";
    const nextUrl = `${seo.siteUrl}${pathForView}?lang=${locale}`;

    if (document.title !== nextTitle) document.title = nextTitle;
    setMetaContent("description", nextDescription);

    // Open Graph
    setMetaContent("og:title", nextTitle, true);
    setMetaContent("og:description", nextDescription, true);
    setMetaContent("og:url", nextUrl, true);
    setMetaContent("og:locale", seo.ogLocale, true);
    setMetaContent("og:site_name", baseAppName, true);

    // Twitter
    setMetaContent("twitter:title", nextTitle);
    setMetaContent("twitter:description", nextDescription);

    // Canonical — always points to the in-language homepage with ?lang=
    // marker. The static <link rel="canonical"> in index.html is overridden
    // here when we know better (per-view).
    setLinkHref("canonical", `${seo.siteUrl}${pathForView}`);

    // Hreflang alternates — emit all four (en, zh-CN, ja, x-default).
    // The hreflang URLs intentionally carry ?lang= so crawlers see them
    // as distinct variants even though they all serve the same SPA shell.
    const variants = [
      { hreflang: "en", href: `${seo.siteUrl}${pathForView}?lang=en` },
      { hreflang: "zh-CN", href: `${seo.siteUrl}${pathForView}?lang=zh` },
      { hreflang: "ja", href: `${seo.siteUrl}${pathForView}?lang=ja` },
      { hreflang: "x-default", href: `${seo.siteUrl}${pathForView}` }
    ];
    variants.forEach((variant) => {
      setLinkHref(`hreflang-${variant.hreflang}`, variant.href, "alternate", variant.hreflang);
    });

    // Per-view JSON-LD schemas. Game schema is always present (it's the
    // site's identity); /today additionally gets a BreadcrumbList that
    // points to Home + Today.
    injectJsonLd("schema-game", buildGameSchema(locale));
    if (currentView === "today") {
      injectJsonLd("schema-breadcrumb", buildBreadcrumbSchema(locale, pathForView));
    } else {
      removeJsonLd("schema-breadcrumb");
    }
  }, [view, pinnedDate, locale]);

  useEffect(() => {
    loadLeaderboard({ showError: view === "leaderboard" });
    if (view === "admin") loadAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  function resetPuzzleState() {
    setSelected([]);
    setSolved([]);
    setMistakes(0);
    setHintIndex(0);
    setApiNotice("");
  }

  // The puzzle board markup. Kept inline (not extracted) so React DevTools
  // shows the JSX tree correctly and the error overlay can point at the
  // exact line if something breaks. Also kept as a function (not a JSX
  // variable) so any per-render mutation order is explicit.
  function renderGameBoardInline() {
    return (
      <section className="game-workspace">
        <aside className="game-rail">
          <section className="status">
            <span>{t.mistakes}</span>
            <strong aria-label={`${remainingMistakes} remaining`}>
              {"●".repeat(remainingMistakes)}{"○".repeat(maxMistakes - remainingMistakes)}
            </strong>
          </section>
          <section className="status">
            <span>{t.hint}</span>
            <strong aria-label={`${hintBalance} hints remaining`}>{hintBalance}</strong>
          </section>
          <section className="status status-stairs" aria-label={locale === "zh" ? "难易程度" : "Difficulty"}>
            <span>{locale === "zh" ? "难度" : "Level"}</span>
            <div className="diff-stairs" role="img" aria-label={`${solved.length}/4 groups solved`}>
              {[1, 2, 3, 4].map((lvl) => {
                const barColors = ["#f7c948", "#7bc67b", "#6db6e8", "#a87dc8"];
                const isSolved = lvl === 1 || solved.some((g) => g.level === lvl);
                return (
                  <div
                    key={lvl}
                    className={`diff-bar${isSolved ? " diff-bar--solved" : ""}`}
                    style={{ "--bar-color": barColors[lvl - 1], "--bar-h": `${lvl * 7 + 3}px` }}
                  />
                );
              })}
            </div>
          </section>
        </aside>

        <section className="game-stage">
          <p className="message" role="status" aria-live="polite">{message}</p>

          {(isComplete || isGameOver) && <details className="puzzle-seo">
            <summary>
              {pinnedDate
                ? (locale === "zh" ? `查看 ${pinnedDate} 的题目说明` : (locale === "ja" ? `${pinnedDate} の問題説明を見る` : `About the ${pinnedDate} puzzle`))
                : (locale === "zh" ? `查看今日题目说明` : (locale === "ja" ? `今日の問題説明を見る` : "About today's puzzle"))}
            </summary>
            <div className="puzzle-seo__body">
              <h2 className="puzzle-seo__heading">
                {pinnedDate
                  ? (locale === "zh" ? `${pinnedDate} 喵格谜每日文字分类谜题` : (locale === "ja" ? `${pinnedDate} のナナミキャット ことばパズル` : `Nanami Cat Daily Word Puzzle - ${pinnedDate}`))
                  : (locale === "zh" ? `今日喵格谜每日文字分类谜题` : (locale === "ja" ? `今日のナナミキャット ことばパズル` : `Nanami Cat Daily Word Puzzle - Today`))}
              </h2>
              <p className="puzzle-seo__lead">
                {locale === "zh"
                  ? `这是 ${pinnedDate || "今天"} 的每日文字分类谜题。桌面上有 16 个词, 找出 4 组, 每组 4 个词。失误最多 4 次。主题: ${puzzleTheme(puzzle, locale, englishTerms)}。`
                  : (locale === "ja"
                    ? `${pinnedDate || "今日"}のことばパズルです。16個のことばから4つのグループ(各4語)を見つけましょう。ミスは4回まで。今日のテーマ: ${puzzleTheme(puzzle, locale, englishTerms)}。`
                    : `Today's Nanami Cat word puzzle for ${pinnedDate || "today"}. Sixteen words on the board — find four groups of four. Up to four mistakes allowed. Theme: ${puzzleTheme(puzzle, locale, englishTerms)}.`)}
              </p>
              <ul className="puzzle-seo__groups">
                {puzzle.groups.map((g, idx) => (
                  <li key={g.name}>
                    <strong>
                      {locale === "zh" ? `第 ${idx + 1} 组` : (locale === "ja" ? `グループ ${idx + 1}` : `Group ${idx + 1}`)}
                      {": "}
                      {localizePuzzleTerm(g.name, locale, englishTerms)}
                    </strong>
                    {" — "}
                    {g.items.map((it) => itemLabel(it, locale, englishTerms)).join("、")}
                  </li>
                ))}
              </ul>
              <p className="puzzle-seo__cta">
                {locale === "zh"
                  ? `免费玩, 无需注册。错过的日子可以从历史题库重玩。`
                  : (locale === "ja"
                    ? `登録不要、無料で遊べます。過去の挑戦は履歴から再挑戦できます。`
                    : `Free to play, no sign-up. Missed days can be replayed from the archive.`)}
              </p>
            </div>
          </details>}

          <div className="board-doodle-wrap">
            <svg className="board-doodle" viewBox="0 0 400 320" fill="none" aria-hidden="true" preserveAspectRatio="none">
              <path d="M18 260 Q60 240 110 255 Q160 270 200 248" stroke="var(--crayon-blue)" strokeWidth="2.5" strokeOpacity="0.14" strokeLinecap="round" fill="none" />
              <path d="M320 30 Q350 55 370 90 Q385 120 365 150" stroke="var(--crayon-pink)" strokeWidth="2.5" strokeOpacity="0.14" strokeLinecap="round" fill="none" />
              <path d="M30 60 Q55 45 80 62" stroke="var(--crayon-green)" strokeWidth="2.2" strokeOpacity="0.18" strokeLinecap="round" fill="none" />
              <path d="M350 280 Q370 265 390 278" stroke="var(--crayon-orange)" strokeWidth="2.2" strokeOpacity="0.18" strokeLinecap="round" fill="none" />
            </svg>
            <section className={`board${boardShake ? " board-shaking" : ""}`} aria-label="Puzzle board">
              {activeItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={selected.includes(item.id) ? "tile selected" : "tile"}
                  onClick={() => toggleItem(item)}
                  disabled={isGameOver}
                  aria-pressed={selected.includes(item.id)}
                  aria-label={itemLabel(item, locale, englishTerms)}
                >
                  {itemLabel(item, locale, englishTerms)}
                </button>
              ))}
            </section>
          </div>

          {/* In-progress solved groups */}
          {solved.length > 0 && !isComplete && (
            <section className="solved solved--in-progress" aria-live="polite" aria-label="Groups already found">
              {solved.map((group, idx) => {
                const meta = difficultyMeta[group.level] ?? difficultyMeta[4];
                const levelColors = {
                  "level-yellow": "#e0a818",
                  "level-green": "#5fae5c",
                  "level-blue": "#4ba2d6",
                  "level-purple": "#9d6cc4"
                };
                const underlineColor = levelColors[meta.className] ?? "#888";
                return (
                  <article
                    className={`solved-item ${meta.className}`}
                    key={group.name}
                    style={{ "--solved-index": idx }}
                  >
                    <NanamiCatMascot size="mini" altText={t.appName} />
                    <div>
                      <h2>
                        {localizePuzzleTerm(group.name, locale, englishTerms)}
                        <svg className="solved-doodle-underline" viewBox="0 0 80 8" height="6" aria-hidden="true" preserveAspectRatio="none">
                          <path
                            d="M2 5 Q12 1 22 5 Q32 9 42 5 Q52 1 62 5 Q72 9 78 5"
                            stroke={underlineColor}
                            strokeWidth="2"
                            strokeOpacity="0.55"
                            strokeLinecap="round"
                            fill="none"
                            strokeDasharray="100"
                            strokeDashoffset="100"
                            style={{ animation: `drawLine 500ms ${idx * 80}ms ease-out forwards` }}
                          />
                        </svg>
                      </h2>
                      <p>{group.items.map((item) => itemLabel(item, locale, englishTerms)).join(" / ")}</p>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          <section className="controls-split" aria-label="Game controls">
            {!isComplete && !isGameOver && (
              <>
                <button type="button" className="controls-submit primary" onClick={submitGuess} disabled={selected.length !== 4}>
                  <Check size={18} /> {t.submit}
                </button>
                <div className="controls-grid">
                  <button type="button" className="control-hint" onClick={useHint} disabled={hintBalance <= 0}>
                    <HelpCircle size={16} /> {t.hint} ({hintBalance})
                  </button>
                  <button type="button" className="control-shuffle" onClick={shuffleActiveItems}>
                    <Dices size={16} /> {t.shuffle}
                  </button>
                  <button type="button" className="control-clear" onClick={() => { setSelected([]); setMessage(t.clearedSelection); }} disabled={!selected.length}>
                    <RotateCcw size={16} /> {t.clear}
                  </button>
                  <button type="button" className="control-next" onClick={nextPuzzle}>
                    {t.next}
                  </button>
                </div>
              </>
            )}
            {isGameOver && (
              <div className="controls-grid">
                <button type="button" className="control-next" onClick={nextPuzzle}>
                  {t.next}
                </button>
              </div>
            )}
          </section>

          {isComplete && (
            <>
              {abstractGroup && (
                <section
                  className={`celebration-card level-${abstractGroup.level === 4 ? "purple" : abstractGroup.level === 3 ? "blue" : abstractGroup.level === 2 ? "green" : "yellow"}`}
                  aria-label={t.abstract}
                >
                  <NanamiCatMascot size="celebration" showCelebration={true} altText={t.appName} />
                  <div className="celebration-text">
                    <h3>{t.abstract}</h3>
                    <h2>{localizePuzzleTerm(abstractGroup.name, locale, englishTerms)}</h2>
                  </div>
                </section>
              )}

              <section className="solved" aria-live="polite" aria-label="Solved groups">
                {solved.map((group, idx) => {
                  const meta = difficultyMeta[group.level] ?? difficultyMeta[4];
                  const levelColors = {
                    "level-yellow": "#e0a818",
                    "level-green": "#5fae5c",
                    "level-blue": "#4ba2d6",
                    "level-purple": "#9d6cc4"
                  };
                  const underlineColor = levelColors[meta.className] ?? "#888";
                  return (
                    <article
                      className={`solved-item ${meta.className}`}
                      key={group.name}
                      style={{ "--solved-index": idx }}
                    >
                      <NanamiCatMascot size="mini" altText={t.appName} />
                      <div>
                        <h2>
                          {localizePuzzleTerm(group.name, locale, englishTerms)}
                          <svg className="solved-doodle-underline" viewBox="0 0 80 8" height="6" aria-hidden="true" preserveAspectRatio="none">
                            <path
                              d="M2 5 Q12 1 22 5 Q32 9 42 5 Q52 1 62 5 Q72 9 78 5"
                              stroke={underlineColor}
                              strokeWidth="2"
                              strokeOpacity="0.55"
                              strokeLinecap="round"
                              fill="none"
                              strokeDasharray="100"
                              strokeDashoffset="100"
                              style={{ animation: `drawLine 500ms ${idx * 80}ms ease-out forwards` }}
                            />
                          </svg>
                        </h2>
                        <p>{group.items.map((item) => itemLabel(item, locale, englishTerms)).join(" / ")}</p>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="completion-actions" aria-label="Completion actions">
                <button type="button" className="primary completion-next" onClick={nextPuzzle}>{t.nextAfterComplete}</button>
                <button type="button" className="control-share" onClick={shareResult}>
                  <Share2 size={16} /> {t.share}
                </button>
                <button type="button" className="control-archive" onClick={() => setRoute("archive")}>
                  {locale === "zh" ? "玩历史题" : (locale === "ja" ? "過去の挑戦" : "Play previous")}
                </button>
                {!pinnedDate && (
                  <button
                    type="button"
                    className="control-tomorrow"
                    onClick={() => { resetPuzzleState(); setMessage(locale === "zh" ? "明天见！" : (locale === "ja" ? "また明日！" : "See you tomorrow!")); }}
                  >
                    {locale === "zh" ? "明天再来" : (locale === "ja" ? "また明日ね" : "Come back tomorrow")}
                  </button>
                )}
              </section>

              <AdSlot slotName="ad-result-bottom" reservedHeight={120} label="Ad" />
            </>
          )}
        </section>
      </section>
    );
  }

  function setRoute(nextView, options = {}) {
    setView(nextView);
    const nextPinned = options.pinnedDate ?? null;
    setPinnedDate(nextPinned);
    const paths = {
      game: nextPinned ? `/puzzle/${nextPinned}` : "/",
      today: "/today",
      archive: "/archive",
      leaderboard: "/leaderboard",
      contribute: "/contribute",
      admin: "/admin"
    };
    history.pushState(null, "", paths[nextView] ?? "/");
  }

  function openArchivePuzzle(date) {
    if (!date) {
      setRoute("game");
      return;
    }
    setRoute("game", { pinnedDate: date });
  }

  function toggleItem(item) {
    if (isComplete || isGameOver || solvedIds.includes(item.id)) return;
    setSelected((current) => {
      if (current.includes(item.id)) return current.filter((id) => id !== item.id);
      if (current.length === 4) return current;
      return [...current, item.id];
    });
  }

  function nearMissMessage() {
    const counts = puzzle.groups
      .map((group) => ({
        name: localizePuzzleTerm(group.name, locale, englishTerms),
        count: group.items.filter((item) => selected.includes(item.id)).length
      }))
      .sort((a, b) => b.count - a.count);
    if (counts[0]?.count === 3) {
      if (locale === "zh") return `红鲱鱼出现：你摸到了「${counts[0].name}」的边，但有一个项目在误导你。`;
      if (locale === "ja") return `惜しい：「${counts[0].name}」に近づいていますが、1つのことばに惑わされています。`;
      return `Red herring: you are close to "${counts[0].name}", but one item is pulling you away.`;
    }
    return t.wrong;
  }

  async function ensurePlayer() {
    const cleanName = nickname.trim();
    if (!cleanName) return null;
    const payload = await api("/api/player", {
      method: "POST",
      body: JSON.stringify({ playerId: playerId || undefined, nickname: cleanName })
    });
    setPlayerId(payload.player.id);
    setStored("nanamicat.playerId", payload.player.id);
    setStored("nanamicat.nickname", cleanName);
    return payload.player;
  }

  async function submitScore() {
    try {
      const player = await ensurePlayer();
      if (!player) {
        setApiNotice(t.needsName);
        return;
      }
      await api("/api/score", {
        method: "POST",
        body: JSON.stringify({ playerId: player.id, nickname: player.nickname, mode: "text", puzzleId: puzzle.id })
      });
      setApiNotice(t.savedScore);
      loadLeaderboard();
    } catch (error) {
      setApiNotice(error.message);
    }
  }

  function submitGuess() {
    if (isComplete || isGameOver) return;
    if (selected.length !== 4) {
      setMessage(t.chooseFour);
      return;
    }

    const guessKey = [...selected].sort().join("|");
    const matched = puzzle.groups.find((group) => group.items.map((item) => item.id).sort().join("|") === guessKey);

    if (matched && !solved.some((item) => item.name === matched.name)) {
      const nextSolved = [...solved, matched];
      setSolved(nextSolved);
      setSelected([]);
      setMascotBounce(true);
      setTimeout(() => setMascotBounce(false), 450);
      if (nextSolved.length === puzzle.groups.length) {
        setMessage(t.complete);
        markPuzzlePlayed(puzzle.id);
        const nextCompleted = completedPuzzleCount + 1;
        setCompletedPuzzleCount(nextCompleted);
        setStored("nanamicat.completedPuzzleCount", String(nextCompleted));
        if (nextCompleted % hintEconomy.clearsPerReward === 0) {
          setHintBalance((current) => {
            const next = current + 1;
            setStored("nanamicat.hintBalance", String(next));
            return next;
          });
          setApiNotice(t.hintsEarned);
        }
        // Record per-day progress for archive + streak. The date key falls
        // back to the current calendar day when the user is on a non-pinned
        // board (i.e. the daily puzzle).
        const completionDate = pinnedDate || getTodayIsoDate();
        const timeSeconds = Math.max(0, Math.floor((Date.now() - gameStartTs) / 1000));
        recordCompletion({ date: completionDate, puzzleId: puzzle.id, mistakes, timeSeconds });
        setStreak(getStreak());
        setRecentCompletions(getRecentCompletions());
        trackGameComplete({ puzzleId: puzzle.id, date: completionDate, timeSeconds, mistakes, perfect: mistakes === 0 });
        submitScore();
      } else {
        const groupName = localizePuzzleTerm(matched.name, locale, englishTerms);
        const correctMsg = locale === "zh"
          ? `正确！找到了「${groupName}」`
          : locale === "ja"
          ? `正解！「${groupName}」グループ発見`
          : `Correct group: ${groupName}`;
        setMessage(correctMsg);
      }
      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setMessage(nextMistakes >= maxMistakes ? t.out : nearMissMessage());
    setBoardShake(true);
    setTimeout(() => setBoardShake(false), 420);
    if (nextMistakes >= maxMistakes) {
      trackGameFail({ puzzleId: puzzle.id, mistakes: nextMistakes });
    }
  }

  function shuffleActiveItems() {
    const activeIds = new Set(activeItems.map((item) => item.id));
    setSelected((current) => current.filter((id) => activeIds.has(id)));
    setBoardShuffleSeed((current) => current + 1);
    setMessage((locale === "zh" ? "已打乱未解锁项目。" : (locale === "ja" ? "未解答の項目をシャッフルしました。" : "Unsolved items shuffled.")));
  }

  function useHint() {
    if (hintBalance <= 0) {
      setMessage(t.hintsEmpty);
      return;
    }
    const unsolvedGroups = puzzle.groups.filter((group) => !solved.some((item) => item.name === group.name));
    if (!unsolvedGroups.length) return;
    setHintBalance((current) => {
      const next = Math.max(0, current - 1);
      setStored("nanamicat.hintBalance", String(next));
      return next;
    });
    const hintGroup = unsolvedGroups[hintIndex % unsolvedGroups.length];
    setHintIndex((current) => current + 1);
    const herring = localizePuzzleTerm(puzzle.redHerring, locale, englishTerms);
    setMessage(
      locale === "zh"
        ? `提示：有一组与「${hintGroup.name}」有关。${herring}`
        : `Hint: one group relates to "${localizePuzzleTerm(hintGroup.name, locale, englishTerms)}". ${herring}`
    );
  }

  function nextPuzzle() {
    // Build the list of "recent puzzles" (the player's last 50 plays) so
    // the balanced picker can avoid re-using the same groups the player
    // just saw. With maxShared=0, every click gives the player a puzzle
    // whose 4 groups are all new.
    const recentPuzzles = playedPuzzleIds
      .slice(-50)
      .map((id) => pool.find((p) => p.id === id))
      .filter(Boolean);
    // Wipe the current puzzle's resume — the player is choosing to leave.
    if (puzzle.id && puzzle.id !== "loading") clearResume(resumeId);
    const nextIndex = pickBalancedNext(pool, puzzleIndex, recentPuzzles, 50, 0);
    setPuzzleIndex(nextIndex);
    resetPuzzleState();
  }

  async function saveNickname() {
    try {
      const player = await ensurePlayer();
      if (player) {
        const clears = Number(player.text_clears ?? 0);
        setApiNotice(t.joinedLeaderboard.replace("%d", String(clears)));
        loadLeaderboard();
      }
    } catch (error) {
      setApiNotice(error.message);
    }
  }

  async function loadLeaderboard({ showError = false } = {}) {
    setLeaderboardLoading(true);
    try {
      const payload = await api("/api/leaderboard");
      setLeaderboard(payload.leaderboard ?? []);
    } catch (error) {
      if (showError) setApiNotice(error.message);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  async function submitPuzzleForm(event) {
    event.preventDefault();
    setSubmitLoading(true);
    try {
      const player = await ensurePlayer();
      const parsedGroups = form.groups.map((group) => ({
        name: group.name.trim(),
        words: group.words.split(/[,\n，]/).map((word) => word.trim()).filter(Boolean)
      }));
      const filledGroups = parsedGroups.filter((group) => group.name || group.words.length > 0);
      if (!filledGroups.length) {
        throw new Error((locale === "zh" ? "最少填写 1 组，每组 4 个词。" : (locale === "ja" ? "1〜10グループ、各4語が必要です。" : "Add at least one group with exactly four words.")));
      }
      if (filledGroups.length > 10) {
        throw new Error((locale === "zh" ? "一次最多提交 10 组。" : (locale === "ja" ? "一度に最大10グループまで投稿できます。" : "You can submit at most 10 groups at a time.")));
      }
      if (filledGroups.some((group) => !group.name || group.words.length !== 4)) {
        throw new Error((locale === "zh" ? "每个已填写分组必须有组名且恰好 4 个词。" : (locale === "ja" ? "各グループに名前と4語が必要です。" : "Each filled group needs a name and exactly four words.")));
      }
      const payload = await api("/api/puzzles", {
        method: "POST",
        body: JSON.stringify({
          playerId: player?.id,
          nickname: nickname.trim() || "Guest",
          email: form.email.trim() || undefined,
          groups: filledGroups
        })
      });
      setForm({ email: "", groups: [{ name: "", words: "" }] });
      if (payload?.email?.attempted && payload?.email?.sent) {
        setApiNotice(t.thankYouEmailSent);
      } else if (form.email.trim()) {
        setApiNotice(t.thankYouEmailNotSent);
      } else {
        setApiNotice(t.submissionSavedPending);
      }
    } catch (error) {
      setApiNotice(error.message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function loadAdmin() {
    try {
      const [puzzlesPayload, scoresPayload] = await Promise.all([
        api("/api/admin/puzzles"),
        api("/api/admin/scores")
      ]);
      setAdminPuzzles(puzzlesPayload.submissions ?? []);
      setAdminScores(scoresPayload.scores ?? []);
    } catch (error) {
      setApiNotice(error.message);
    }
  }

  function updateAdminSubmissionGroup(id, groupIndex, patch) {
    setAdminPuzzles((current) => current.map((item) => {
      if (item.id !== id) return item;
      const groups = submissionGroups(item).map((group, index) =>
        index === groupIndex ? { ...group, ...patch } : group
      );
      return { ...item, groups, groups_json: JSON.stringify(groups) };
    }));
  }

  async function updateSubmission(id, status) {
    try {
      const item = adminPuzzles.find((submission) => submission.id === id);
      await api(`/api/admin/puzzles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          groups: item ? submissionGroups(item) : undefined
        })
      });
      loadAdmin();
    } catch (error) {
      setApiNotice(error.message);
    }
  }

  function emojiResult() {
    // Build a Connections-style emoji grid: each solved group gets a coloured
    // block, mistakes reduce the streak. Lives in JS to keep server-free.
    const blocks = solved.map((g) => {
      const level = Math.max(1, Math.min(4, g.level || 1));
      return ["🟨", "🟩", "🟦", "🟪"][level - 1] || "⬛";
    });
    while (blocks.length < 4) blocks.push("⬜");
    const miss = Math.max(0, mistakes);
    return `${blocks.join(" ")}\n${"❌".repeat(Math.min(3, miss))}${"⬛".repeat(Math.max(0, 3 - miss))}`;
  }

  async function shareResult() {
    const completionDate = pinnedDate || getTodayIsoDate();
    const timeSeconds = Math.max(0, Math.floor((Date.now() - gameStartTs) / 1000));
    const perfect = mistakes === 0;
    const abstractName = abstractGroup ? localizePuzzleTerm(abstractGroup.name, locale, englishTerms) : "-";
    const timeStr = `${Math.floor(timeSeconds / 60)}:${String(timeSeconds % 60).padStart(2, "0")}`;
    const headline = (locale === "zh" ? "喵格谜" : (locale === "ja" ? "ナナミキャット" : "Nanami Cat"));
    const report = [
      `${headline} · ${completionDate}`,
      `${puzzleLabel(puzzle, locale)}`,
      `${solved.length}/4 · ${t.mistakes} ${mistakes}${perfect ? " · ⭐" : ""}`,
      `${t.abstract}: ${abstractName}`,
      emojiResult(),
      `https://nanamicat.com/puzzle/${completionDate}`
    ].join("\n");
    let usedMethod = "clipboard";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: report, title: headline });
        usedMethod = "native";
        return;
      } catch {
        // fall through to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(report);
        setMessage((locale === "zh" ? "结果已复制。" : (locale === "ja" ? "結果をコピーしました。" : "Result copied.")));
      } catch {
        setMessage((locale === "zh" ? "分享失败，请手动复制。" : (locale === "ja" ? "シェアに失敗しました。手動でコピーしてください。" : "Share failed, copy manually.")));
      }
    }
    trackShareClick({ puzzleId: puzzle.id, platform: usedMethod });
  }

  if (catalogLoading) {
    return (
      <main className="page page-loading" role="status" aria-live="polite">
        <p>{(locale === "zh" ? "正在加载题库…" : (locale === "ja" ? "問題を読み込み中…" : "Loading puzzles…"))}</p>
      </main>
    );
  }

  if (catalogError || !pool.length) {
    return (
      <main className="page page-loading" role="alert">
        <p>{catalogError || ((locale === "zh" ? "题库加载失败。" : (locale === "ja" ? "問題の読み込みに失敗しました。" : "Failed to load puzzles.")))}</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          {(locale === "zh" ? "重试" : (locale === "ja" ? "再試行" : "Retry"))}
        </button>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="app-header">
        <section className="hero">
          <div className="brand-lockup">
            <NanamiCatMascot size="gameHeader" className={mascotBounce ? "mascot-bouncing" : ""} altText={t.appName} />
            <div>
              <p className="kicker">{t.kicker}</p>
              <h1>
                <span className="title-doodle-wrap">
                  {t.appName}
                  <svg className="title-doodle" viewBox="0 0 80 36" fill="none" aria-hidden="true">
                    <ellipse cx="40" cy="18" rx="37" ry="14.5" stroke="var(--primary)" strokeWidth="2.5" strokeOpacity="0.35" strokeLinecap="round" strokeDasharray="3 2" fill="none" pathLength="100" />
                  </svg>
                </span>
              </h1>
              <p className="meta">{puzzleLabel(puzzle, locale)} / {puzzleTheme(puzzle, locale, englishTerms)} / {difficultyLabel(puzzle.difficulty, locale)}</p>
            </div>
          </div>
          <div className="hero-tools">
            <div
              className="lang-switch"
              role="group"
              aria-label={
                locale === "zh" ? "语言" : locale === "ja" ? "言語" : "Language"
              }
            >
              <Globe2 size={14} className="lang-switch__icon" aria-hidden="true" />
              <div className="lang-switch__track">
                {/* Sliding thumb: absolute-positioned highlight that travels
                    between the three slots. transform translateX uses the
                    slot width as the unit (set in CSS via custom property),
                    so the thumb lines up exactly with the active label. */}
                <span
                  className="lang-switch__thumb"
                  data-active={locale}
                  aria-hidden="true"
                />
                {[
                  { id: "zh", label: "中文" },
                  { id: "en", label: "EN" },
                  { id: "ja", label: "日本語" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="lang-switch__btn"
                    onClick={() => setLocale(opt.id)}
                    aria-pressed={locale === opt.id}
                    aria-label={
                      locale === "zh" ? `切换到 ${opt.label}`
                        : locale === "ja" ? `${opt.label} に切り替え`
                        : `Switch to ${opt.label}`
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="ghost" type="button" onClick={() => setHelpOpen(true)}>
              <HelpCircle size={15} /> {t.help}
            </button>
          </div>
        </section>

        <nav className="topnav" aria-label="Primary">
          {[
            ["today", locale === "zh" ? "今日" : (locale === "ja" ? "今日" : "Today"), Sparkles],
            ["archive", locale === "zh" ? "历史" : (locale === "ja" ? "履歴" : "Archive"), Sparkles],
            ["leaderboard", t.leaderboard, Trophy],
            ["contribute", t.contribute, PenLine]
          ].map(([id, label, Icon]) => (
            <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setRoute(id)}>
              <Icon size={16} /> {label}
            </button>
          ))}
          {streak.current > 0 && (
            <span className="topnav-streak" title={locale === "zh" ? "连续天数" : (locale === "ja" ? "連続日数" : "Day streak")}>
              🔥 {streak.current}
            </span>
          )}
        </nav>
      </header>

      {apiNotice && <p className="notice" role="status">{apiNotice}</p>}

      {view === "game" && (
        <>
          <section className="toolbar" aria-label="Game settings">
            <div className="theme-picker">
              <Palette size={16} />
              {themes.map((item) => (
                <button key={item.id} type="button" className={theme === item.id ? "active" : ""} onClick={() => setTheme(item.id)}>
                  {item[locale]}
                </button>
              ))}
            </div>
          </section>

          {/* The actual play board. We keep the markup inline here (not in a
              helper function) so React DevTools and the error stack can
              point at the right component boundary. */}
          {renderGameBoardInline()}

          {/* Back link when this board is pinned to a specific date via /puzzle/:date */}
          {pinnedDate && (
            <nav className="puzzle-back" aria-label={locale === "zh" ? "返回" : "Navigation"}>
              <button type="button" className="ghost-back" onClick={() => setRoute("archive")}>
                {locale === "zh" ? `← 返回 ${pinnedDate} 的题库` : `← Back to archive (${pinnedDate})`}
              </button>
            </nav>
          )}

          {/* Page-bottom ad slot: only renders on the daily board, not the
              archive view (which has its own ad-archive-bottom). */}
          <AdSlot slotName="ad-page-bottom" reservedHeight={120} label="Ad" />
        </>
      )}

      {/* /today SEO landing. Renders the same playable board inside a
          wrapper of H1 + lead + features + FAQ so crawlers (and humans who
          scroll up after a round) see a proper "today's puzzle" landing
          with long-tail keyword coverage. JSON-LD is injected at runtime by
          the head-meta effect above. */}
      {view === "today" && renderTodayLanding()}

      {view === "archive" && (
        <Suspense fallback={<ArchiveFallback />}>
          <Archive pool={pool} locale={locale} onOpenPuzzle={openArchivePuzzle} />
        </Suspense>
      )}

      {view === "leaderboard" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t.leaderboard}</h2>
              <p>{t.leaderboardLead}</p>
            </div>
            <div className="name-row">
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} placeholder={t.playerName} />
              <button type="button" className="primary" onClick={saveNickname}>{t.saveName}</button>
            </div>
          </div>
          {leaderboardLoading ? (
            <div className="skeleton-rows">
              {[80, 65, 75].map((w, i) => (
                <div key={i} className="skeleton-row" style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t.playerName}</th>
                      <th>{t.scoreText}</th>
                      <th>{t.totalScore}</th>
                      <th>{t.recent}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, index) => (
                      <tr key={row.id} className="leaderboard-row" style={{ "--row-index": index }}>
                        <td>{index + 1}</td>
                        <td>{row.nickname}</td>
                        <td>{row.text_clears}</td>
                        <td><strong>{row.total_score}</strong></td>
                        <td>{new Date(row.updated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!leaderboard.length && (
                <div className="empty-state">
                  <NanamiCatMascot size="empty" className="mascot-bob" altText={t.appName} />
                  <div className="paw-prints" aria-hidden="true">
                    {["-8deg", "4deg", "-4deg"].map((rot, i) => (
                      <svg key={i} width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ transform: `rotate(${rot})` }}>
                        <ellipse cx="11" cy="14" rx="5.5" ry="4.5" fill="var(--primary)" />
                        <circle cx="6"  cy="9"  r="2" fill="var(--primary)" />
                        <circle cx="11" cy="7.5" r="2" fill="var(--primary)" />
                        <circle cx="16" cy="9"  r="2" fill="var(--primary)" />
                        <ellipse cx="11" cy="18" rx="2" ry="1.2" fill="var(--primary)" />
                      </svg>
                    ))}
                  </div>
                  <p className="empty">{t.emptyLeaderboard}</p>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {view === "contribute" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title-lockup">
                <h2>{t.submitPuzzle}</h2>
                <NanamiCatMascot size="header" altText={t.appName} />
              </div>
              <p>{t.contributionLead}</p>
            </div>
            <div className="name-row">
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} placeholder={t.playerName} />
              <button type="button" onClick={saveNickname}>{t.saveName}</button>
            </div>
          </div>
          <form className="submission-form" onSubmit={submitPuzzleForm}>
            <label>
              {t.contactEmail}
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                maxLength={254}
              />
            </label>
            <div className="group-grid">
              {form.groups.map((group, index) => {
                const wordCount = group.words.split(/[,\n，]/).map((w) => w.trim()).filter(Boolean).length;
                const nameEmpty = group.name.trim() === "";
                return (
                  <React.Fragment key={index}>
                    {index > 0 && index % 2 === 0 && (
                      <svg className="doodle-divider" viewBox="0 0 300 12" aria-hidden="true" style={{ gridColumn: "1 / -1" }}>
                        <path d="M0 6 Q15 3 30 6 Q45 9 60 6 Q75 3 90 6 Q105 9 120 6 Q135 3 150 6 Q165 9 180 6 Q195 3 210 6 Q225 9 240 6 Q255 3 270 6 Q285 9 300 6"
                          stroke="var(--line)" strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round" fill="none" />
                      </svg>
                    )}
                    <fieldset className="group-card">
                      <legend>{t.groupName} {index + 1}</legend>
                      {form.groups.length > 1 && (
                        <button
                          type="button"
                          className="group-remove"
                          onClick={() => setForm({ ...form, groups: form.groups.filter((_, i) => i !== index) })}
                        >
                          {t.removeGroup}
                        </button>
                      )}
                      <input
                        className={nameEmpty && group.words ? "invalid" : ""}
                        value={group.name}
                        placeholder={t.groupName}
                        onChange={(event) => {
                          const groups = [...form.groups];
                          groups[index] = { ...groups[index], name: event.target.value };
                          setForm({ ...form, groups });
                        }}
                      />
                      {nameEmpty && group.words && (
                        <span className="field-error">{locale === "zh" ? "请填写组名" : "Group name required"}</span>
                      )}
                      <textarea
                        value={group.words}
                        onChange={(event) => {
                          const groups = [...form.groups];
                          groups[index] = { ...groups[index], words: event.target.value };
                          setForm({ ...form, groups });
                        }}
                        placeholder={t.words}
                      />
                      <span className={`word-count${wordCount === 4 ? " ok" : wordCount > 0 ? " warn" : ""}`}>
                        {wordCount}/4
                      </span>
                    </fieldset>
                  </React.Fragment>
                );
              })}
            </div>
            {form.groups.length < 10 && (
              <button
                type="button"
                className="add-group"
                onClick={() => setForm({ ...form, groups: [...form.groups, { name: "", words: "" }] })}
              >
                {t.addGroup}
              </button>
            )}
            <button type="submit" className="primary" disabled={submitLoading}>
              {submitLoading ? <span className="btn-spinner" /> : null}
              {t.savePuzzle}
            </button>
          </form>
        </section>
      )}

      {view === "admin" && (
        <section className="panel admin-panel">
          <div className="panel-head">
            <div>
              <h2>{t.admin}</h2>
              <p>{t.adminLead}</p>
            </div>
            <button type="button" onClick={loadAdmin}>{locale === "zh" ? "刷新" : "Refresh"}</button>
          </div>
          <label className="admin-key-field">
            <span>{locale === "zh" ? "本地 Admin Key（可选）" : "Local admin key (optional)"}</span>
            <input
              type="password"
              value={adminKeyInput}
              onChange={(event) => {
                setAdminKeyInput(event.target.value);
                setStored("nanamicat.adminKey", event.target.value);
              }}
              placeholder={locale === "zh" ? "与 .env 中 ADMIN_KEY 一致" : "Match ADMIN_KEY in .env"}
              autoComplete="off"
            />
          </label>
          <h3>{t.adminPuzzles}</h3>
          <div className="admin-list">
            {adminPuzzles.map((item) => {
              const groups = submissionGroups(item);
              return (
              <article key={item.id} className="admin-item">
                <div>
                  <strong>{submissionSummary(item, t)}</strong>
                  <p>{item.nickname} / {new Date(item.created_at).toLocaleString()}</p>
                  {item.contact_email ? <p>{item.contact_email}</p> : null}
                  <div className="admin-groups">
                    {groups.map((group, index) => (
                      <div key={`${item.id}-${index}`} className="admin-group-card">
                        <label>
                          {t.groupName}
                          <input
                            value={group.name || ""}
                            onChange={(event) => updateAdminSubmissionGroup(item.id, index, { name: event.target.value })}
                          />
                        </label>
                        <label>
                          {t.adminGroupWords}
                          <textarea
                            value={(group.words || []).join(", ")}
                            onChange={(event) => updateAdminSubmissionGroup(item.id, index, {
                              words: event.target.value.split(/[,\n，]/).map((word) => word.trim()).filter(Boolean)
                            })}
                          />
                        </label>
                        <label>
                          {t.adminEnglishName}
                          <input
                            value={group.englishName || ""}
                            onChange={(event) => updateAdminSubmissionGroup(item.id, index, { englishName: event.target.value })}
                          />
                        </label>
                        <label>
                          {t.adminEnglishWords}
                          <textarea
                            value={(group.englishWords || []).join(", ")}
                            onChange={(event) => updateAdminSubmissionGroup(item.id, index, {
                              englishWords: event.target.value.split(/[,\n，]/).map((word) => word.trim()).filter(Boolean)
                            })}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <select value={item.status} onChange={(event) => updateSubmission(item.id, event.target.value)}>
                  <option value="pending">{t.statusPending}</option>
                  <option value="reviewed">{t.statusReviewed}</option>
                  <option value="included">{t.statusIncluded}</option>
                  <option value="rejected">{t.statusRejected}</option>
                </select>
              </article>
              );
            })}
            {!adminPuzzles.length && <p className="empty">{t.emptySubmissions}</p>}
          </div>
          <h3>{t.adminScores}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>{t.playerName}</th><th>Mode</th><th>Puzzle</th><th>Points</th><th>{t.recent}</th></tr>
              </thead>
              <tbody>
                {adminScores.map((row) => (
                  <tr key={row.id}>
                    <td>{row.nickname}</td>
                    <td>{row.mode}</td>
                    <td>{row.puzzle_id}</td>
                    <td>{row.points}</td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}


      {helpOpen && (
        <div className="pay-modal rules-modal" role="dialog" aria-modal="true" aria-label={t.help}>
          <button className="pay-modal-backdrop" type="button" aria-label="Close rules overlay" onClick={() => setHelpOpen(false)} />
          <div className="pay-modal-panel rules-modal-panel">
            <button className="pay-modal-close" type="button" onClick={() => setHelpOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
            <div className="rules-modal-head">
              <NanamiCatMascot size="mini" altText={t.appName} />
              <h2>{t.help}</h2>
            </div>
            <p className="rules-modal-body">{t.rulesBody}</p>
            <div className="rules-modal-example">
              <p className="rules-modal-example-label">{t.rulesExampleTitle}</p>
              <strong>{t.rulesExampleName}</strong>
              <p>{t.rulesExampleWords}</p>
              <p className="rules-modal-example-note">{t.rulesExampleNote}</p>
            </div>
            <button type="button" className="primary rules-modal-close-btn" onClick={() => setHelpOpen(false)}>
              {t.rulesClose}
            </button>
          </div>
        </div>
      )}

      <footer className="site-footer" aria-label="Site links">
        <div className="site-footer__cols">
          <div>
            <h4>{locale === "zh" ? "导航" : "Site"}</h4>
            <ul>
              <li><a href="/how-to-play">{locale === "zh" ? "玩法" : "How to play"}</a></li>
              <li><a href="/archive">{locale === "zh" ? "历史题" : "Archive"}</a></li>
              <li><a href="/about">{locale === "zh" ? "关于" : "About"}</a></li>
            </ul>
          </div>
          <div>
            <h4>{locale === "zh" ? "法律" : "Legal"}</h4>
            <ul>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Use</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>{locale === "zh" ? "最近完成" : "Recent clears"}</h4>
            {recentCompletions.length ? (
              <ul className="site-footer__recent">
                {recentCompletions.map((item) => (
                  <li key={item.date}>
                    <a href={`/puzzle/${item.date}`}>
                      <time dateTime={item.date}>{item.date}</time>
                      {item.perfect ? " ⭐" : ""}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="site-footer__empty">{locale === "zh" ? "完成一题后会显示在这里。" : "Recent completions will appear here."}</p>
            )}
          </div>
        </div>
        <p className="site-footer__copy">© {new Date().getFullYear()} Nanami Cat</p>
      </footer>

    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
    <StickyAdBar slotName="page-bottom" reservedHeight={90} />
  </ErrorBoundary>
);
