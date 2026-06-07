// Expand the text puzzle bank and assemble N unique puzzles.
// - Adds curated NEW_GROUPS (globally-unique words enforced).
// - Each puzzle picks one group per level (L1..L4) -> ascending slots -> 4 colors.
// - Deterministic (seeded), re-runnable. Writes the iOS source of truth;
//   run `npm run sync:puzzles` afterwards to propagate to public/ and docs/.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "NanamiCat-iOS/NanamiCat/Resources/puzzle-data.json");
const TARGET = Number(process.argv[2] || 500);

// ── New groups (content). 4 words each; words must be globally unique. ──────
const NEW_GROUPS = [
  // ===== L1 具体日常 =====
  { level: 1, id: "vegetables", name: "蔬菜", words: ["白菜", "菠菜", "茄子", "黄瓜"] },
  { level: 1, id: "seafood", name: "海鲜", words: ["螃蟹", "龙虾", "扇贝", "鱿鱼"] },
  { level: 1, id: "birds", name: "鸟类", words: ["麻雀", "喜鹊", "燕子", "老鹰"] },
  { level: 1, id: "flowers", name: "花卉", words: ["牡丹", "玫瑰", "菊花", "荷花"] },
  { level: 1, id: "trees", name: "树木", words: ["松树", "柳树", "枫树", "银杏"] },
  { level: 1, id: "stationery", name: "文具", words: ["铅笔", "橡皮", "直尺", "卷笔刀"] },
  { level: 1, id: "furniture", name: "家具", words: ["沙发", "衣柜", "书桌", "床头柜"] },
  { level: 1, id: "weather", name: "天气现象", words: ["晴天", "阴天", "雷暴", "冰雹"] },
  { level: 1, id: "beverages", name: "饮品", words: ["可乐", "雪碧", "咖啡", "果汁"] },
  { level: 1, id: "condiments", name: "调味料", words: ["食盐", "白糖", "酱油", "香醋"] },
  { level: 1, id: "pastries", name: "中式糕点", words: ["月饼", "蛋挞", "桃酥", "绿豆糕"] },
  { level: 1, id: "occupations", name: "职业", words: ["医生", "教师", "警察", "厨师"] },
  { level: 1, id: "zoo-animals", name: "动物园", words: ["大象", "长颈鹿", "老虎", "猴子"] },
  { level: 1, id: "home-appliances", name: "家用电器", words: ["冰箱", "洗衣机", "空调", "微波炉"] },
  { level: 1, id: "bathroom-items", name: "卫浴用品", words: ["牙刷", "毛巾", "香皂", "浴帽"] },
  { level: 1, id: "tableware", name: "餐具", words: ["饭碗", "瓷碟", "筷子", "汤勺"] },
  { level: 1, id: "zodiac", name: "生肖", words: ["生肖鼠", "生肖牛", "生肖虎", "生肖兔"] },
  { level: 1, id: "compass-directions", name: "方位", words: ["正东", "正南", "正西", "正北"] },
  { level: 1, id: "metals", name: "金属", words: ["黄金", "白银", "紫铜", "生铁"] },
  { level: 1, id: "grains", name: "谷物", words: ["大米", "小麦", "玉米", "高粱"] },
  { level: 1, id: "nuts", name: "坚果", words: ["核桃", "瓜子", "杏仁", "腰果"] },
  { level: 1, id: "dairy", name: "乳制品", words: ["酸奶", "奶酪", "黄油", "奶粉"] },
  { level: 1, id: "school-subjects", name: "学科", words: ["语文", "数学", "英语", "物理"] },
  { level: 1, id: "body-parts", name: "五官", words: ["眼睛", "鼻子", "耳朵", "嘴巴"] },
  { level: 1, id: "insects", name: "昆虫", words: ["蝴蝶", "蜜蜂", "蚂蚁", "蜻蜓"] },
  { level: 1, id: "footwear", name: "鞋类", words: ["皮鞋", "凉鞋", "拖鞋", "靴子"] },
  { level: 1, id: "tropical-fruits", name: "热带水果", words: ["芒果", "菠萝", "榴莲", "椰子"] },
  { level: 1, id: "root-vegetables", name: "根茎菜", words: ["萝卜", "土豆", "辣椒", "冬瓜"] },
  { level: 1, id: "cold-desserts", name: "冷甜品", words: ["奶冻", "果冻", "冰淇淋", "慕斯"] },
  { level: 1, id: "toys", name: "童年玩具", words: ["积木", "风筝", "陀螺", "弹珠"] },
  { level: 1, id: "seasons", name: "四季", words: ["初春", "盛夏", "深秋", "寒冬"] },
  { level: 1, id: "planets", name: "行星", words: ["水星", "金星", "火星", "木星"] },
  { level: 1, id: "famous-mountains", name: "名山", words: ["泰山", "华山", "黄山", "衡山"] },
  { level: 1, id: "rivers", name: "河流", words: ["长江", "黄河", "珠江", "淮河"] },
  { level: 1, id: "world-cities", name: "外国都市", words: ["东京", "巴黎", "伦敦", "纽约"] },
  { level: 1, id: "tea-types", name: "茶类", words: ["红茶", "绿茶", "乌龙", "普洱"] },

  // ===== L2 领域常识 =====
  { level: 2, id: "chess-pieces", name: "象棋棋子", words: ["将帅", "车马", "炮兵", "士象"] },
  { level: 2, id: "photography-terms", name: "摄影参数", words: ["光圈", "快门", "焦距", "白平衡"] },
  { level: 2, id: "music-notation", name: "乐谱符号", words: ["音符", "休止", "升号", "连线"] },
  { level: 2, id: "cooking-methods", name: "烹饪手法", words: ["爆炒", "清蒸", "红烧", "油炸"] },
  { level: 2, id: "weather-forecast", name: "气象预报", words: ["气温", "湿度", "风速", "气压"] },
  { level: 2, id: "bank-actions", name: "银行业务", words: ["存款", "取款", "转账", "贷款"] },
  { level: 2, id: "court-roles", name: "法庭角色", words: ["法官", "原告", "被告", "律师"] },
  { level: 2, id: "hospital-departments", name: "医院科室", words: ["内科", "外科", "儿科", "急诊"] },
  { level: 2, id: "stage-crew", name: "舞台幕后", words: ["导演", "灯光", "道具", "场记"] },
  { level: 2, id: "newspaper-sections", name: "报纸版块", words: ["头条", "社论", "副刊", "广告栏"] },
  { level: 2, id: "library-actions", name: "图书馆动作", words: ["借阅", "续借", "归还", "预约书"] },
  { level: 2, id: "traffic-signals", name: "交通信号", words: ["红灯", "绿灯", "斑马线", "限速牌"] },
  { level: 2, id: "post-office", name: "邮政流程", words: ["寄件", "分拣", "投递", "签收"] },
  { level: 2, id: "weather-disasters", name: "自然灾害", words: ["台风", "地震", "洪水", "干旱"] },
  { level: 2, id: "exam-process", name: "考试流程", words: ["报名", "应考", "阅卷", "放榜"] },
  { level: 2, id: "restaurant-flow", name: "餐厅流程", words: ["点单", "下厨", "上菜", "结账"] },
  { level: 2, id: "garment-making", name: "服装工序", words: ["量体", "裁布", "缝制", "熨烫"] },
  { level: 2, id: "theater-genres", name: "戏曲行当", words: ["生角", "旦角", "净角", "丑角"] },
  { level: 2, id: "weather-sky", name: "天象", words: ["彩虹", "极光", "流星", "日晕"] },
  { level: 2, id: "printing-steps", name: "印刷工序", words: ["制版", "上墨", "压印", "装订"] },
  { level: 2, id: "farming-seasons", name: "农事", words: ["播种", "灌溉", "除草", "收割"] },
  { level: 2, id: "fire-drill", name: "消防动作", words: ["报警", "疏散", "灭火", "救援"] },
  { level: 2, id: "weather-wind", name: "风的等级", words: ["微风", "和风", "强风", "狂风"] },
  { level: 2, id: "broadcast-roles", name: "广播角色", words: ["主播", "嘉宾", "导播", "听众"] },
  { level: 2, id: "construction-trades", name: "建筑工种", words: ["瓦工", "木工", "电工", "焊工"] },
  { level: 2, id: "airport-flow", name: "机场流程", words: ["值机", "安检", "登机", "提取行李"] },
  { level: 2, id: "weather-clouds", name: "云的种类", words: ["积云", "层云", "卷云", "雨云"] },
  { level: 2, id: "auction-flow", name: "拍卖流程", words: ["估价", "起拍", "竞价", "落槌"] },
  { level: 2, id: "election-flow", name: "选举流程", words: ["提名", "投票", "计票", "公示"] },
  { level: 2, id: "telescope-targets", name: "天文观测", words: ["星座", "月相", "彗星", "星云"] },
  { level: 2, id: "publishing-roles", name: "出版角色", words: ["作者", "编辑", "校对", "排版员"] },
  { level: 2, id: "garden-tools", name: "园艺工具", words: ["花铲", "喷壶", "修枝剪", "花盆"] },
  { level: 2, id: "weather-temp", name: "温度区间", words: ["严寒", "凉爽", "温暖", "酷热"] },
  { level: 2, id: "factory-line", name: "生产线", words: ["备料", "组装", "质检", "包装出库"] },
  { level: 2, id: "courtroom-flow", name: "庭审流程", words: ["开庭", "举证", "辩论", "宣判"] },
  { level: 2, id: "weather-precip", name: "降水形式", words: ["小雨", "暴雨", "细雪", "冻雨"] },

  // ===== L3 跨域关系 =====
  { level: 3, id: "delays-everywhere", name: "各种延迟", words: ["时差", "回声", "余震", "后劲"] },
  { level: 3, id: "thresholds", name: "临界点", words: ["沸点", "冰点", "上限", "底线"] },
  { level: 3, id: "amplifiers", name: "放大器", words: ["杠杆", "复利", "口碑", "扩音"] },
  { level: 3, id: "buffers", name: "缓冲带", words: ["缓存", "库存", "储蓄", "护城河"] },
  { level: 3, id: "filters-of-noise", name: "降噪", words: ["筛选", "屏蔽", "提纯", "静音"] },
  { level: 3, id: "anchors", name: "锚点", words: ["路标", "书签", "里程碑", "参照物"] },
  { level: 3, id: "switches", name: "开关", words: ["阀门", "闸口", "断路", "节流"] },
  { level: 3, id: "traces-left", name: "留下的痕迹", words: ["脚印", "水渍", "划痕", "余温"] },
  { level: 3, id: "shared-resources", name: "共享资源", words: ["井水", "公路", "频段", "草场"] },
  { level: 3, id: "feedback-loops", name: "回路", words: ["复盘会", "问卷", "评分", "回访"] },
  { level: 3, id: "invisible-glue", name: "看不见的黏合", words: ["信任", "习惯", "默契", "惯例"] },
  { level: 3, id: "bottlenecks", name: "瓶颈", words: ["关卡", "窄门", "审批", "排号"] },
  { level: 3, id: "proxies", name: "代理物", words: ["替身", "样板", "代言", "缩影"] },
  { level: 3, id: "decay-over-time", name: "随时间衰减", words: ["褪色", "生锈", "遗忘", "贬值"] },
  { level: 3, id: "early-signals", name: "前兆", words: ["征兆", "苗头", "预警", "风向"] },
  { level: 3, id: "hidden-layers", name: "隐藏层", words: ["夹层", "暗格", "底稿", "潜台词"] },
  { level: 3, id: "conversion-points", name: "转换节点", words: ["兑换", "翻译稿", "换乘", "过户"] },
  { level: 3, id: "carriers", name: "载体", words: ["信使", "导管", "电波", "胶卷"] },

  // ===== L4 抽象隐喻 =====
  { level: 4, id: "rules-become-game", name: "规则即玩法", words: ["规则书", "关卡设计", "评分标准", "胜负条件"] },
  { level: 4, id: "naming-creates-thing", name: "命名造物", words: ["定义", "标签化", "归类", "下定论"] },
  { level: 4, id: "absence-as-presence", name: "缺席即在场", words: ["留白", "沉默", "空椅", "省略号"] },
  { level: 4, id: "copy-becomes-original", name: "复制成原作", words: ["翻拍", "再版", "拓本", "仿作"] },
  { level: 4, id: "tools-shape-user", name: "工具反塑造人", words: ["口音", "握姿", "审美", "节奏感"] },
  { level: 4, id: "delay-as-strategy", name: "延迟即策略", words: ["拖延", "观望", "蓄势", "留一手"] },
  { level: 4, id: "measure-changes-measured", name: "测量改变被测", words: ["体检", "民调", "打卡", "考评"] },
  { level: 4, id: "boundary-defines-inside", name: "边界定义内部", words: ["国界", "围墙", "封面", "片头"] },
  { level: 4, id: "exception-proves-rule", name: "例外印证规则", words: ["特赦", "破例", "彩蛋关", "隐藏款"] },
  { level: 4, id: "small-stands-for-big", name: "以小见大", words: ["缩影画", "纪念币", "切面图", "摘录句"] },
  { level: 4, id: "process-over-result", name: "过程重于结果", words: ["草稿", "排演", "推演", "演算纸"] },
  { level: 4, id: "constraint-as-style", name: "限制成风格", words: ["十四行", "黑白片", "极简风", "单色调"] },
  { level: 4, id: "promise-as-asset", name: "承诺即资产", words: ["欠条", "预售券", "信用分", "口头约"] },
  { level: 4, id: "map-precedes-territory", name: "地图先于疆域", words: ["蓝图", "规划稿", "设定集", "草图本"] },
  { level: 4, id: "failure-as-data", name: "失败即数据", words: ["废稿", "故障表", "退货单", "纠错本"] },
  { level: 4, id: "relation-as-thing", name: "关系即物件", words: ["请柬", "戒指", "勋章", "合影"] },
  { level: 4, id: "repetition-as-ritual", name: "重复即仪式", words: ["晨读", "巡更", "年检", "周会"] },
  { level: 4, id: "surface-as-message", name: "表面即信息", words: ["封皮", "外壳纹", "招牌", "门面"] },
];

