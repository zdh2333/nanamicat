import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  Dices,
  Globe2,
  HelpCircle,
  Maximize2,
  Palette,
  PenLine,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  X
} from "lucide-react";
import "./styles.css";

const maxMistakes = 4;
const textPuzzleCount = 100;

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
      <div className="mascot-card">
        <img src={src} alt="NanamiCat Mascot" className={`mascot-card-img ${className}`.trim()} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="NanamiCat Mascot"
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
    appName: "四格寻踪",
    kicker: "每日分类谜题",
    language: "English",
    help: "玩法说明",
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
    needsName: "设置昵称后会把通关写入排行榜。",
    abstract: "本题最抽象的一组",
    contributionLead: "最少填写 1 组，每组 4 个词，投稿会先进入 pending 状态，方便开发者审核后编入题库。",
    leaderboardLead: "留下昵称后，通关可累计积分。",
    adminLead: "后台由 Cloudflare Access 保护，只给开发者查看。",
    emptyLeaderboard: "还没有成绩，先通关一题。",
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
    appName: "FourFind",
    kicker: "Daily category puzzle",
    language: "中文",
    help: "Rules",
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
    needsName: "Set a nickname to write clears to the leaderboard.",
    abstract: "Most abstract group",
    contributionLead: "Submit at least one group with four words. Submissions are saved as pending for developer review.",
    leaderboardLead: "Set a nickname to save your puzzle score.",
    adminLead: "Admin is protected by Cloudflare Access and is only visible to developers.",
    emptyLeaderboard: "No scores yet. Clear a puzzle first.",
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

const textGroupBank = [
  { level: 1, name: "早餐主食", words: ["油条", "包子", "豆浆", "烧饼"] },
  { level: 1, name: "火锅食材", words: ["鸭血", "毛肚", "黄喉", "肥牛"] },
  { level: 1, name: "传统节日", words: ["春节", "清明", "端午", "中秋"] },
  { level: 1, name: "中国城市", words: ["北京", "上海", "广州", "成都"] },
  { level: 1, name: "出行方式", words: ["地铁", "公交", "骑行", "打车"] },
  { level: 1, name: "厨房工具", words: ["菜刀", "砧板", "锅铲", "漏勺"] },
  { level: 1, name: "校园空间", words: ["教室", "操场", "食堂", "图书馆"] },
  { level: 1, name: "水果", words: ["苹果", "香蕉", "葡萄", "西瓜"] },
  { level: 1, name: "颜色", words: ["赤", "橙", "青", "紫"] },
  { level: 1, name: "衣物", words: ["衬衫", "外套", "围巾", "手套"] },
  { level: 1, name: "运动项目", words: ["足球", "篮球", "羽毛球", "乒乓球"] },
  { level: 1, name: "乐器", words: ["钢琴", "吉他", "笛子", "鼓"] },
  { level: 2, name: "古代书写材料", words: ["竹简", "帛书", "宣纸", "碑刻"] },
  { level: 2, name: "网络互动", words: ["点赞", "转发", "评论", "收藏"] },
  { level: 2, name: "电影镜头", words: ["特写", "长镜", "推轨", "摇镜"] },
  { level: 2, name: "项目流程", words: ["立项", "排期", "上线", "验收"] },
  { level: 2, name: "系统状态", words: ["启动", "运行", "暂停", "恢复"] },
  { level: 2, name: "安全动作", words: ["认证", "授权", "加密", "审计"] },
  { level: 2, name: "叙事结构", words: ["开端", "铺垫", "转折", "收束"] },
  { level: 2, name: "城市设施", words: ["路灯", "井盖", "站牌", "护栏"] },
  { level: 3, name: "不可见成本", words: ["维护", "折旧", "延迟", "机会"] },
  { level: 3, name: "反馈类型", words: ["正向", "负向", "即时", "滞后"] },
  { level: 3, name: "边界动作", words: ["过滤", "隔离", "映射", "转译"] },
  { level: 3, name: "秩序形成", words: ["排队", "编号", "分层", "归档"] },
  { level: 3, name: "连接两端", words: ["桥", "接口", "翻译", "中介"] },
  { level: 3, name: "容器与被容纳", words: ["壳", "匣", "港湾", "文件夹"] },
  { level: 3, name: "镜像与对称", words: ["倒影", "双关", "复写", "平衡"] },
  { level: 3, name: "身份凭证", words: ["徽章", "签名", "指纹", "密钥"] },
  { level: 3, name: "压缩的信息", words: ["摘要", "图标", "缩略图", "索引"] },
  { level: 3, name: "表面隐藏结构", words: ["皮肤", "界面", "包装", "标题"] },
  { level: 4, name: "以限制制造自由", words: ["格律", "棋盘", "预算", "协议"] },
  { level: 4, name: "把连续切成离散", words: ["帧", "刻度", "章节", "像素"] },
  { level: 4, name: "先承诺后兑现", words: ["押金", "期权", "伏笔", "预约"] },
  { level: 4, name: "自身也是地图", words: ["目录", "索引", "导航", "坐标系"] },
  { level: 4, name: "用失败校准成功", words: ["试错", "回滚", "复盘", "对照组"] },
  { level: 4, name: "把关系伪装成物", words: ["货币", "合同", "名片", "证书"] },
  { level: 4, name: "被观看改变自身", words: ["表演", "排名", "直播", "测评"] },
  { level: 4, name: "用重复制造差异", words: ["排练", "迭代", "复刻", "循环"] },
  { level: 4, name: "局部代表整体", words: ["样本", "徽标", "切片", "提要"] },
  { level: 4, name: "秩序依赖例外", words: ["豁免", "假日", "后门", "特例"] }
];

