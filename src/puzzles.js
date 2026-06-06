import dailyPuzzleData from '../daily/data/image-puzzles.json' with { type: 'json' };

const difficultySpecs = {
  yellow: {
    label: '明黄',
    description: '直观分类',
    puzzles: [
      ['球类|soccer-ball;basketball;tennis-ball;baseball', '自然景观|mountain;ocean-wave;forest;sunflower', '城市地标|eiffel-tower;great-wall;colosseum;statue-of-liberty', '乐器|acoustic-guitar;grand-piano;violin;drum-kit'],
      ['家养动物|golden-retriever;tabby-cat;rabbit;panda', '水果|red-apple;banana;blueberries;orange-fruit', '交通工具|airplane;bicycle;high-speed-train;sailboat', '容器|cardboard-box;glass-jar;ceramic-bowl;suitcase'],
      ['蔬菜|carrot;broccoli;tomato;eggplant', '花朵|rose;tulip;daisy;lotus', '鸟类|parrot;owl;duck;flamingo', '鞋子|sneaker;boot;sandal;high-heel'],
      ['海洋动物|dolphin;sea-turtle;octopus;seahorse', '厨房用具|frying-pan;kitchen-knife;spatula;whisk', '家具|chair;sofa;table;bookshelf', '帽子|baseball-cap;straw-hat;beanie;top-hat'],
      ['早餐食物|fried-egg;toast;cereal;pancakes', '树木|pine-tree;palm-tree;cherry-tree;willow-tree', '文具|pencil;eraser;ruler;notebook', '灯具|desk-lamp;chandelier;lantern;street-light'],
      ['甜点|ice-cream;cupcake;donut;macaron', '昆虫|butterfly;ladybug;dragonfly;bee', '建筑|castle;skyscraper;temple;cottage', '包袋|backpack;handbag;briefcase;duffel-bag'],
      ['饮品|coffee;tea;orange-juice;milk', '运动器材|tennis-racket;boxing-glove;skateboard;golf-club', '鱼类|goldfish;salmon;clownfish;tuna', '钟表|alarm-clock;wristwatch;wall-clock;hourglass'],
      ['服装|t-shirt;jacket;dress;jeans', '餐具|fork;spoon;plate;cup', '山地动物|deer;mountain-goat;bear;fox', '玩具|teddy-bear;toy-car;building-blocks;yo-yo'],
      ['农场动物|cow;sheep;horse;chicken', '叶子|maple-leaf;fern-leaf;monstera-leaf;oak-leaf', '电子设备|laptop;smartphone;camera;headphones', '面包|baguette;croissant;bagel;pretzel'],
      ['海滩物件|beach-ball;surfboard;seashell;sun-umbrella', '工具|hammer;screwdriver;pliers;wrench', '车辆|car;bus;motorcycle;truck', '蛋糕|birthday-cake;cheesecake;chocolate-cake;fruit-tart'],
      ['香料|cinnamon;peppercorn;star-anise;chili', '乐园设施|swing;slide;seesaw;merry-go-round', '首饰|ring;necklace;bracelet;earrings', '云朵|cumulus-cloud;storm-cloud;sunset-cloud;fog-cloud'],
      ['书桌物件|stapler;paperclip;calculator;scissors', '冬季物件|snowman;scarf;gloves;sled', '爬行动物|snake;lizard;turtle;crocodile', '坚果|walnut;almond;cashew;pistachio'],
      ['清洁用品|broom;mop;sponge;spray-bottle', '园艺工具|shovel;watering-can;garden-rake;pruning-shears', '贝壳|conch-shell;scallop-shell;spiral-shell;clam-shell', '奶制品|cheese;yogurt;butter;cream'],
      ['摄影器材|camera-lens;tripod;camera-flash;film-roll', '露营物件|tent;sleeping-bag;campfire;compass', '热带水果|pineapple;mango;papaya;coconut', '桥梁|stone-bridge;suspension-bridge;wooden-bridge;arch-bridge'],
      ['宠物用品|dog-bowl;cat-toy;pet-collar;pet-bed', '烘焙用品|rolling-pin;measuring-cup;mixing-bowl;baking-tray', '花园植物|lavender;cactus;bonsai;hydrangea', '公共交通|subway;tram;city-bus;ferry'],
    ],
  },
  green: {
    label: '青绿',
    description: '常识联想',
    puzzles: [
      ['会飞的东西|flying-object', '可以切开的食物|cut-food', '有轮子的东西|wheeled-object', '可以盛水的东西|water-container'],
      ['冬天常见|winter-scene', '夏天常见|summer-scene', '雨天常见|rainy-day', '夜晚常见|night-object'],
      ['学校里常见|school-object', '医院里常见|hospital-object', '厨房里常见|kitchen-object', '车站里常见|train-station'],
      ['红色物件|red-object', '蓝色物件|blue-object', '黄色物件|yellow-object', '绿色物件|green-object'],
      ['圆形物件|round-object', '方形物件|square-object', '长条物件|long-object', '三角形物件|triangle-object'],
      ['需要插电|electric-appliance', '需要燃料|fuel-powered', '需要阳光|sunlight-plant', '需要电池|battery-device'],
      ['可以穿戴|wearable-item', '可以折叠|foldable-object', '可以打开|openable-object', '可以悬挂|hanging-object'],
      ['早晨相关|morning-routine', '午餐相关|lunch-food', '傍晚相关|sunset-activity', '睡前相关|bedtime-object'],
      ['旅行会带|travel-item', '运动会用|sports-use', '学习会用|study-item', '做饭会用|cooking-use'],
      ['来自海洋|ocean-product', '来自森林|forest-product', '来自农田|farm-produce', '来自矿山|mineral-rock'],
      ['声音很大|loud-object', '非常柔软|soft-object', '容易破碎|fragile-object', '非常坚硬|hard-object'],
      ['可以照明|lighting-object', '可以计时|timekeeping', '可以测量|measuring-tool', '可以记录|recording-tool'],
      ['儿童常用|children-item', '办公常用|office-item', '户外常用|outdoor-item', '浴室常用|bathroom-item'],
      ['庆祝相关|celebration-item', '告别相关|farewell-scene', '比赛相关|competition-item', '休息相关|rest-item'],
      ['需要成对|paired-object', '通常成组|grouped-object', '通常单独|single-object', '可以堆叠|stackable-object'],
    ],
  },
  blue: {
    label: '靛蓝',
    description: '跨域关系',
    puzzles: [
      ['入口相关|entrance', '时间相关|time-symbol', '保存相关|storage', '方向相关|direction-symbol'],
      ['连接两端|connection-object', '分隔空间|divider-object', '覆盖表面|covering-object', '支撑重量|support-object'],
      ['会留下痕迹|mark-making', '会产生影子|shadow-object', '会反射光线|reflective-object', '会吸收水分|absorbent-object'],
      ['从小到大|growth-stage', '从生到熟|ripening-food', '从完整到破损|broken-object', '从空到满|filled-container'],
      ['表示停止|stop-symbol', '表示前进|forward-symbol', '表示警告|warning-symbol', '表示允许|permission-symbol'],
      ['需要钥匙|locked-object', '需要密码|password-device', '需要票证|ticket-entry', '需要预约|reservation-place'],
      ['沿线排列|lined-up', '围绕中心|radial-arrangement', '上下分层|layered-object', '彼此交错|interwoven-object'],
      ['被包裹|wrapped-object', '被固定|fastened-object', '被悬挂|suspended-object', '被折叠|folded-object'],
      ['用于导航|navigation-tool', '用于定位|location-marker', '用于通信|communication-device', '用于观察|observation-tool'],
      ['边缘破损|damaged-edge', '表面裂纹|cracked-surface', '颜色褪去|faded-object', '形状变形|deformed-object'],
      ['等待发生|waiting-scene', '准备开始|ready-to-start', '正在进行|in-progress', '已经结束|finished-scene'],
      ['聚集人群|crowd-place', '保持安静|quiet-place', '快速移动|fast-motion', '缓慢变化|slow-change'],
      ['信息隐藏|hidden-information', '信息公开|public-information', '信息更新|updated-information', '信息归档|archived-information'],
      ['临时搭建|temporary-structure', '永久建造|permanent-structure', '自然形成|natural-formation', '人工雕刻|carved-object'],
      ['寻找目标|searching', '确认身份|identification', '比较差异|comparison', '做出选择|selection'],
    ],
  },
  purple: {
    label: '紫玄',
    description: '细节线索',
    puzzles: [
      ['边缘藏有线索|edge-detail', '中心藏有线索|center-detail', '背景藏有线索|background-detail', '倒影藏有线索|reflection-detail'],
      ['不完整的圆|incomplete-circle', '重复的直线|repeated-lines', '相交的路径|crossing-paths', '孤立的点|isolated-dot'],
      ['看似对称|visual-symmetry', '轻微偏移|slight-offset', '比例失衡|unbalanced-scale', '方向相反|opposite-direction'],
      ['入口被遮挡|blocked-entrance', '出口不明显|hidden-exit', '道路中断|broken-road', '桥梁未连接|unfinished-bridge'],
      ['时间停滞|stopped-time', '时间加速|fast-time', '时间倒退|reverse-time', '时间循环|time-loop'],
      ['内容溢出|overflowing-container', '内容缺失|missing-content', '内容混入|mixed-content', '内容分层|layered-content'],
      ['表面留下手势|gesture-trace', '物件暗示动作|implied-action', '姿态暗示情绪|body-language', '空间暗示关系|spatial-relation'],
      ['画面中的替代物|visual-substitute', '画面中的双关|visual-pun', '画面中的隐喻|visual-metaphor', '画面中的矛盾|visual-contradiction'],
      ['材质不匹配|material-mismatch', '光线不匹配|lighting-mismatch', '尺度不匹配|scale-mismatch', '时代不匹配|era-mismatch'],
      ['少了一个|one-missing', '多了一个|one-extra', '位置交换|swapped-position', '顺序颠倒|reversed-order'],
      ['与背景融合|camouflage', '从背景突出|visual-contrast', '被阴影隐藏|hidden-in-shadow', '被强光遮蔽|overexposed-object'],
      ['边界模糊|blurred-boundary', '边界锋利|sharp-boundary', '边界重复|repeated-boundary', '边界破裂|broken-boundary'],
      ['形状暗示字母|letter-shape', '形状暗示数字|number-shape', '形状暗示箭头|arrow-shape', '形状暗示符号|symbol-shape'],
      ['真实与模型|real-vs-model', '原件与复制品|original-vs-copy', '自然与人工|natural-vs-artificial', '完整与碎片|whole-vs-fragment'],
      ['原因在画外|offscreen-cause', '结果在画内|visible-result', '动作将发生|anticipated-action', '动作刚结束|recent-action'],
    ],
  },
};

