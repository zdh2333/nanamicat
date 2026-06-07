import React, { useEffect, useMemo, useState } from "react";
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
import {
  buildTextPuzzles,
  getTodayIndex,
  loadPuzzleCatalog,
  mostAbstractGroup
} from "./puzzleEngine.js";

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
  1: { zh: "直观分类", en: "Direct sets", className: "level-yellow" },
  2: { zh: "常识联想", en: "Familiar links", className: "level-green" },
  3: { zh: "跨域关系", en: "Cross-domain", className: "level-blue" },
  4: { zh: "细节线索", en: "Detail clues", className: "level-purple" }
};

function difficultyLabel(level, locale) {
  return difficultyMeta[level]?.[locale] ?? difficultyMeta[1][locale];
}

function NanamiCatMascot({ size = "header", showCelebration = false, className = "" }) {
  const dimensions = {
    mini: 28,
    header: 28,
    gameHeader: 52,
    empty: 72,
    celebration: 120
  };
  const dim = dimensions[size] || 28;
  const cardSize = size === "gameHeader" ? 64 : null;

  let src = "/nanamicat_mascot_standard.png";
  if (size === "empty") {
    src = "/nanamicat_mascot_empty.png";
  } else if (size === "celebration" || showCelebration) {
    src = "/nanamicat_mascot_celebration.png";
  }

  if (cardSize) {
    return (
      <div className={`mascot-card${className ? ` ${className}` : ""}`}>
        <img src={src} alt="喵格谜" className="mascot-card-img" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="喵格谜"
      width={dim}
      height={dim}
      className={className}
      style={{ display: "block", objectFit: "contain", width: `${dim}px`, height: `${dim}px` }}
    />
  );
}

const themes = [
  { id: "default", zh: "默认", en: "Default" },
  { id: "mist", zh: "雾灰", en: "Mist" },
  { id: "sage", zh: "鼠尾草", en: "Sage" },
  { id: "clay", zh: "陶土", en: "Clay" }
];

const copy = {
  zh: {
    appName: "喵格谜",
    kicker: "每日分类谜题",
    language: "English",
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
    language: "中文",
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
  }
};

function localizePuzzleTerm(value, locale, terms = {}) {
  return locale === "en" ? terms[value] ?? value : value;
}

function puzzleLabel(puzzle, locale) {
  const number = Number(puzzle.id.split("-").at(-1));
  if (locale === "en") return `Text puzzle ${number}`;
  return puzzle.label;
}

function puzzleTheme(puzzle, locale, terms) {
  return localizePuzzleTerm(puzzle.theme, locale, terms);
}

function itemLabel(item, locale, terms) {
  if (item.label) return localizePuzzleTerm(item.label, locale, terms);
  if (locale === "zh") return item.alt;
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

function humanizeApiError(message, locale = getStored("nanamicat.locale", "zh")) {
  if (message === "Not found") {
    return locale === "zh" ? "服务暂不可用，请稍后再试。" : "Service unavailable. Please try again later.";
  }
  return message;
}

function resolveViewFromPath(pathname) {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/contribute")) return "contribute";
  return "game";
}

function adminRequestHeaders() {
  const key = getStored("nanamicat.adminKey", "");
  return key ? { "x-admin-key": key } : {};
}

async function api(path, options = {}) {
  const locale = getStored("nanamicat.locale", "zh");
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
    throw new Error(locale === "zh" ? "网络连接失败，请检查网络后重试。" : "Network error. Check your connection and try again.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallback = response.status >= 500
      ? (locale === "zh" ? "服务器暂时不可用，请稍后再试。" : "Server unavailable. Please try again later.")
      : (locale === "zh" ? "请求失败，请稍后重试。" : "Request failed. Please try again.");
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
  const [locale, setLocale] = useState(() => getStored("nanamicat.locale", "zh"));
  const [theme, setTheme] = useState(() => getStored("nanamicat.theme", "default"));
  const [view, setView] = useState(() => resolveViewFromPath(location.pathname));
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
  const isComplete = pool.length > 0 && puzzle.groups.length === 4 && solved.length === puzzle.groups.length;
  const abstractGroup = isComplete ? mostAbstractGroup(puzzle.groups) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadPuzzleCatalog();
        const built = buildTextPuzzles(data);
        if (cancelled) return;
        setCatalog(data);
        setPool(built);
        const played = readPlayedPuzzleIds(built);
        setPlayedPuzzleIds(played);
        setPuzzleIndex(pickNextPuzzleIndex(built, played, getTodayIndex(built.length)));
      } catch (error) {
        if (!cancelled) setCatalogError(error.message);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setView(resolveViewFromPath(location.pathname));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (catalogLoading) return undefined;
    async function refreshCatalog() {
      if (document.hidden) return;
      try {
        const data = await loadPuzzleCatalog();
        const built = buildTextPuzzles(data);
        if (!built.length) return;
        const prevSignature = catalog ? `${catalog.textPuzzleCount}:${catalog.textGroupBank?.length}` : "";
        const nextSignature = `${data.textPuzzleCount}:${data.textGroupBank?.length}`;
        if (prevSignature && prevSignature !== nextSignature) {
          setCatalog(data);
          setPool(built);
          setApiNotice(locale === "zh" ? "题库已更新，下一题将使用新题目。" : "Puzzle catalog updated. New puzzles apply on the next round.");
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

  useEffect(() => {
    setMessage(t.intro);
    resetPuzzleState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id, locale]);

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

  function setRoute(nextView) {
    setView(nextView);
    const paths = {
      game: "/",
      leaderboard: "/leaderboard/",
      contribute: "/contribute/",
      admin: "/admin/"
    };
    history.pushState(null, "", paths[nextView] ?? "/");
  }

  function toggleItem(item) {
    if (isComplete || solvedIds.includes(item.id)) return;
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
      return locale === "zh"
        ? `红鲱鱼出现：你摸到了「${counts[0].name}」的边，但有一个项目在误导你。`
        : `Red herring: you are close to "${counts[0].name}", but one item is pulling you away.`;
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
        submitScore();
      } else {
        setMessage(locale === "zh" ? `答对一组：${matched.name}` : `Correct group: ${localizePuzzleTerm(matched.name, locale, englishTerms)}`);
      }
      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setMessage(nextMistakes >= maxMistakes ? t.out : nearMissMessage());
    setBoardShake(true);
    setTimeout(() => setBoardShake(false), 420);
  }

  function shuffleActiveItems() {
    const activeIds = new Set(activeItems.map((item) => item.id));
    setSelected((current) => current.filter((id) => activeIds.has(id)));
    setBoardShuffleSeed((current) => current + 1);
    setMessage(locale === "zh" ? "已打乱未解锁项目。" : "Unsolved items shuffled.");
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
    const nextIndex = pickNextPuzzleIndex(pool, playedPuzzleIds, puzzleIndex + 1);
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
        throw new Error(locale === "zh" ? "最少填写 1 组，每组 4 个词。" : "Add at least one group with exactly four words.");
      }
      if (filledGroups.length > 10) {
        throw new Error(locale === "zh" ? "一次最多提交 10 组。" : "You can submit at most 10 groups at a time.");
      }
      if (filledGroups.some((group) => !group.name || group.words.length !== 4)) {
        throw new Error(locale === "zh" ? "每个已填写分组必须有组名且恰好 4 个词。" : "Each filled group needs a name and exactly four words.");
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

  async function updateSubmission(id, status) {
    try {
      await api(`/api/admin/puzzles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      loadAdmin();
    } catch (error) {
      setApiNotice(error.message);
    }
  }

  async function shareResult() {
    const report = `${t.appName} ${puzzleLabel(puzzle, locale)}\n${solved.length}/4\n${t.mistakes}: ${mistakes}\n${t.abstract}: ${abstractGroup ? localizePuzzleTerm(abstractGroup.name, locale, englishTerms) : "-"}\nhttps://nanamicat.com`;
    if (navigator.share) {
      await navigator.share({ text: report }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(report);
    setMessage(locale === "zh" ? "结果已复制。" : "Result copied.");
  }

  if (catalogLoading) {
    return (
      <main className="page page-loading" role="status" aria-live="polite">
        <p>{locale === "zh" ? "正在加载题库…" : "Loading puzzles…"}</p>
      </main>
    );
  }

  if (catalogError || !pool.length) {
    return (
      <main className="page page-loading" role="alert">
        <p>{catalogError || (locale === "zh" ? "题库加载失败。" : "Failed to load puzzles.")}</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          {locale === "zh" ? "重试" : "Retry"}
        </button>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="app-header">
        <section className="hero">
          <div className="brand-lockup">
            <NanamiCatMascot size="gameHeader" className={mascotBounce ? "mascot-bouncing" : ""} />
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
            <button className="ghost" type="button" onClick={() => setLocale(locale === "zh" ? "en" : "zh")}>
              <Globe2 size={15} /> {t.language}
            </button>
            <button className="ghost" type="button" onClick={() => setHelpOpen(true)}>
              <HelpCircle size={15} /> {t.help}
            </button>
          </div>
        </section>

        <nav className="topnav" aria-label="Primary">
          {[
            ["game", t.appName, Sparkles],
            ["leaderboard", t.leaderboard, Trophy],
            ["contribute", t.contribute, PenLine]
          ].map(([id, label, Icon]) => (
            <button key={id} type="button" className={view === id ? "active" : ""} onClick={() => setRoute(id)}>
              <Icon size={16} /> {label}
            </button>
          ))}
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

          <section className="game-workspace">
            <aside className="game-rail">
              <section className="status">
                <span>{t.mistakes}</span>
                <strong aria-label={`${remainingMistakes} remaining`}>{"●".repeat(remainingMistakes)}{"○".repeat(maxMistakes - remainingMistakes)}</strong>
              </section>
              <section className="status">
                <span>{t.hint}</span>
                <strong aria-label={`${hintBalance} hints remaining`}>{hintBalance}</strong>
              </section>

            </aside>

            <section className="game-stage">
              <p className="message" role="status" aria-live="polite">{message}</p>

              <div className="board-doodle-wrap">
                <svg className="board-doodle" viewBox="0 0 400 320" fill="none" aria-hidden="true" preserveAspectRatio="none">
                  {/* Crayon scribble lines */}
                  <path d="M18 260 Q60 240 110 255 Q160 270 200 248" stroke="var(--crayon-blue)" strokeWidth="2.5" strokeOpacity="0.14" strokeLinecap="round" fill="none" />
                  <path d="M320 30 Q350 55 370 90 Q385 120 365 150" stroke="var(--crayon-pink)" strokeWidth="2.5" strokeOpacity="0.14" strokeLinecap="round" fill="none" />
                  <path d="M30 60 Q55 45 80 62" stroke="var(--crayon-green)" strokeWidth="2.2" strokeOpacity="0.18" strokeLinecap="round" fill="none" />
                  <path d="M350 280 Q370 265 390 278" stroke="var(--crayon-orange)" strokeWidth="2.2" strokeOpacity="0.18" strokeLinecap="round" fill="none" />
                  {/* Stars */}
                  <text x="8" y="28" fontSize="14" fill="var(--crayon-yellow)" opacity="0.5" fontFamily="sans-serif">★</text>
                  <text x="374" y="310" fontSize="12" fill="var(--crayon-pink)" opacity="0.45" fontFamily="sans-serif">★</text>
                  <text x="182" y="14" fontSize="10" fill="var(--crayon-blue)" opacity="0.4" fontFamily="sans-serif">✦</text>
                  {/* Dots */}
                  <circle cx="395" cy="42" r="4" fill="var(--crayon-green)" opacity="0.3" />
                  <circle cx="12" cy="298" r="4" fill="var(--crayon-purple)" opacity="0.28" />
                  <circle cx="200" cy="310" r="3" fill="var(--crayon-orange)" opacity="0.25" />
                  {/* Zigzag decoration top-right */}
                  <path d="M340 8 L350 16 L360 8 L370 16 L380 8" stroke="var(--crayon-yellow)" strokeWidth="2" strokeOpacity="0.35" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {/* Wavy bottom decoration */}
                  <path d="M60 312 Q80 304 100 312 Q120 320 140 312 Q160 304 180 312" stroke="var(--crayon-pink)" strokeWidth="1.8" strokeOpacity="0.2" strokeLinecap="round" fill="none" />
                </svg>
                <section className={`board${boardShake ? " board-shaking" : ""}`} aria-label="Puzzle board">
                  {activeItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={selected.includes(item.id) ? "tile selected" : "tile"}
                      onClick={() => toggleItem(item)}
                      aria-pressed={selected.includes(item.id)}
                      aria-label={itemLabel(item, locale, englishTerms)}
                    >
                      {itemLabel(item, locale, englishTerms)}
                    </button>
                  ))}
                </section>
              </div>

              <section className="controls-split" aria-label="Game controls">
                {!isComplete && (
                  <>
                    <button type="button" className="controls-submit primary" onClick={submitGuess} disabled={selected.length !== 4}><Check size={18} /> {t.submit}</button>
                    <div className="controls-grid">
                      <button type="button" onClick={useHint} disabled={hintBalance <= 0}><HelpCircle size={16} /> {t.hint} ({hintBalance})</button>
                      <button type="button" onClick={shuffleActiveItems}><Dices size={16} /> {t.shuffle}</button>
                      <button type="button" onClick={() => { setSelected([]); setMessage(t.clearedSelection); }} disabled={!selected.length}><RotateCcw size={16} /> {t.clear}</button>
                      <button type="button" onClick={nextPuzzle}>{t.next}</button>
                    </div>
                  </>
                )}
              </section>

              {isComplete && (
                <>
                  {abstractGroup && (
                    <section className={`celebration-card level-${abstractGroup.level === 4 ? "purple" : abstractGroup.level === 3 ? "blue" : abstractGroup.level === 2 ? "green" : "yellow"}`} aria-label={t.abstract}>
                      <NanamiCatMascot size="celebration" showCelebration={true} />
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
                          <NanamiCatMascot size="mini" />
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
                    <button type="button" onClick={shareResult}><Share2 size={16} /> {t.share}</button>
                  </section>
                </>
              )}
            </section>
          </section>
        </>
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
                  <NanamiCatMascot size="empty" className="mascot-bob" />
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <h2>{t.submitPuzzle}</h2>
                <NanamiCatMascot size="header" />
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
                        <strong>{group.name || `${t.groupName} ${index + 1}`}</strong>
                        <p>{t.adminGroupWords}：{(group.words || []).join(" · ")}</p>
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
              <NanamiCatMascot size="mini" />
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

    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