const puzzleThemes = [
  "烟火中国", "街头日常", "纸上风物", "系统背面", "意义滑移", "抽象关系", "内在牵引", "隐喻机器", "城市缝隙", "屏幕生活",
  "旧物新义", "时间暗线", "边界游戏", "秩序与例外", "声音地图", "人情规则", "手艺与算法", "观看方式", "流动结构", "记忆容器"
];

const redHerringNotes = [
  "有些词共享场景，但真正分组看的是用途。",
  "有一组会被近义动作干扰，别只看字面。",
  "两组都像工具，关键差别在是否承担连接。",
  "注意红鲱鱼：一个词看似同类，其实属于更抽象的关系。",
  "这题故意让日常词和系统词互相靠近。",
  "不要只按名词分类，试着看动作和结构。"
];


const englishPuzzleTerms = {
  "早餐主食": "Breakfast staples", "油条": "Fried dough", "包子": "Steamed bun", "豆浆": "Soy milk", "烧饼": "Baked flatbread",
  "火锅食材": "Hot pot ingredients", "鸭血": "Duck blood", "毛肚": "Beef tripe", "黄喉": "Aorta", "肥牛": "Sliced beef",
  "传统节日": "Traditional festivals", "春节": "Spring Festival", "清明": "Qingming", "端午": "Dragon Boat", "中秋": "Mid-Autumn",
  "中国城市": "Chinese cities", "北京": "Beijing", "上海": "Shanghai", "广州": "Guangzhou", "成都": "Chengdu",
  "出行方式": "Ways to travel", "地铁": "Metro", "公交": "Bus", "骑行": "Cycling", "打车": "Taxi",
  "厨房工具": "Kitchen tools", "菜刀": "Cleaver", "砧板": "Cutting board", "锅铲": "Spatula", "漏勺": "Slotted spoon",
  "校园空间": "Campus spaces", "教室": "Classroom", "操场": "Playground", "食堂": "Cafeteria", "图书馆": "Library",
  "水果": "Fruit", "苹果": "Apple", "香蕉": "Banana", "葡萄": "Grape", "西瓜": "Watermelon",
  "颜色": "Colors", "赤": "Red", "橙": "Orange", "青": "Cyan", "紫": "Purple",
  "衣物": "Clothing", "衬衫": "Shirt", "外套": "Coat", "围巾": "Scarf", "手套": "Gloves",
  "运动项目": "Sports", "足球": "Football", "篮球": "Basketball", "羽毛球": "Badminton", "乒乓球": "Table tennis",
  "乐器": "Musical instruments", "钢琴": "Piano", "吉他": "Guitar", "笛子": "Flute", "鼓": "Drum",
  "古代书写材料": "Ancient writing media", "竹简": "Bamboo slips", "帛书": "Silk manuscript", "宣纸": "Rice paper", "碑刻": "Stone inscription",
  "网络互动": "Online interactions", "点赞": "Like", "转发": "Repost", "评论": "Comment", "收藏": "Bookmark",
  "电影镜头": "Film shots", "特写": "Close-up", "长镜": "Long take", "推轨": "Dolly shot", "摇镜": "Pan shot",
  "项目流程": "Project workflow", "立项": "Kickoff", "排期": "Scheduling", "上线": "Launch", "验收": "Acceptance",
  "系统状态": "System states", "启动": "Starting", "运行": "Running", "暂停": "Paused", "恢复": "Resuming",
  "安全动作": "Security actions", "认证": "Authentication", "授权": "Authorization", "加密": "Encryption", "审计": "Audit",
  "叙事结构": "Narrative structure", "开端": "Opening", "铺垫": "Setup", "转折": "Turning point", "收束": "Resolution",
  "城市设施": "City fixtures", "路灯": "Streetlight", "井盖": "Manhole cover", "站牌": "Bus stop sign", "护栏": "Guardrail",
  "不可见成本": "Invisible costs", "维护": "Maintenance", "折旧": "Depreciation", "延迟": "Delay", "机会": "Opportunity",
  "反馈类型": "Feedback types", "正向": "Positive", "负向": "Negative", "即时": "Immediate", "滞后": "Delayed",
  "边界动作": "Boundary operations", "过滤": "Filtering", "隔离": "Isolation", "映射": "Mapping", "转译": "Translation",
  "秩序形成": "Creating order", "排队": "Queueing", "编号": "Numbering", "分层": "Layering", "归档": "Archiving",
  "连接两端": "Connecting two sides", "桥": "Bridge", "接口": "Interface", "翻译": "Interpreter", "中介": "Mediator",
  "容器与被容纳": "Containers and contents", "壳": "Shell", "匣": "Case", "港湾": "Harbor", "文件夹": "Folder",
  "镜像与对称": "Mirrors and symmetry", "倒影": "Reflection", "双关": "Double meaning", "复写": "Copy", "平衡": "Balance",
  "身份凭证": "Identity credentials", "徽章": "Badge", "签名": "Signature", "指纹": "Fingerprint", "密钥": "Key",
  "压缩的信息": "Compressed information", "摘要": "Summary", "图标": "Icon", "缩略图": "Thumbnail", "索引": "Index",
  "表面隐藏结构": "Structure hidden by a surface", "皮肤": "Skin", "界面": "Interface", "包装": "Packaging", "标题": "Title",
  "以限制制造自由": "Freedom through constraints", "格律": "Meter", "棋盘": "Board", "预算": "Budget", "协议": "Protocol",
  "把连续切成离散": "Dividing a continuum", "帧": "Frame", "刻度": "Scale mark", "章节": "Chapter", "像素": "Pixel",
  "先承诺后兑现": "Promise now, deliver later", "押金": "Deposit", "期权": "Option", "伏笔": "Foreshadowing", "预约": "Reservation",
  "自身也是地图": "Things that are also maps", "目录": "Table of contents", "导航": "Navigation", "坐标系": "Coordinate system",
  "用失败校准成功": "Using failure to calibrate success", "试错": "Trial and error", "回滚": "Rollback", "复盘": "Retrospective", "对照组": "Control group",
  "把关系伪装成物": "Relationships disguised as objects", "货币": "Currency", "合同": "Contract", "名片": "Business card", "证书": "Certificate",
  "被观看改变自身": "Changed by being watched", "表演": "Performance", "排名": "Ranking", "直播": "Livestream", "测评": "Review",
  "用重复制造差异": "Difference through repetition", "排练": "Rehearsal", "迭代": "Iteration", "复刻": "Reproduction", "循环": "Loop",
  "局部代表整体": "Parts representing wholes", "样本": "Sample", "徽标": "Logo", "切片": "Slice", "提要": "Abstract",
  "秩序依赖例外": "Order depending on exceptions", "豁免": "Exemption", "假日": "Holiday", "后门": "Backdoor", "特例": "Special case",
  "烟火中国": "Everyday China", "街头日常": "Street life", "纸上风物": "Paper and culture", "系统背面": "Behind the system",
  "意义滑移": "Shifting meanings", "抽象关系": "Abstract relations", "内在牵引": "Hidden forces", "隐喻机器": "Metaphor machine",
  "城市缝隙": "Urban gaps", "屏幕生活": "Screen life", "旧物新义": "New meanings for old things", "时间暗线": "Threads of time",
  "边界游戏": "Boundary games", "秩序与例外": "Order and exceptions", "声音地图": "Map of sound", "人情规则": "Social rules",
  "手艺与算法": "Craft and algorithms", "观看方式": "Ways of seeing", "流动结构": "Structures in motion", "记忆容器": "Containers of memory",
  "收纳容器": "Storage containers", "方向移动": "Directional movement", "旧痕迹": "Old traces", "成双相似": "Matching pairs",
  "门窗边界": "Door and window edges", "小物件": "Small objects", "圆形循环": "Circular loops", "破损修补": "Damage and repair",
  "支撑结构": "Support structures", "外表材质": "Surface materials", "道路路径": "Road paths", "遮挡露出": "Hidden and revealed",
  "地面基础": "Ground foundations", "高处标志": "High-up signs", "连接工具": "Connecting tools", "证件标牌": "Badges and signs",
  "重复图案": "Repeated patterns", "安静空场": "Quiet empty scenes", "未来计划": "Future plans", "局部特写": "Detail close-ups",
  "被人观看": "Being watched", "框内限制": "Confined by frames", "手工差异": "Handmade variation", "水流稳定": "Steady water flow",
  "分格切片": "Grid slices", "镜面对称": "Mirror symmetry", "特殊例外": "Special exceptions", "等待兑现": "Waiting for delivery",
  "地图索引": "Map indexes", "声音重复": "Repeated sounds", "外壳保护": "Protective shells", "阶梯层级": "Stepped levels",
  "留白空处": "Blank spaces", "桥梁连接": "Bridge connections", "影子证据": "Shadow evidence", "单向方向": "One-way direction",
  "纹理表面": "Textured surfaces", "入口门槛": "Entrance thresholds", "框架边线": "Frame edges", "流线引导": "Flow-line guidance",
  "入口提示": "Entrance cues", "封存保管": "Sealed storage", "分层摆放": "Layered placement", "偏差标记": "Deviation marks",
  "身份标记": "Identity marks", "语言转译": "Language translation", "延迟反应": "Delayed reactions", "碎片拼合": "Fragment assembly",
  "几何秩序": "Geometric order", "自然痕迹": "Natural traces", "机械节奏": "Mechanical rhythm", "人工涂改": "Manual alterations",
  "向内聚拢": "Gathering inward", "向外扩散": "Spreading outward", "横向连接": "Horizontal connections", "纵向堆叠": "Vertical stacks",
  "锁和钥匙": "Locks and keys", "窗和视线": "Windows and sightlines", "环形循环": "Ring-shaped loops", "针头方向": "Needle directions",
  "植物种子": "Plant seeds", "根部支撑": "Root support", "枝叶展开": "Branches unfolding", "果实收成": "Fruit harvest",
  "前景遮挡": "Foreground occlusion", "背景暗示": "Background hints", "边缘线索": "Edge clues", "中心空缺": "Missing centers",
  "水面倒影": "Water reflections", "沙地足迹": "Footprints in sand", "墙面裂缝": "Wall cracks", "纸面折痕": "Paper creases",
  "握手连接": "Handshake connections", "接口对接": "Interface matching", "信号放大": "Signal amplification", "噪声过滤": "Noise filtering",
  "开头标记": "Opening markers", "过程重复": "Process repetition", "结尾回收": "Ending callbacks", "额外彩蛋": "Bonus details"
};