const colors = ['yellow', 'green', 'blue', 'purple'];

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

function keywordImageDataUrl(keyword, color, lock) {
  const palette = {
    yellow: ['#fff1a6', '#e7a900'],
    green: ['#c9f0c3', '#52a863'],
    blue: ['#bfe6ff', '#2f95d2'],
    purple: ['#e8c7ff', '#a56bd6'],
  }[color] || ['#fff8df', '#12355c'];
  const iconSeed = lock % 4;
  const icon = [
    '<circle cx="240" cy="150" r="58" fill="#fff8df" stroke="#12355c" stroke-width="12"/><path d="M205 150h70M240 115v70" stroke="#e45d4f" stroke-width="14" stroke-linecap="round"/>',
    '<path d="M150 215c30-90 150-90 180 0" fill="#fff8df" stroke="#12355c" stroke-width="13" stroke-linecap="round"/><circle cx="240" cy="126" r="44" fill="#ffd95c" stroke="#12355c" stroke-width="12"/>',
    '<rect x="155" y="96" width="170" height="132" rx="26" fill="#fff8df" stroke="#12355c" stroke-width="12"/><path d="M190 250h100" stroke="#52a863" stroke-width="14" stroke-linecap="round"/>',
    '<path d="M155 205 240 82l85 123z" fill="#fff8df" stroke="#12355c" stroke-width="12" stroke-linejoin="round"/><circle cx="240" cy="228" r="24" fill="#e45d4f"/>',
  ][iconSeed];
  const label = String(keyword || 'puzzle').replace(/[-_]/g, ' ').slice(0, 22);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
      <rect width="480" height="360" rx="30" fill="${palette[0]}"/>
      <path d="M25 58 C91 22 155 79 218 45 C300 1 346 61 455 36" fill="none" stroke="#fff8df" stroke-width="19" stroke-linecap="round" opacity=".72"/>
      <path d="M30 290 C105 244 167 309 246 267 C314 231 369 285 444 245" fill="none" stroke="${palette[1]}" stroke-width="18" stroke-linecap="round" opacity=".72"/>
      ${icon}
      <rect x="64" y="276" width="352" height="46" rx="18" fill="#fffaf0" stroke="#12355c" stroke-width="7" stroke-dasharray="10 9"/>
      <text x="240" y="306" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#12355c">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function makeGroup(raw, color, difficulty, puzzleIndex, groupIndex) {
  const [name, body] = raw.split('|');
  // Daily-generated puzzles use explicit image URLs separated by commas.
  // Base puzzles use stable generated local SVG data URLs from keywords.
  const isExplicitUrls = body && body.includes(',') && /^(https?:|\/)/.test(body.trim());
  const parts = isExplicitUrls ? body.split(',') : body.split(';');
  const items = Array.from({ length: 4 }, (_, variant) => {
    const lock = hashString(`${difficulty}-${puzzleIndex}-${groupIndex}-${variant}`) % 100000;
    const part = parts[variant] || parts[0];
    const localImageSet = !isExplicitUrls
      ? {
          yellow: { 0: 'easy-1', 1: 'easy-2' },
        }[difficulty]?.[puzzleIndex]
      : null;
    const localImage = localImageSet
      ? `/puzzles/${localImageSet}/${String(groupIndex * 4 + variant + 1).padStart(2, '0')}.jpg`
      : null;
    const imageUrl = isExplicitUrls
      ? part.trim()
      : localImage || keywordImageDataUrl(part.trim(), color, lock);
    return {
      id: `${difficulty}-${puzzleIndex}-${groupIndex}-${variant}`,
      label: `${name} ${variant + 1}`,
      imageUrl,
      groupName: name,
    };
  });
  return { name, color, description: difficultySpecs[difficulty].description, items };
}