// ── Load, merge, validate (idempotent: skip groups already in bank) ─────────
const data = JSON.parse(readFileSync(SRC, "utf8"));
const bank = [...data.textGroupBank];

const ids = new Set(bank.map((g) => g.id));
const wordOwner = new Map();
for (const g of bank) for (const w of g.words) wordOwner.set(w, g.id);

const toAdd = NEW_GROUPS.filter((g) => !ids.has(g.id));
const errors = [];
for (const g of toAdd) {
  if (![1, 2, 3, 4].includes(g.level)) errors.push(`${g.id}: bad level`);
  if (!g.id) errors.push(`group missing id`);
  else ids.add(g.id);
  if (!Array.isArray(g.words) || g.words.length !== 4) errors.push(`${g.id}: need 4 words`);
  if (new Set(g.words).size !== g.words.length) errors.push(`${g.id}: words repeat within group`);
  for (const w of g.words ?? []) {
    if (/[甲乙丙丁]$/.test(w)) errors.push(`${g.id}: word ends with 甲乙丙丁: ${w}`);
    if (wordOwner.has(w)) errors.push(`duplicate word "${w}" in ${wordOwner.get(w)} and ${g.id}`);
    else wordOwner.set(w, g.id);
  }
}
if (errors.length) {
  console.error("VALIDATION FAILED (new groups):");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
bank.push(...toAdd);

// ── Assemble TARGET unique puzzles matching the difficulty-tier model ───────
// difficulty D = min(4, floor(i/25)+1); every group level <= D; >=1 group == D.
// Slot order ascending -> 4 distinct colors. Per-D level templates:
const TEMPLATE = { 1: [1, 1, 1, 1], 2: [1, 1, 2, 2], 3: [1, 2, 3, 3], 4: [1, 2, 3, 4] };

const byLevel = { 1: [], 2: [], 3: [], 4: [] };
for (const g of bank) byLevel[g.level].push(g);

// Seeded LCG: deterministic + reproducible.
let seed = 1234567;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const themes = data.puzzleThemes;
const herrings = data.redHerringNotes;
const seen = new Set();
const manifest = [];
let guard = 0;
while (manifest.length < TARGET && guard < TARGET * 500) {
  guard++;
  const idx = manifest.length;
  const D = Math.min(4, Math.floor(idx / 25) + 1);
  const template = TEMPLATE[D];
  // pick one distinct group per template slot (distinct across whole puzzle)
  const used = new Set();
  const picks = [];
  let ok = true;
  for (const lvl of template) {
    const pool = shuffled(byLevel[lvl]).filter((g) => !used.has(g.id));
    if (!pool.length) { ok = false; break; }
    const g = pool[0];
    used.add(g.id);
    picks.push(g);
  }
  if (!ok || picks.length !== 4) continue;
  // ascending by level for slot colours (template already ascending)
  picks.sort((a, b) => a.level - b.level);
  const key = picks.map((g) => g.id).sort().join("|");
  if (seen.has(key)) continue;
  seen.add(key);
  manifest.push({
    difficulty: D,
    theme: themes[idx % themes.length],
    redHerring: herrings[idx % herrings.length],
    groupIds: picks.map((g) => g.id),
  });
}
if (manifest.length < TARGET) {
  console.error(`Only assembled ${manifest.length}/${TARGET} unique puzzles`);
  process.exit(1);
}

// ── Write back ─────────────────────────────────────────────────────────────
data.textGroupBank = bank;
data.textPuzzleManifest = manifest;
data.textPuzzleCount = manifest.length;
writeFileSync(SRC, JSON.stringify(data, null, 2) + "\n");

// Reuse stats
const reuse = {};
for (const m of manifest) for (const id of m.groupIds) reuse[id] = (reuse[id] || 0) + 1;
const reuseVals = Object.values(reuse);
console.log(`✓ bank: ${bank.length} groups (L1=${byLevel[1].length} L2=${byLevel[2].length} L3=${byLevel[3].length} L4=${byLevel[4].length})`);
console.log(`✓ puzzles: ${manifest.length} unique`);
console.log(`✓ group reuse: min ${Math.min(...reuseVals)}, max ${Math.max(...reuseVals)}, avg ${(reuseVals.reduce((a, b) => a + b, 0) / reuseVals.length).toFixed(1)}`);
console.log(`Wrote ${SRC}`);