function localizePuzzleTerm(value, locale) {
  return locale === "en" ? englishPuzzleTerms[value] ?? value : value;
}

function puzzleLabel(puzzle, locale) {
  const number = Number(puzzle.id.split("-").at(-1));
  if (locale === "en") return `Text puzzle ${number}`;
  return puzzle.label;
}

function puzzleTheme(puzzle, locale) {
  return localizePuzzleTerm(puzzle.theme, locale);
}

function itemLabel(item, locale) {
  if (item.label) return localizePuzzleTerm(item.label, locale);
  if (locale === "zh") return item.alt;
  const match = item.alt.match(/^(.*) (\d+)$/);
  if (!match) return localizePuzzleTerm(item.alt, locale);
  return `${localizePuzzleTerm(match[1], locale)} ${match[2]}`;
}

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

const playedPuzzleStorageKey = "nanamicat.playedPuzzleIds";

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

function textItem(label, puzzleId) {
  return { id: `${puzzleId}-${label}`, label };
}

function buildTextPuzzles() {
  return Array.from({ length: textPuzzleCount }, (_, index) => {
    const difficulty = Math.min(4, Math.floor(index / 25) + 1);
    const candidates = textGroupBank.filter((group) => group.level <= difficulty);
    const offsets = [0, 7, 19, 31].map((step) => (index * 5 + step + difficulty * 3) % candidates.length);
    const groups = offsets.map((groupIndex, groupSlot) => {
      const source = candidates[groupIndex];
      return {
        name: source.name,
        level: Math.min(4, Math.max(source.level, groupSlot + 1)),
        items: source.words.map((word) => textItem(word, `text-${index + 1}-${groupSlot}`))
      };
    });

    return {
      id: `text-${String(index + 1).padStart(3, "0")}`,
      label: `文字题 ${index + 1}`,
      theme: puzzleThemes[index % puzzleThemes.length],
      type: "text",
      difficulty,
      redHerring: redHerringNotes[index % redHerringNotes.length],
      groups
    };
  });
}