// Merge daily-generated puzzles (committed by scripts/daily-puzzles.mjs) into the
// in-memory catalog. Base puzzles keep their 0-based array indices; daily puzzles
// continue the index, so ids remain unique.
const mergedSpecs = {
  yellow: { ...difficultySpecs.yellow, puzzles: [...difficultySpecs.yellow.puzzles, ...(dailyPuzzleData.yellow || [])] },
  green: { ...difficultySpecs.green, puzzles: [...difficultySpecs.green.puzzles, ...(dailyPuzzleData.green || [])] },
  blue: { ...difficultySpecs.blue, puzzles: [...difficultySpecs.blue.puzzles, ...(dailyPuzzleData.blue || [])] },
  purple: { ...difficultySpecs.purple, puzzles: [...difficultySpecs.purple.puzzles, ...(dailyPuzzleData.purple || [])] },
};

export const difficulties = Object.entries(mergedSpecs).map(([id, spec]) => ({
  id,
  label: spec.label,
  description: spec.description,
  count: spec.puzzles.length,
}));

export const imagePuzzleCatalog = Object.fromEntries(
  Object.entries(mergedSpecs).map(([difficulty, spec]) => [
    difficulty,
    spec.puzzles.map((rawGroups, puzzleIndex) => {
      const groups = rawGroups.map((raw, groupIndex) => makeGroup(raw, colors[groupIndex], difficulty, puzzleIndex, groupIndex));
      const items = groups.flatMap((group) => group.items).sort(() => Math.random() - 0.5);
      return {
        id: `${difficulty}-${puzzleIndex + 1}`,
        title: `${spec.label}图片题 ${puzzleIndex + 1}`,
        clue: difficulty === 'yellow'
          ? '先找一眼能认出的物件类别，每组四张。'
          : difficulty === 'green'
            ? '从用途、场景和常识关系开始联想。'
            : difficulty === 'blue'
              ? '跨越物件类别，寻找功能、关系或变化。'
              : '留意边缘、背景、方向和画面细节。',
        groups,
        items,
      };
    }),
  ]),
);

export const realImagePuzzleIndexes = Object.fromEntries(
  Object.entries(imagePuzzleCatalog).map(([difficulty, puzzles]) => [
    difficulty,
    puzzles
      .map((puzzle, index) => (
        puzzle.items.every((item) => item.imageUrl && !item.imageUrl.startsWith('data:'))
          ? index
          : null
      ))
      .filter((index) => index !== null),
  ]),
);