const textPuzzles = buildTextPuzzles();

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function getTodayIndex(max) {
  const now = new Date();
  return (now.getUTCFullYear() * 372 + now.getUTCMonth() * 31 + now.getUTCDate()) % max;
}

function mostAbstractGroup(groups) {
  return [...groups].sort((a, b) => b.level - a.level)[0];
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      }
    });
  } catch {
    throw new Error("网络连接失败，请检查网络后重试。");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallback = response.status >= 500
      ? "服务器暂时不可用，请稍后再试。"
      : "请求失败，请稍后重试。";
    throw new Error(payload.error || fallback);
  }
  return payload;
}

function App() {
  const pool = textPuzzles;
  const [playedPuzzleIds, setPlayedPuzzleIds] = useState(() => readPlayedPuzzleIds(pool));
  const [locale, setLocale] = useState(() => getStored("nanamicat.locale", "zh"));
  const [theme, setTheme] = useState(() => getStored("nanamicat.theme", "default"));
  const [view, setView] = useState(() => (location.pathname.startsWith("/admin") ? "admin" : "game"));
  const [puzzleIndex, setPuzzleIndex] = useState(() => pickNextPuzzleIndex(pool, readPlayedPuzzleIds(pool), getTodayIndex(pool.length)));
  const [selectedDifficulty, setSelectedDifficulty] = useState(1);
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [nickname, setNickname] = useState(() => getStored("nanamicat.nickname", ""));
  const [playerId, setPlayerId] = useState(() => getStored("nanamicat.playerId", ""));
  const [leaderboard, setLeaderboard] = useState([]);
  const [adminPuzzles, setAdminPuzzles] = useState([]);
  const [adminScores, setAdminScores] = useState([]);
  const [form, setForm] = useState(() => ({
    title: "",
    email: "",
    groups: [{ name: "", words: "" }]
  }));
  const [apiNotice, setApiNotice] = useState("");

  const t = copy[locale];
  const currentIndex = puzzleIndex;
  const puzzle = pool[currentIndex % pool.length];
  const items = useMemo(() => shuffle(puzzle.groups.flatMap((group) => group.items)), [puzzle.id]);
  const solvedIds = solved.flatMap((group) => group.items.map((item) => item.id));
  const activeItems = items.filter((item) => !solvedIds.includes(item.id));
  const remainingMistakes = Math.max(0, maxMistakes - mistakes);
  const isComplete = solved.length === puzzle.groups.length;
  const abstractGroup = isComplete ? mostAbstractGroup(puzzle.groups) : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setStored("nanamicat.theme", theme);
  }, [theme]);

  useEffect(() => {
    setStored("nanamicat.locale", locale);
  }, [locale]);

  useEffect(() => {
    let normalized = playedPuzzleIds.filter((id) => pool.some((item) => item.id === id));
    if (normalized.length >= pool.length) normalized = [];
    if (normalized.length !== playedPuzzleIds.length) {
      setPlayedPuzzleIds(normalized);
      writePlayedPuzzleIds(normalized);
      return;
    }
    if (!normalized.includes(puzzle.id)) {
      const next = [...normalized, puzzle.id];
      setPlayedPuzzleIds(next);
      writePlayedPuzzleIds(next);
    }
  }, [playedPuzzleIds, puzzle.id, pool]);

  useEffect(() => {
    setMessage(t.intro);
    resetPuzzleState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id, locale]);

  useEffect(() => {
    loadLeaderboard();
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
    const path = nextView === "admin" ? "/admin/" : "/";
    history.replaceState(null, "", path);
  }

  function chooseDifficulty(level) {
    setSelectedDifficulty(level);
    const nextIndex = pickNextPuzzleIndex(
      pool,
      playedPuzzleIds,
      puzzleIndex + 1,
      (item) => item.difficulty === level
    );
    setPuzzleIndex(nextIndex);
    resetPuzzleState();
    setMessage(
      locale === "zh"
        ? `切换到「${difficultyLabel(level, locale)}」类题目。`
        : `Switched to ${difficultyLabel(level, locale)} puzzles.`
    );
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
        name: localizePuzzleTerm(group.name, locale),
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
      if (nextSolved.length === puzzle.groups.length) {
        setMessage(t.complete);
        submitScore();
      } else {
        setMessage(locale === "zh" ? `答对一组：${matched.name}` : `Correct group: ${localizePuzzleTerm(matched.name, locale)}`);
      }
      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setMessage(nextMistakes >= maxMistakes ? t.out : nearMissMessage());
  }

  function shuffleActiveItems() {
    resetPuzzleState();
    setMessage(locale === "zh" ? "已重新打乱并重开本题。" : "Puzzle reset and shuffled.");
  }

  function useHint() {
    const unsolvedGroups = puzzle.groups.filter((group) => !solved.some((item) => item.name === group.name));
    if (!unsolvedGroups.length) return;
    const hintGroup = unsolvedGroups[hintIndex % unsolvedGroups.length];
    setHintIndex((current) => current + 1);
    setMessage(locale === "zh" ? `提示：有一组与「${hintGroup.name}」有关。${puzzle.redHerring}` : `Hint: one group relates to "${localizePuzzleTerm(hintGroup.name, locale)}".`);
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
        setApiNotice(locale === "zh" ? "昵称已保存。" : "Nickname saved.");
        loadLeaderboard();
      }
    } catch (error) {
      setApiNotice(error.message);
    }
  }

  async function loadLeaderboard() {
    try {
      const payload = await api("/api/leaderboard");
      setLeaderboard(payload.leaderboard ?? []);
    } catch (error) {
      setApiNotice(error.message);
    }
  }

  async function submitPuzzleForm(event) {
    event.preventDefault();
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
      if (filledGroups.some((group) => !group.name || group.words.length !== 4)) {
        throw new Error(locale === "zh" ? "每个已填写分组必须有组名且恰好 4 个词。" : "Each filled group needs a name and exactly four words.");
      }
      const payload = await api("/api/puzzles", {
        method: "POST",
        body: JSON.stringify({
          playerId: player?.id,
          nickname: nickname.trim() || "Guest",
          title: form.title.trim(),
          email: form.email.trim() || undefined,
          groups: filledGroups
        })
      });
      setForm({ title: "", email: "", groups: [{ name: "", words: "" }] });
      if (payload?.email?.attempted && payload?.email?.sent) {
        setApiNotice(t.thankYouEmailSent);
      } else if (form.email.trim()) {
        setApiNotice(t.thankYouEmailNotSent);
      } else {
        setApiNotice(t.submissionSavedPending);
      }
    } catch (error) {
      setApiNotice(error.message);
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
    const report = `${t.appName} ${puzzleLabel(puzzle, locale)}\n${solved.length}/4\n${t.mistakes}: ${mistakes}\n${t.abstract}: ${abstractGroup ? localizePuzzleTerm(abstractGroup.name, locale) : "-"}\nhttps://nanamicat.com`;
    if (navigator.share) {
      await navigator.share({ text: report }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(report);
    setMessage(locale === "zh" ? "结果已复制。" : "Result copied.");
  }

  return (
    <main className="page">
      <header className="app-header">
        <section className="hero">
          <div className="brand-lockup">
            <NanamiCatMascot size="gameHeader" />
            <div>
              <p className="kicker">{t.kicker}</p>
              <h1>{t.appName}</h1>
              <p className="meta">{puzzleLabel(puzzle, locale)} / {puzzleTheme(puzzle, locale)} / {difficultyLabel(puzzle.difficulty, locale)}</p>
            </div>
          </div>
          <div className="hero-tools">
            <button className="ghost" type="button" onClick={() => setLocale(locale === "zh" ? "en" : "zh")}>
              <Globe2 size={15} /> {t.language}
            </button>
            <button className="ghost" type="button" onClick={() => setMessage(t.intro)}>
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
              <div className="mascot-rail-decor" style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <NanamiCatMascot size="gameHeader" />
              </div>
              <section className="status">
                <span>{t.mistakes}</span>
                <strong aria-label={`${remainingMistakes} remaining`}>{"●".repeat(remainingMistakes)}{"○".repeat(maxMistakes - remainingMistakes)}</strong>
              </section>

              <section className="difficulty-strip" aria-label="Difficulty">
                {Object.entries(difficultyMeta).map(([level, meta]) => (
                  <button
                    className={`difficulty-chip ${meta.className}${Number(level) === selectedDifficulty ? " active" : ""}`}
                    type="button"
                    key={level}
                    onClick={() => chooseDifficulty(Number(level))}
                    aria-pressed={Number(level) === selectedDifficulty}
                  >
                    <strong>{meta[locale]}</strong>
                  </button>
                ))}
              </section>

            </aside>

            <section className="game-stage">
              <p className="message" role="status">{message}</p>

              <section className="board" aria-label="Puzzle board">
                {activeItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={selected.includes(item.id) ? "tile selected" : "tile"}
                    onClick={() => toggleItem(item)}
                    aria-pressed={selected.includes(item.id)}
                  >
                    {itemLabel(item, locale)}
                  </button>
                ))}
              </section>

              <section className="controls-split" aria-label="Game controls">
                {isComplete ? (
                  <>
                    <button type="button" className="controls-submit primary" onClick={nextPuzzle}>{t.nextAfterComplete}</button>
                    <button type="button" className="controls-share" onClick={shareResult}><Share2 size={16} /> {t.share}</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="controls-submit primary" onClick={submitGuess} disabled={selected.length !== 4}><Check size={18} /> {t.submit}</button>
                    <div className="controls-grid">
                      <button type="button" onClick={useHint}><HelpCircle size={16} /> {t.hint}</button>
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
                        <h2>{localizePuzzleTerm(abstractGroup.name, locale)}</h2>
                      </div>
                    </section>
                  )}

                  <section className="solved" aria-live="polite" aria-label="Solved groups">
                    {solved.map((group) => {
                      const meta = difficultyMeta[group.level] ?? difficultyMeta[4];
                      return (
                        <article className={`solved-item ${meta.className}`} key={group.name}>
                          <NanamiCatMascot size="mini" />
                          <div>
                            <h2>{localizePuzzleTerm(group.name, locale)}</h2>
                            <p>{group.items.map((item) => itemLabel(item, locale)).join(" / ")}</p>
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
                  <tr key={row.id}>
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
              <NanamiCatMascot size="empty" />
              <p className="empty">{t.emptyLeaderboard}</p>
            </div>
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
              {t.puzzleTitle}
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={80} />
            </label>
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
              {form.groups.map((group, index) => (
                <fieldset key={index} className="group-card">
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
                    value={group.name}
                    onChange={(event) => {
                      const groups = [...form.groups];
                      groups[index] = { ...groups[index], name: event.target.value };
                      setForm({ ...form, groups });
                    }}
                  />
                  <textarea
                    value={group.words}
                    onChange={(event) => {
                      const groups = [...form.groups];
                      groups[index] = { ...groups[index], words: event.target.value };
                      setForm({ ...form, groups });
                    }}
                    placeholder={t.words}
                  />
                </fieldset>
              ))}
            </div>
            {form.groups.length < 4 && (
              <button
                type="button"
                className="add-group"
                onClick={() => setForm({ ...form, groups: [...form.groups, { name: "", words: "" }] })}
              >
                {t.addGroup}
              </button>
            )}
            <button type="submit" className="primary">{t.savePuzzle}</button>
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
          <h3>{t.adminPuzzles}</h3>
          <div className="admin-list">
            {adminPuzzles.map((item) => (
              <article key={item.id} className="admin-item">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.nickname} / {new Date(item.created_at).toLocaleString()}</p>
                  {item.contact_email ? <p>{item.contact_email}</p> : null}
                  <pre>{JSON.stringify(JSON.parse(item.groups_json), null, 2)}</pre>
                </div>
                <select value={item.status} onChange={(event) => updateSubmission(item.id, event.target.value)}>
                  <option value="pending">{t.statusPending}</option>
                  <option value="reviewed">{t.statusReviewed}</option>
                  <option value="included">{t.statusIncluded}</option>
                  <option value="rejected">{t.statusRejected}</option>
                </select>
              </article>
            ))}
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

      <aside className="sponsor" aria-label={t.sponsorLabel}>
        <div className="sponsor-copy">
          <p className="sponsor-label">{t.sponsorLabel}</p>
          <h2>{t.sponsorTitle}</h2>
          <p>{t.sponsorBody}</p>
        </div>
        <figure className="pay-code">
          <button className="pay-zoom" type="button" onClick={() => setPayOpen(true)} aria-label={t.zoomPay}>
            <img src="/wechat-pay.jpg" alt={t.payCaption} />
            <span><Maximize2 size={14} /> {t.zoomPay}</span>
          </button>
          <figcaption>{t.payCaption}</figcaption>
        </figure>
      </aside>

      {payOpen && (
        <div className="pay-modal" role="dialog" aria-modal="true" aria-label={t.payCaption}>
          <button className="pay-modal-backdrop" type="button" aria-label="Close payment overlay" onClick={() => setPayOpen(false)} />
          <div className="pay-modal-panel">
            <button className="pay-modal-close" type="button" onClick={() => setPayOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
            <img src="/wechat-pay.jpg" alt={t.payCaption} />
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
