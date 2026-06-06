import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CircleHelp,
  Check,
  Coffee,
  Globe2,
  Heart,
  Image,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Mail,
  Medal,
  Menu,
  Palette,
  PenLine,
  RefreshCcw,
  Send,
  Share2,
  Shuffle,
  Sparkles,
  Type,
  Undo2,
  Trash2,
  X,
} from 'lucide-react';
import './styles.css';
import { difficulties, imagePuzzleCatalog } from './puzzles';
import dailyTextData from '../daily/data/text-puzzles.json';

const baseTextPuzzles = [
  [
    { zh: ['球类运动', '足球', '篮球', '网球', '棒球'], en: ['Ball sports', 'Football', 'Basketball', 'Tennis', 'Baseball'] },
    { zh: ['自然景物', '高山', '海洋', '森林', '花朵'], en: ['Nature', 'Mountain', 'Ocean', 'Forest', 'Flower'] },
    { zh: ['城市地标', '高塔', '城墙', '竞技场', '雕像'], en: ['City landmarks', 'Tower', 'Wall', 'Arena', 'Statue'] },
    { zh: ['乐器', '吉他', '钢琴', '小提琴', '鼓'], en: ['Instruments', 'Guitar', 'Piano', 'Violin', 'Drum'] },
  ],
  [
    { zh: ['宠物', '狗', '猫', '兔子', '仓鼠'], en: ['Pets', 'Dog', 'Cat', 'Rabbit', 'Hamster'] },
    { zh: ['水果', '苹果', '香蕉', '蓝莓', '橙子'], en: ['Fruit', 'Apple', 'Banana', 'Blueberry', 'Orange'] },
    { zh: ['交通工具', '飞机', '自行车', '火车', '船'], en: ['Transport', 'Plane', 'Bike', 'Train', 'Boat'] },
    { zh: ['容器', '盒子', '罐子', '碗', '行李箱'], en: ['Containers', 'Box', 'Jar', 'Bowl', 'Suitcase'] },
  ],
  [
    { zh: ['蔬菜', '胡萝卜', '西兰花', '番茄', '茄子'], en: ['Vegetables', 'Carrot', 'Broccoli', 'Tomato', 'Eggplant'] },
    { zh: ['花卉', '玫瑰', '郁金香', '雏菊', '荷花'], en: ['Flowers', 'Rose', 'Tulip', 'Daisy', 'Lotus'] },
    { zh: ['鸟类', '鹦鹉', '猫头鹰', '鸭子', '火烈鸟'], en: ['Birds', 'Parrot', 'Owl', 'Duck', 'Flamingo'] },
    { zh: ['鞋子', '运动鞋', '靴子', '凉鞋', '高跟鞋'], en: ['Shoes', 'Sneaker', 'Boot', 'Sandal', 'Heel'] },
  ],
  [
    { zh: ['海洋动物', '海豚', '海龟', '章鱼', '海马'], en: ['Sea animals', 'Dolphin', 'Turtle', 'Octopus', 'Seahorse'] },
    { zh: ['厨房工具', '平底锅', '刀', '锅铲', '打蛋器'], en: ['Kitchen tools', 'Pan', 'Knife', 'Spatula', 'Whisk'] },
    { zh: ['家具', '椅子', '沙发', '桌子', '书架'], en: ['Furniture', 'Chair', 'Sofa', 'Table', 'Shelf'] },
    { zh: ['帽子', '棒球帽', '草帽', '毛线帽', '礼帽'], en: ['Hats', 'Cap', 'Straw hat', 'Beanie', 'Top hat'] },
  ],
  [
    { zh: ['早餐', '鸡蛋', '吐司', '麦片', '煎饼'], en: ['Breakfast', 'Egg', 'Toast', 'Cereal', 'Pancake'] },
    { zh: ['树木', '松树', '棕榈树', '樱花树', '柳树'], en: ['Trees', 'Pine', 'Palm', 'Cherry tree', 'Willow'] },
    { zh: ['文具', '铅笔', '橡皮', '尺子', '笔记本'], en: ['Stationery', 'Pencil', 'Eraser', 'Ruler', 'Notebook'] },
    { zh: ['灯具', '台灯', '吊灯', '灯笼', '路灯'], en: ['Lights', 'Lamp', 'Chandelier', 'Lantern', 'Streetlight'] },
  ],
  [
    { zh: ['甜点', '冰淇淋', '纸杯蛋糕', '甜甜圈', '马卡龙'], en: ['Desserts', 'Ice cream', 'Cupcake', 'Donut', 'Macaron'] },
    { zh: ['昆虫', '蝴蝶', '瓢虫', '蜻蜓', '蜜蜂'], en: ['Insects', 'Butterfly', 'Ladybug', 'Dragonfly', 'Bee'] },
    { zh: ['建筑', '城堡', '摩天楼', '寺庙', '小屋'], en: ['Buildings', 'Castle', 'Skyscraper', 'Temple', 'Cottage'] },
    { zh: ['包袋', '背包', '手提包', '公文包', '旅行袋'], en: ['Bags', 'Backpack', 'Handbag', 'Briefcase', 'Duffel'] },
  ],
  [
    { zh: ['饮品', '咖啡', '茶', '果汁', '牛奶'], en: ['Drinks', 'Coffee', 'Tea', 'Juice', 'Milk'] },
    { zh: ['运动器材', '球拍', '手套', '滑板', '高尔夫杆'], en: ['Sports gear', 'Racket', 'Glove', 'Skateboard', 'Golf club'] },
    { zh: ['鱼类', '金鱼', '鲑鱼', '小丑鱼', '金枪鱼'], en: ['Fish', 'Goldfish', 'Salmon', 'Clownfish', 'Tuna'] },
    { zh: ['计时物', '闹钟', '手表', '挂钟', '沙漏'], en: ['Timekeepers', 'Alarm', 'Watch', 'Clock', 'Hourglass'] },
  ],
  [
    { zh: ['服装', 'T 恤', '夹克', '连衣裙', '牛仔裤'], en: ['Clothes', 'T-shirt', 'Jacket', 'Dress', 'Jeans'] },
    { zh: ['餐具', '叉子', '勺子', '盘子', '杯子'], en: ['Tableware', 'Fork', 'Spoon', 'Plate', 'Cup'] },
    { zh: ['野生动物', '鹿', '山羊', '熊', '狐狸'], en: ['Wild animals', 'Deer', 'Goat', 'Bear', 'Fox'] },
    { zh: ['玩具', '玩偶熊', '玩具车', '积木', '悠悠球'], en: ['Toys', 'Teddy', 'Toy car', 'Blocks', 'Yo-yo'] },
  ],
  [
    { zh: ['农场动物', '奶牛', '绵羊', '马', '鸡'], en: ['Farm animals', 'Cow', 'Sheep', 'Horse', 'Chicken'] },
    { zh: ['叶子', '枫叶', '蕨叶', '龟背竹叶', '橡树叶'], en: ['Leaves', 'Maple', 'Fern', 'Monstera', 'Oak'] },
    { zh: ['电子设备', '笔记本电脑', '手机', '相机', '耳机'], en: ['Electronics', 'Laptop', 'Phone', 'Camera', 'Headphones'] },
    { zh: ['面包', '法棍', '可颂', '贝果', '椒盐卷饼'], en: ['Bread', 'Baguette', 'Croissant', 'Bagel', 'Pretzel'] },
  ],
  [
    { zh: ['海滩物品', '沙滩球', '冲浪板', '贝壳', '遮阳伞'], en: ['Beach items', 'Beach ball', 'Surfboard', 'Shell', 'Umbrella'] },
    { zh: ['工具', '锤子', '螺丝刀', '钳子', '扳手'], en: ['Tools', 'Hammer', 'Screwdriver', 'Pliers', 'Wrench'] },
    { zh: ['车辆', '汽车', '公交车', '摩托车', '卡车'], en: ['Vehicles', 'Car', 'Bus', 'Motorcycle', 'Truck'] },
    { zh: ['蛋糕', '生日蛋糕', '芝士蛋糕', '巧克力蛋糕', '水果塔'], en: ['Cakes', 'Birthday cake', 'Cheesecake', 'Chocolate cake', 'Fruit tart'] },
  ],
  [
    { zh: ['香料', '肉桂', '胡椒', '八角', '辣椒'], en: ['Spices', 'Cinnamon', 'Pepper', 'Star anise', 'Chili'] },
    { zh: ['游乐设施', '秋千', '滑梯', '跷跷板', '旋转木马'], en: ['Playground', 'Swing', 'Slide', 'Seesaw', 'Carousel'] },
    { zh: ['首饰', '戒指', '项链', '手链', '耳环'], en: ['Jewelry', 'Ring', 'Necklace', 'Bracelet', 'Earrings'] },
    { zh: ['云朵', '积云', '乌云', '晚霞云', '雾'], en: ['Clouds', 'Cumulus', 'Storm cloud', 'Sunset cloud', 'Fog'] },
  ],
  [
    { zh: ['桌面物件', '订书机', '回形针', '计算器', '剪刀'], en: ['Desk items', 'Stapler', 'Paperclip', 'Calculator', 'Scissors'] },
    { zh: ['冬季物件', '雪人', '围巾', '手套', '雪橇'], en: ['Winter items', 'Snowman', 'Scarf', 'Gloves', 'Sled'] },
    { zh: ['爬行动物', '蛇', '蜥蜴', '乌龟', '鳄鱼'], en: ['Reptiles', 'Snake', 'Lizard', 'Turtle', 'Crocodile'] },
    { zh: ['坚果', '核桃', '杏仁', '腰果', '开心果'], en: ['Nuts', 'Walnut', 'Almond', 'Cashew', 'Pistachio'] },
  ],
  [
    { zh: ['清洁用品', '扫帚', '拖把', '海绵', '喷瓶'], en: ['Cleaning', 'Broom', 'Mop', 'Sponge', 'Spray bottle'] },
    { zh: ['园艺工具', '铲子', '洒水壶', '耙子', '修枝剪'], en: ['Garden tools', 'Shovel', 'Watering can', 'Rake', 'Pruner'] },
    { zh: ['贝壳', '海螺', '扇贝壳', '螺旋贝壳', '蛤蜊壳'], en: ['Shells', 'Conch', 'Scallop', 'Spiral shell', 'Clam'] },
    { zh: ['乳制品', '奶酪', '酸奶', '黄油', '奶油'], en: ['Dairy', 'Cheese', 'Yogurt', 'Butter', 'Cream'] },
  ],
  [
    { zh: ['摄影器材', '镜头', '三脚架', '闪光灯', '胶卷'], en: ['Camera gear', 'Lens', 'Tripod', 'Flash', 'Film'] },
    { zh: ['露营', '帐篷', '睡袋', '篝火', '指南针'], en: ['Camping', 'Tent', 'Sleeping bag', 'Campfire', 'Compass'] },
    { zh: ['热带水果', '菠萝', '芒果', '木瓜', '椰子'], en: ['Tropical fruit', 'Pineapple', 'Mango', 'Papaya', 'Coconut'] },
    { zh: ['桥梁', '石桥', '吊桥', '木桥', '拱桥'], en: ['Bridges', 'Stone bridge', 'Suspension bridge', 'Wood bridge', 'Arch bridge'] },
  ],
  [
    { zh: ['宠物用品', '狗碗', '猫玩具', '项圈', '宠物床'], en: ['Pet supplies', 'Dog bowl', 'Cat toy', 'Collar', 'Pet bed'] },
    { zh: ['烘焙工具', '擀面杖', '量杯', '搅拌碗', '烤盘'], en: ['Baking tools', 'Rolling pin', 'Measuring cup', 'Mixing bowl', 'Baking tray'] },
    { zh: ['花园植物', '薰衣草', '仙人掌', '盆景', '绣球花'], en: ['Garden plants', 'Lavender', 'Cactus', 'Bonsai', 'Hydrangea'] },
    { zh: ['公共交通', '地铁', '有轨电车', '城市公交', '渡轮'], en: ['Public transport', 'Subway', 'Tram', 'City bus', 'Ferry'] },
  ],
];

const generatedTextPuzzles = ['yellow', 'green', 'blue', 'purple'].flatMap((difficulty) => {
  const puzzles = Array.isArray(dailyTextData[difficulty]) ? dailyTextData[difficulty] : [];
  return puzzles.filter((puzzle) => (
    Array.isArray(puzzle)
    && puzzle.length === 4
    && puzzle.every((group) => Array.isArray(group) && group.length === 5)
  )).map((puzzle) => puzzle.map((group) => ({ zh: group })));
});

function buildTextPuzzles(language, communityPuzzles = []) {
  const sourcePuzzles = language === 'zh' ? [...baseTextPuzzles, ...generatedTextPuzzles] : baseTextPuzzles;
  const builtInPuzzles = sourcePuzzles.map((groups, puzzleIndex) => {
    const mappedGroups = groups.map((group, groupIndex) => {
      const [name, ...words] = group[language] || group.zh;
      return {
        name,
        color: ['yellow', 'green', 'blue', 'purple'][groupIndex],
        description: language === 'zh' ? '简易分类' : 'Easy category',
        items: words,
      };
    });
    return {
      id: `built-in-${puzzleIndex}`,
      groups: mappedGroups,
      items: mappedGroups.flatMap((group, groupIndex) =>
        group.items.map((word, wordIndex) => ({
          id: `text-${puzzleIndex}-${groupIndex}-${wordIndex}`,
          label: word,
          groupName: group.name,
        })),
      ),
    };
  });
  const communityBuilt = (language === 'zh' ? communityPuzzles : []).map((puzzle, puzzleIndex) => {
    const mappedGroups = (puzzle.groups || []).map((group, groupIndex) => ({
      ...group,
      key: group.key || `${puzzle.id || `community-${puzzleIndex}`}-${groupIndex}`,
      name: String(group.name || '').trim(),
      color: group.color || ['yellow', 'green', 'blue', 'purple'][groupIndex],
      description: language === 'zh' ? '游客贡献' : 'Community puzzle',
      items: Array.isArray(group.items) ? group.items.map((item) => String(item).trim()).filter(Boolean) : [],
    })).filter((group) => group.name && group.items.length === 4);
    if (mappedGroups.length !== 4) return null;
    return {
      ...puzzle,
      groups: mappedGroups,
      items: mappedGroups.flatMap((group, groupIndex) =>
        group.items.map((word, wordIndex) => ({
          id: `${puzzle.id || `community-${puzzleIndex}`}-${groupIndex}-${wordIndex}`,
          label: word,
          groupName: group.key || group.name,
        })),
      ),
    };
  }).filter(Boolean);
  return [...builtInPuzzles, ...communityBuilt];
}

function randomPuzzleIndex(difficulty, avoidIndex = -1) {
  const count = imagePuzzleCatalog[difficulty].length;
  if (count <= 1) return 0;
  let nextIndex = Math.floor(Math.random() * count);
  while (nextIndex === avoidIndex) nextIndex = Math.floor(Math.random() * count);
  return nextIndex;
}

function randomTextPuzzleIndex(avoidIndex = -1, count = baseTextPuzzles.length) {
  if (count <= 1) return 0;
  let nextIndex = Math.floor(Math.random() * count);
  while (nextIndex === avoidIndex) nextIndex = Math.floor(Math.random() * count);
  return nextIndex;
}

function normalizeCommunityPuzzles(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((puzzle, puzzleIndex) => {
      const groups = Array.isArray(puzzle.groups) ? puzzle.groups : [];
      if (groups.length !== 4) return null;
      const normalizedGroups = groups.map((group, groupIndex) => ({
        key: `${puzzle.id || `community-${puzzleIndex}`}-${groupIndex}`,
        name: String(group.name || '').trim(),
        color: group.color || ['yellow', 'green', 'blue', 'purple'][groupIndex],
        description: String(group.description || '游客贡献').trim(),
        items: Array.isArray(group.items) ? group.items.map((item) => String(item).trim()).filter(Boolean) : [],
      }));
      if (normalizedGroups.some((group) => !group.name || group.items.length !== 4)) return null;
      return {
        id: String(puzzle.id || `community-${puzzleIndex}`),
        source: 'community',
        groups: normalizedGroups,
      };
    })
    .filter(Boolean);
}

function Logo() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <i /><i /><i /><i />
    </div>
  );
}

function fallbackImageDataUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">
      <rect width="480" height="360" rx="28" fill="#fff8df"/>
      <path d="M34 66 C118 23 157 78 228 45 C306 9 365 50 443 35" fill="none" stroke="#f2c64f" stroke-width="18" stroke-linecap="round" opacity=".85"/>
      <path d="M42 291 C117 244 180 316 249 269 C318 222 372 287 438 249" fill="none" stroke="#62c7bb" stroke-width="20" stroke-linecap="round" opacity=".8"/>
      <path d="M96 126 L186 210 L298 104 L388 220" fill="none" stroke="#12355c" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="186" cy="210" r="24" fill="#e56a5d"/>
      <circle cx="298" cy="104" r="24" fill="#9fdb93"/>
      <circle cx="240" cy="292" r="10" fill="#f2c64f" opacity=".9"/>
      <circle cx="270" cy="292" r="10" fill="#62c7bb" opacity=".9"/>
      <circle cx="210" cy="292" r="10" fill="#e56a5d" opacity=".9"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const copy = {
  zh: {
    daily: '每日分类谜题',
    switchLanguage: 'English',
    pageTitle: '四格寻踪 FourFind | NanamiCat',
    metaDescription: '四格寻踪，每日中文分类谜题。',
    brand: '四格寻踪',
    navGame: '每日挑战',
    leaderboard: '排行榜',
    contribute: '贡献谜题',
    submitShort: '投稿',
    play: '玩法',
    howTo: '玩法说明',
    textMode: '文字模式',
    imageMode: '图片模式',
    difficultyLabel: '图片难度',
    difficultyNames: { yellow: '明黄', green: '青绿', blue: '靛蓝', purple: '紫玄' },
    difficultyChanged: (name) => `已切换到${name}难度。`,
    mistakes: '剩余失误',
    status: '找出四组，每组四个。',
    legendTitle: '分类主题图例',
    mobileLegendTitle: '分类图例',
    foundGroups: '已找到的组',
    foundCount: (count) => `已找到：${count} / 4 组`,
    groupNumber: (index) => `组 ${index}`,
    groupProgressSmall: (count) => `已找到 ${count}/4 个`,
    undiscovered: (index) => `待发现 ${index}`,
    notFound: '尚未找到',
    found: '已找到',
    hintPrefix: '提示',
    hintInCard: (name) => `提示：${name}`,
    tools: '工具',
    actions: '操作',
    hintButton: '提示',
    shuffle: '洗牌',
    undo: '撤销',
    cancel: '取消',
    submit: '提交',
    submitGroup: '提交组合',
    next: '下一题',
    share: '分享结果',
    textMessage: '文字题：寻找四个词之间最具体的共同点。',
    imageMessage: '图片题：先看画面里最直接的物体、场景、动作和表面线索，每组四张。',
    imageHint: (name) => `提示已写入一个待发现卡片：${name}`,
    noHints: '已经没有可揭示的分类了。',
    changedDifficultyText: '已切换难度。文字模式会从简易题库随机开始。',
    nextText: '已换到下一题。寻找四个词之间最具体的共同点。',
    skipped: '已跳过当前题，换到下一题。',
    correct: (name, description) => `${name}：${description}。继续寻找下一组。`,
    wrong: '还差一点，这四个不属于同一组。',
    copied: '结果已复制，可以分享给朋友。',
    copyFailed: '无法访问剪贴板，请稍后重试。',
    shareHeading: '四格寻踪通关结果',
    imageGroup: (index) => `图片组 ${index}`,
    imageDescription: '图片分类',
    supportLabel: '赞助本题',
    supportTitle: '喜欢这个小游戏，可以请我喝杯咖啡。',
    supportCopy: '微信扫码赞助，支持继续做中文题库、历史题和主题包。',
    enlargeQr: '点击放大微信支付二维码',
    qrTitle: '微信支付二维码',
    imageAlt: '图片线索',
    imageTileLabel: (index) => `图片线索 ${index}`,
    helpTitle: '找出四组，每组四个。',
    helpSteps: [
      '点击四个你认为属于同一类别的词或图片。',
      '提交正确组合后，该组会从棋盘中移除。',
      '四次失误前找出全部四组即可通关。',
    ],
    start: '开始挑战',
    quickLeaderboard: '查看排行榜',
    quickLeaderboardSub: '看看你的排名',
    quickContribute: '投稿谜题',
    quickContributeSub: '分享你的创意谜题',
    homeLabel: '四格寻踪首页',
    menuLabel: '打开菜单',
    modeSwitchLabel: '题目模式',
    primaryNavLabel: '主导航',
    puzzleBoardLabel: '谜题棋盘',
    bottomNavLabel: '移动端导航',
    nickname: '昵称',
    nicknamePlaceholder: '输入昵称',
    saveNickname: '保存昵称',
    nicknameSaved: (name) => `已保存昵称：${name}`,
    nicknameRequired: '请输入昵称',
    nicknameTooLong: '昵称不能超过 32 个字符。',
    locale: 'zh-CN',
    recordLabel: '每日记录',
    leaderboardCopy: '留下昵称后，文字题通关 1 分，图片题通关 3 分。',
    leaderboardEmpty: '还没有游客留下成绩。先保存昵称并完成一题，就会出现在这里。',
    scoreSaved: (points) => `已记录成绩：+${points} 分`,
    scoreNeedsName: '保存昵称后，通关成绩会自动进入排行榜。',
    gameOverTitle: '失误次数用完了',
    gameOverCopy: '留下昵称后，后续通关成绩会自动进入排行榜。保存后可以直接换一题继续玩。',
    keepPlaying: '换一题继续',
    tableHeads: ['#', '昵称', '文字通关', '图片通关', '总分', '最近时间'],
    contributeLabel: '一起扩充题库',
    contributeTitle: '提交谜题',
    contributeCopy: '先写 1 组也可以提交；每组 4 个词，最多一次提交 10 组。投稿会先进入 pending 状态，方便审核后编入题库。',
    leaveContact: '愿意留下联系邮箱，接收一封自动感谢邮件',
    contactEmail: '联系邮箱',
    groupProgress: (count) => `已填写 ${count} / 10 组`,
    addGroup: '+ 增加一组',
    groupName: (index) => `组名 ${index}`,
    removeGroup: '删除',
    groupNamePlaceholder: (index) => `第 ${index} 组名称`,
    groupWordsPlaceholder: '4 个词，用逗号分隔',
    submitting: '提交中...',
    submitToAdmin: '提交到后台',
    maxGroups: '一次最多提交 10 组。',
    minGroups: '至少保留 1 组。',
    invalidGroupCount: '一次可以提交 1 到 10 组。',
    invalidGroupName: '每组都需要填写组名。',
    invalidWords: '每组必须填写 4 个词，并用逗号分隔。',
    duplicateGroupNames: '每个组名必须不同。',
    duplicateWords: '同一次投稿中的所有词都必须不同。',
    contributionTextTooLong: '组名和词语不能超过 40 个字符。',
    submitFailed: '提交失败，请稍后再试。',
    contributionSuccess: '谜题已提交到后台，感谢贡献。',
  },
  en: {
    daily: 'Daily category puzzle',
    switchLanguage: 'Chinese',
    pageTitle: 'FourFind | NanamiCat',
    metaDescription: 'FourFind, a daily category puzzle game.',
    brand: 'FourFind',
    navGame: 'Daily',
    leaderboard: 'Leaderboard',
    contribute: 'Contribute',
    submitShort: 'Submit',
    play: 'Help',
    howTo: 'How to play',
    textMode: 'Text mode',
    imageMode: 'Image mode',
    difficultyLabel: 'Image difficulty',
    difficultyNames: { yellow: 'Easy', green: 'Medium', blue: 'Hard', purple: 'Expert' },
    difficultyChanged: (name) => `Switched to ${name} difficulty.`,
    mistakes: 'Mistakes left',
    status: 'Find four groups of four.',
    legendTitle: 'Group Clue Board',
    mobileLegendTitle: 'Clue Board',
    foundGroups: 'Found groups',
    foundCount: (count) => `Found: ${count} / 4`,
    groupNumber: (index) => `Group ${index}`,
    groupProgressSmall: (count) => `Found ${count}/4`,
    undiscovered: (index) => `Hidden ${index}`,
    notFound: 'Not found',
    found: 'Found',
    hintPrefix: 'Hint',
    hintInCard: (name) => `Hint: ${name}`,
    tools: 'Tools',
    actions: 'Actions',
    hintButton: 'Hint',
    shuffle: 'Shuffle',
    undo: 'Undo',
    cancel: 'Clear',
    submit: 'Submit',
    submitGroup: 'Submit group',
    next: 'Next puzzle',
    share: 'Share result',
    textMessage: 'Text puzzle: find the most specific connection between four words.',
    imageMessage: 'Image puzzle: start with visible objects, scenes, actions, and surface clues. Each group has four images.',
    imageHint: (name) => `Hint added to one hidden card: ${name}`,
    noHints: 'No more hidden groups to hint.',
    changedDifficultyText: 'Difficulty changed. Text mode starts from the easy puzzle bank.',
    nextText: 'Next puzzle is ready. Find the most specific shared category.',
    skipped: 'Skipped this puzzle and loaded the next one.',
    correct: (name, description) => `${name}: ${description}. Keep looking for the next group.`,
    wrong: 'Almost. These four do not belong to the same group.',
    copied: 'Result copied. Share it with friends.',
    copyFailed: 'Could not access the clipboard. Please try again.',
    shareHeading: 'FourFind result',
    imageGroup: (index) => `Image group ${index}`,
    imageDescription: 'Image category',
    supportLabel: 'Support this puzzle',
    supportTitle: 'If you enjoy this little game, you can buy me a coffee.',
    supportCopy: 'Scan with WeChat to support more Chinese puzzles, archives, and themed packs.',
    enlargeQr: 'Click to enlarge WeChat Pay QR code',
    qrTitle: 'WeChat Pay QR code',
    imageAlt: 'Image clue',
    imageTileLabel: (index) => `Image clue ${index}`,
    helpTitle: 'Find four groups of four.',
    helpSteps: [
      'Tap four words or images that belong to the same category.',
      'A correct group disappears from the board after submission.',
      'Find all four groups before you run out of mistakes.',
    ],
    start: 'Start',
    quickLeaderboard: 'View leaderboard',
    quickLeaderboardSub: 'See your rank',
    quickContribute: 'Submit puzzle',
    quickContributeSub: 'Share your puzzle idea',
    homeLabel: 'FourFind home',
    menuLabel: 'Open menu',
    modeSwitchLabel: 'Puzzle mode',
    primaryNavLabel: 'Primary navigation',
    puzzleBoardLabel: 'Puzzle board',
    bottomNavLabel: 'Mobile navigation',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Enter nickname',
    saveNickname: 'Save nickname',
    nicknameSaved: (name) => `Saved nickname: ${name}`,
    nicknameRequired: 'Please enter a nickname',
    nicknameTooLong: 'Nickname must be 32 characters or fewer.',
    locale: 'en-US',
    recordLabel: 'Daily records',
    leaderboardCopy: 'Save a nickname to track clears: 1 point for text puzzles, 3 points for image puzzles.',
    leaderboardEmpty: 'No visitor scores yet. Save a nickname and clear a puzzle to appear here.',
    scoreSaved: (points) => `Score saved: +${points}`,
    scoreNeedsName: 'Save a nickname to send completed puzzles to the leaderboard.',
    gameOverTitle: 'No mistakes left',
    gameOverCopy: 'Save a nickname so future clears are recorded on the leaderboard. Then continue with a fresh puzzle.',
    keepPlaying: 'Next puzzle',
    tableHeads: ['#', 'Nickname', 'Text clears', 'Image clears', 'Score', 'Latest time'],
    contributeLabel: 'Grow the puzzle bank',
    contributeTitle: 'Submit a puzzle',
    contributeCopy: 'You can submit just 1 group. Each group needs 4 words, and one submission can include up to 10 groups. Submissions go to pending review first.',
    leaveContact: 'Leave an email address to receive an automatic thank-you note',
    contactEmail: 'Contact email',
    groupProgress: (count) => `Filled ${count} / 10 groups`,
    addGroup: '+ Add group',
    groupName: (index) => `Group ${index}`,
    removeGroup: 'Remove',
    groupNamePlaceholder: (index) => `Group ${index} name`,
    groupWordsPlaceholder: '4 words, separated by commas',
    submitting: 'Submitting...',
    submitToAdmin: 'Submit to admin',
    maxGroups: 'You can submit up to 10 groups at once.',
    minGroups: 'Keep at least 1 group.',
    invalidGroupCount: 'Submit between 1 and 10 groups.',
    invalidGroupName: 'Each group needs a name.',
    invalidWords: 'Each group must contain 4 comma-separated words.',
    duplicateGroupNames: 'Every group name must be unique.',
    duplicateWords: 'Every word in a submission must be unique.',
    contributionTextTooLong: 'Group names and words must be 40 characters or fewer.',
    submitFailed: 'Submit failed. Please try again later.',
    contributionSuccess: 'Puzzle submitted to the admin queue. Thank you.',
  },
};

function App() {
  const [page, setPage] = useState('game');
  const [language, setLanguage] = useState('zh');
  const [helpOpen, setHelpOpen] = useState(false);
  const [gameOverOpen, setGameOverOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState('text');
  const [theme, setTheme] = useState('default');
  const [difficulty, setDifficulty] = useState('yellow');
  const [puzzleIndex, setPuzzleIndex] = useState(() => randomTextPuzzleIndex());
  const initialPuzzle = imagePuzzleCatalog.yellow[puzzleIndex % imagePuzzleCatalog.yellow.length];
  const [items, setItems] = useState(initialPuzzle.items);
  const [textOrder, setTextOrder] = useState(null);
  const [selected, setSelected] = useState([]);
  const [history, setHistory] = useState([]);
  const [solved, setSolved] = useState([]);
  const [mistakes, setMistakes] = useState(4);
  const [communityTextPuzzles, setCommunityTextPuzzles] = useState([]);
  const [revealedHints, setRevealedHints] = useState(() => new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState(copy.zh.textMessage);
  const [nickname, setNickname] = useState(() => localStorage.getItem('nanamicat.nickname') || '');
  const [savedName, setSavedName] = useState(() => localStorage.getItem('nanamicat.nickname') || '');
  const [submittedScores, setSubmittedScores] = useState(() => new Set());
  const [toast, setToast] = useState('');

  const c = copy[language];
  const textPuzzles = useMemo(() => buildTextPuzzles(language, communityTextPuzzles), [language, communityTextPuzzles]);
  const activePuzzle = imagePuzzleCatalog[difficulty][puzzleIndex % imagePuzzleCatalog[difficulty].length];
  const activeTextPuzzle = textPuzzles[puzzleIndex % textPuzzles.length] || textPuzzles[0];
  const shuffledTextItems = useMemo(
    () => [...activeTextPuzzle.items].sort(() => Math.random() - 0.5),
    [activeTextPuzzle.id, language],
  );
  const groups = mode === 'image' ? activePuzzle.groups : activeTextPuzzle.groups;
  const currentItems = mode === 'image' ? items : (textOrder || shuffledTextItems);
  const allSolved = solved.length === 4;
  const gameLocked = mistakes === 0 || allSolved;

  const groupIdentity = (group) => group.key || group.name;
  const solvedNames = useMemo(() => new Set(solved.map(groupIdentity)), [solved]);
  const visibleItems = currentItems.filter((item) => !solvedNames.has(item.groupName));

  useEffect(() => {
    document.title = c.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', c.metaDescription);
  }, [c.pageTitle, c.metaDescription]);

  useEffect(() => {
    function closeOverlays(event) {
      if (event.key !== 'Escape') return;
      setHelpOpen(false);
      setGameOverOpen(false);
      setMobileOpen(false);
    }
    window.addEventListener('keydown', closeOverlays);
    return () => window.removeEventListener('keydown', closeOverlays);
  }, []);

  useEffect(() => {
    setTextOrder(null);
  }, [activeTextPuzzle.id]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/puzzles')
      .then((response) => response.ok ? response.json() : { puzzles: [] })
      .then((result) => {
        if (!cancelled) setCommunityTextPuzzles(normalizeCommunityPuzzles(result.puzzles));
      })
      .catch(() => {
        if (!cancelled) setCommunityTextPuzzles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!allSolved) return;
    const name = savedName.trim();
    if (!name) {
      showToast(c.scoreNeedsName);
      return;
    }
    const puzzleKey = mode === 'image'
      ? `image-${difficulty}-${activePuzzle.id || puzzleIndex}`
      : `text-${activeTextPuzzle.id || puzzleIndex}`;
    const scoreKey = `${name.toLowerCase()}|${mode}|${puzzleKey}`;
    if (submittedScores.has(scoreKey)) return;
    setSubmittedScores((prev) => {
      const next = new Set(prev);
      next.add(scoreKey);
      return next;
    });
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: name, mode, puzzleKey }),
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('score submit failed')))
      .then((result) => showToast(c.scoreSaved(result.score?.points || (mode === 'image' ? 3 : 1))))
      .catch(() => {
        setSubmittedScores((prev) => {
          const next = new Set(prev);
          next.delete(scoreKey);
          return next;
        });
      });
  }, [allSolved, savedName, mode, difficulty, activePuzzle.id, activeTextPuzzle.id, puzzleIndex, submittedScores, c]);

  function groupDisplayName(group) {
    if (mode === 'text' || language === 'zh') return group.name;
    const index = groups.findIndex((candidate) => groupIdentity(candidate) === groupIdentity(group));
    return c.imageGroup(index + 1);
  }

  function groupDisplayDescription(group) {
    if (mode === 'text' || language === 'zh') return group.description;
    return c.imageDescription;
  }

  function selectItem(item) {
    if (gameLocked) return;
    if (selected.includes(item.id)) {
      setSelected(selected.filter((value) => value !== item.id));
      return;
    }
    if (selected.length < 4) setSelected([...selected, item.id]);
  }

  function shuffle() {
    if (gameLocked) return;
    const shuffled = [...currentItems].sort(() => Math.random() - 0.5);
    setHistory([...history, currentItems]);
    if (mode === 'image') {
      setItems(shuffled);
    } else {
      setTextOrder(shuffled);
    }
    setSelected([]);
  }

  function undo() {
    if (!history.length || gameLocked) return;
    const previous = history[history.length - 1];
    if (mode === 'image') {
      setItems(previous);
    } else {
      setTextOrder(previous);
    }
    setHistory(history.slice(0, -1));
  }

  function submitGroup() {
    if (selected.length !== 4 || gameLocked) return;
    const selectedItems = currentItems.filter((item) => selected.includes(item.id));
    const selectedGroupNames = new Set(selectedItems.map((item) => item.groupName));
    const match = selectedItems.length === 4 && selectedGroupNames.size === 1
      ? groups.find((group) => groupIdentity(group) === selectedItems[0].groupName)
      : null;
    if (match && !solvedNames.has(groupIdentity(match))) {
      setSolved([...solved, match]);
      setMessage(c.correct(groupDisplayName(match), groupDisplayDescription(match)));
      setSelected([]);
    } else {
      const nextMistakes = Math.max(0, mistakes - 1);
      setMistakes(nextMistakes);
      setMessage(c.wrong);
      setSelected([]);
      if (nextMistakes === 0) setGameOverOpen(true);
    }
  }

  function nextPuzzle() {
    const nextIndex = mode === 'image' ? randomPuzzleIndex(difficulty, puzzleIndex) : (puzzleIndex + 1) % textPuzzles.length;
    setPuzzleIndex(nextIndex);
    setItems([...imagePuzzleCatalog[difficulty][nextIndex % imagePuzzleCatalog[difficulty].length].items].sort(() => Math.random() - 0.5));
    setSelected([]);
    setSolved([]);
    setMistakes(4);
    setHistory([]);
    setTextOrder(null);
    setRevealedHints(new Set());
    setHintsUsed(0);
    setMessage(mode === 'image' ? c.imageMessage : c.nextText);
    setGameOverOpen(false);
    showToast(c.skipped);
  }

  function switchMode(nextMode) {
    const nextImageIndex = 0;
    setMode(nextMode);
    setSelected([]);
    setSolved([]);
    setMistakes(4);
    setHistory([]);
    setTextOrder(null);
    setRevealedHints(new Set());
    setHintsUsed(0);
    if (nextMode === 'image') {
      setPuzzleIndex(nextImageIndex);
      setItems([...imagePuzzleCatalog[difficulty][nextImageIndex].items].sort(() => Math.random() - 0.5));
    }
    setMessage(nextMode === 'image'
      ? c.imageMessage
      : c.textMessage);
  }

  function switchDifficulty(nextDifficulty) {
    if (nextDifficulty === difficulty) return;
    const nextIndex = ['yellow', 'green'].includes(nextDifficulty) ? 0 : randomPuzzleIndex(nextDifficulty);
    setDifficulty(nextDifficulty);
    setPuzzleIndex(nextIndex);
    setItems([...imagePuzzleCatalog[nextDifficulty][nextIndex].items].sort(() => Math.random() - 0.5));
    setSelected([]);
    setSolved([]);
    setMistakes(4);
    setHistory([]);
    setTextOrder(null);
    setRevealedHints(new Set());
    setHintsUsed(0);
    setGameOverOpen(false);
    setMessage(c.difficultyChanged(c.difficultyNames[nextDifficulty]));
  }

  function switchLanguage() {
    const nextLanguage = language === 'zh' ? 'en' : 'zh';
    setLanguage(nextLanguage);
    setMobileOpen(false);
    setSelected([]);
    setSolved([]);
    setHistory([]);
    setTextOrder(null);
    setRevealedHints(new Set());
    setHintsUsed(0);
    setMessage(mode === 'text' ? copy[nextLanguage].textMessage : copy[nextLanguage].imageMessage);
  }
  function showToast(text) {
    setToast(text);
    window.setTimeout(() => setToast(''), 2200);
  }

  function useHint() {
    if (gameLocked) return;
    const candidates = groups.filter(
      (group) => !solvedNames.has(groupIdentity(group)) && !revealedHints.has(groupIdentity(group)),
    );
    if (candidates.length === 0) {
      showToast(c.noHints);
      return;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setRevealedHints((prev) => {
      const next = new Set(prev);
      next.add(groupIdentity(pick));
      return next;
    });
    setHintsUsed((prev) => prev + 1);
    setMessage(c.imageHint(groupDisplayName(pick)));
    showToast(c.imageHint(groupDisplayName(pick)));
  }

  async function shareResult() {
    if (!allSolved) return;
    const result = [
      c.shareHeading,
      ...solved.map((group, index) => `${['🟨', '🟩', '🟦', '🟪'][index]} ${groupDisplayName(group)}`),
      window.location.href,
    ].join('\n');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = result;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('copy failed');
      }
      showToast(c.copied);
    } catch {
      showToast(c.copyFailed);
    }
  }

  function openHelp() {
    setMobileOpen(false);
    setHelpOpen(true);
  }

  return (
    <div className={`app theme-${theme}`}>
      <header className="site-header">
        <div className="brand-row shell">
          <button className="brand" onClick={() => setPage('game')} aria-label={c.homeLabel}>
            <Logo />
            <span>
              <small>{c.daily}</small>
              <strong>{c.brand}</strong>
            </span>
          </button>
          <nav id="primary-nav" className={`primary-nav shell ${mobileOpen ? 'open' : ''}`} aria-label={c.primaryNavLabel}>
            <NavButton active={page === 'game'} icon={<Sparkles size={17} />} onClick={() => { setPage('game'); setMobileOpen(false); }}>{c.navGame}</NavButton>
            <NavButton active={page === 'leaderboard'} icon={<Medal size={17} />} onClick={() => { setPage('leaderboard'); setMobileOpen(false); }}>{c.leaderboard}</NavButton>
            <NavButton active={page === 'contribute'} icon={<PenLine size={17} />} onClick={() => { setPage('contribute'); setMobileOpen(false); }}>{c.contribute}</NavButton>
            <button className="mobile-only" onClick={switchLanguage}><Globe2 size={17} />{c.switchLanguage}</button>
            <button type="button" className="mobile-only" onClick={openHelp}><CircleHelp size={17} />{c.howTo}</button>
          </nav>
          <div className="header-actions">
            <div className="header-mode-switch">
              <button className={mode === 'text' ? 'active' : ''} onClick={() => switchMode('text')}><Type size={16} />{c.textMode}</button>
              <button className={mode === 'image' ? 'active' : ''} onClick={() => switchMode('image')}><Image size={16} />{c.imageMode}</button>
            </div>
            <button className="header-button" onClick={switchLanguage}><Globe2 size={16} /> {c.switchLanguage}</button>
            <button type="button" className="header-button help-button" onClick={openHelp}><CircleHelp size={16} /> {c.howTo}</button>
            <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label={c.menuLabel} aria-expanded={mobileOpen} aria-controls="primary-nav"><Menu size={20} /></button>
          </div>
        </div>
      </header>

      <main className="shell main-shell">
        {page === 'game' && (
          <>
            <section className="mobile-mode-switch" aria-label={c.modeSwitchLabel}>
              <button className={mode === 'text' ? 'active' : ''} onClick={() => switchMode('text')}><Type size={17} />{c.textMode}</button>
              <button className={mode === 'image' ? 'active' : ''} onClick={() => switchMode('image')}><Image size={17} />{c.imageMode}</button>
            </section>

            {mode === 'image' && (
              <section className="difficulty-switch" aria-label={c.difficultyLabel}>
                <strong>{c.difficultyLabel}</strong>
                <div>
                  {difficulties.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`${option.id} ${difficulty === option.id ? 'active' : ''}`}
                      aria-pressed={difficulty === option.id}
                      onClick={() => switchDifficulty(option.id)}
                    >
                      {c.difficultyNames[option.id]}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="mobile-game-heading">
              <div className="mobile-mistakes"><span>{c.mistakes}</span><MistakeHearts count={mistakes} /></div>
              <button type="button" onClick={openHelp}><CircleHelp size={22} />{c.howTo}</button>
            </section>

            <section className="game-stage">
              <div className="stage-top">
                <div className="status-bar" role="status"><Lightbulb size={18} />{c.status}</div>
                <div className="mistakes">
                  <span>{c.mistakes}</span>
                  <MistakeHearts count={mistakes} />
                </div>
              </div>

              <div className="stage-grid">
                <aside className="solved-column" aria-label={c.foundGroups}>
                  <h2>{c.foundGroups}</h2>
                  {groups.map((group, index) => {
                    const found = solvedNames.has(groupIdentity(group));
                    const revealed = revealedHints.has(groupIdentity(group));
                    return (
                      <div
                        key={groupIdentity(group)}
                        className={`group-slot ${group.color} ${!found ? 'hidden-hint' : ''} ${revealed && !found ? 'revealed' : ''}`}
                      >
                        <strong>{found || revealed ? groupDisplayName(group) : c.groupNumber(index + 1)}</strong>
                        <span>{found ? groupDisplayDescription(group) : revealed ? c.hintInCard(groupDisplayName(group)) : c.groupProgressSmall(0)}</span>
                      </div>
                    );
                  })}
                </aside>

                <div className="board-column">
                  <div className={`puzzle-board ${mode}`} role="group" aria-label={c.puzzleBoardLabel}>
                    {visibleItems.map((item, index) => <PuzzleTile key={item.id} item={item} selected={selected.includes(item.id)} disabled={gameLocked} imageMode={mode === 'image'} imageAlt={c.imageAlt} accessibleLabel={mode === 'image' ? c.imageTileLabel(index + 1) : item.label} onClick={() => selectItem(item)} />)}
                  </div>
                  <p className="board-hint"><Lightbulb size={16} />{message}</p>
                </div>

                <aside className="tool-column">
                  <section>
                    <h2>{c.legendTitle}</h2>
                    <div className="legend">
                      {groups.map((group, index) => {
                        const found = solvedNames.has(groupIdentity(group));
                        const revealed = revealedHints.has(groupIdentity(group));
                        return (
                          <div
                            key={groupIdentity(group)}
                            className={`legend-row ${group.color} ${!found ? 'hidden-hint' : ''} ${revealed && !found ? 'revealed-hint' : ''}`}
                          >
                            <strong>{found ? groupDisplayName(group) : c.undiscovered(index + 1)}</strong>
                            <span>{found ? groupDisplayDescription(group) : revealed ? c.hintInCard(groupDisplayName(group)) : c.notFound}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                  <section>
                    <h2>{c.tools}</h2>
                    <div className="tool-buttons">
                      <button disabled={gameLocked} onClick={useHint}><Lightbulb size={18} />{c.hintButton}{hintsUsed > 0 ? ` (${hintsUsed})` : ''}</button>
                      <button disabled={gameLocked} onClick={shuffle}><Shuffle size={18} />{c.shuffle}</button>
                    </div>
                  </section>
                  <section>
                    <h2>{c.actions}</h2>
                    <div className="action-buttons">
                      <button disabled={!history.length || gameLocked} onClick={undo}><Undo2 size={18} />{c.undo}</button>
                      <button onClick={() => setSelected([])}><X size={18} />{c.cancel}</button>
                      <button className="primary" disabled={selected.length !== 4 || gameLocked} onClick={submitGroup}><Send size={18} />{c.submit}</button>
                    </div>
                  </section>
                </aside>
              </div>

              <div className="stage-footer">
                <button className="primary next-button" onClick={nextPuzzle}>{c.next}<RefreshCcw size={18} /></button>
                <button disabled={!allSolved} onClick={shareResult}><Share2 size={18} />{c.share}</button>
              </div>
            </section>

            <section className="mobile-controls">
              <button className="hint-action" disabled={gameLocked} onClick={useHint}><Lightbulb size={18} />{c.hintButton}{hintsUsed > 0 ? ` (${hintsUsed})` : ''}</button>
              <button className="primary submit-action" disabled={selected.length !== 4 || gameLocked} onClick={submitGroup}><Send size={18} />{c.submitGroup}</button>
              <button className="shuffle-action" disabled={gameLocked} onClick={shuffle}><Shuffle size={18} />{c.shuffle}</button>
              <button disabled={!history.length || gameLocked} onClick={undo}><Undo2 size={18} />{c.undo}</button>
              <button className="next-action" onClick={nextPuzzle}><RefreshCcw size={18} />{c.next}</button>
            </section>

            <section className="mobile-legend">
              <div><h2>{c.mobileLegendTitle}</h2><span>{c.foundCount(solved.length)}</span></div>
              <div className="legend">
                {groups.map((group, index) => {
                  const found = solvedNames.has(groupIdentity(group));
                  const revealed = revealedHints.has(groupIdentity(group));
                  return (
                    <div
                      key={groupIdentity(group)}
                      className={`legend-row ${group.color} ${!found ? 'hidden-hint' : ''} ${revealed && !found ? 'revealed-hint' : ''}`}
                    >
                      <strong>{found ? groupDisplayName(group) : c.undiscovered(index + 1)}</strong>
                      <span>{found ? c.found : revealed ? c.hintInCard(groupDisplayName(group)) : c.notFound}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="quick-links">
              <button onClick={() => setPage('leaderboard')}><Medal size={24} /><span><strong>{c.quickLeaderboard}</strong><small>{c.quickLeaderboardSub}</small></span></button>
              <button onClick={() => setPage('contribute')}><PenLine size={24} /><span><strong>{c.quickContribute}</strong><small>{c.quickContributeSub}</small></span></button>
            </section>
          </>
        )}

        {page === 'leaderboard' && <Leaderboard copy={c} nickname={nickname} setNickname={setNickname} savedName={savedName} setSavedName={setSavedName} showToast={showToast} />}
        {page === 'contribute' && <Contribute copy={c} nickname={nickname} setNickname={setNickname} savedName={savedName} setSavedName={setSavedName} showToast={showToast} />}
        <Support copy={c} />
      </main>

      <nav className="mobile-bottom-nav" aria-label={c.bottomNavLabel}>
        <button type="button" className={page === 'game' ? 'active' : ''} onClick={() => setPage('game')}><Sparkles size={19} />{c.navGame}</button>
        <button type="button" className={page === 'leaderboard' ? 'active' : ''} onClick={() => setPage('leaderboard')}><Medal size={19} />{c.leaderboard}</button>
        <button type="button" className={page === 'contribute' ? 'active' : ''} onClick={() => setPage('contribute')}><PenLine size={19} />{c.submitShort}</button>
        <button type="button" onClick={openHelp}><CircleHelp size={19} />{c.play}</button>
      </nav>

      {helpOpen && <HelpModal copy={c} onClose={() => setHelpOpen(false)} />}
      {gameOverOpen && (
        <GameOverModal
          copy={c}
          nickname={nickname}
          setNickname={setNickname}
          setSavedName={setSavedName}
          showToast={showToast}
          onNext={nextPuzzle}
          onClose={() => setGameOverOpen(false)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, children, onClick }) {
  return <button className={active ? 'active' : ''} onClick={onClick}>{icon}{children}</button>;
}

function MistakeHearts({ count }) {
  return <strong className="heart-row">{[0, 1, 2, 3].map((index) => <Heart key={index} size={21} fill={index < count ? 'currentColor' : 'none'} />)}</strong>;
}

function PuzzleTile({ item, selected, disabled, imageMode, imageAlt, accessibleLabel, onClick }) {
  return (
    <button className={`puzzle-tile ${selected ? 'selected' : ''}`} disabled={disabled} onClick={onClick} aria-pressed={selected} aria-label={accessibleLabel}>
      {imageMode ? (
        <img
          className="tile-image"
          src={item.imageUrl}
          alt={imageAlt}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = fallbackImageDataUrl();
          }}
        />
      ) : <strong>{item.label}</strong>}
      {!imageMode && <span>{item.label}</span>}
    </button>
  );
}

function SolvedGroup({ group }) {
  return <div className={`solved-group ${group.color}`}><strong>{group.name}</strong><span>{group.description}</span></div>;
}

function NameField({ copy: c, nickname, setNickname, setSavedName, showToast }) {
  function saveName() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      showToast(c.nicknameRequired);
      return;
    }
    if (trimmed.length > 32) {
      showToast(c.nicknameTooLong);
      return;
    }
    localStorage.setItem('nanamicat.nickname', trimmed);
    setNickname(trimmed);
    setSavedName(trimmed);
    showToast(c.nicknameSaved(trimmed));
  }
  return (
    <div className="name-row">
      <label><span>{c.nickname}</span><input maxLength={32} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={c.nicknamePlaceholder} /></label>
      <button className="primary" onClick={saveName}>{c.saveNickname}</button>
    </div>
  );
}

function Leaderboard(props) {
  const c = props.copy;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/scores')
      .then((response) => response.ok ? response.json() : { leaders: [] })
      .then((result) => {
        if (!cancelled) setRows(Array.isArray(result.leaders) ? result.leaders : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tableRows = rows.map((row) => [
    row.rank,
    row.nickname,
    row.textClears,
    row.imageClears,
    row.score,
    row.latestAt ? new Date(row.latestAt).toLocaleString(c.locale) : '',
  ]);

  return (
    <section className="page-panel">
      <p className="section-label">{c.recordLabel}</p>
      <h1>{c.leaderboard}</h1>
      <p className="page-copy">{c.leaderboardCopy}</p>
      <NameField {...props} />
      <div className="table-wrap">
        <table>
          <thead><tr>{c.tableHeads.map((head) => <th key={head}>{head}</th>)}</tr></thead>
          <tbody>
            {tableRows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{index === 4 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}
            {!loading && !tableRows.length && <tr><td colSpan={c.tableHeads.length}>{c.leaderboardEmpty}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GameOverModal(props) {
  const c = props.copy;
  return (
    <div className="modal-backdrop">
      <div className="modal crayon-panel game-over-modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
        <button className="modal-close" onClick={props.onClose} aria-label={c.cancel} autoFocus><X size={18} /></button>
        <p className="section-label">{c.recordLabel}</p>
        <h2 id="game-over-title">{c.gameOverTitle}</h2>
        <p>{c.gameOverCopy}</p>
        <NameField {...props} />
        <button className="primary" onClick={props.onNext}><RefreshCcw size={18} />{c.keepPlaying}</button>
      </div>
    </div>
  );
}

function Contribute(props) {
  const c = props.copy;
  const emptyGroups = () => [{ name: '', words: '' }];
  const [groups, setGroups] = useState(emptyGroups);
  const [leaveContact, setLeaveContact] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateGroup(index, field, value) {
    setGroups(groups.map((group, groupIndex) => groupIndex === index ? { ...group, [field]: value } : group));
  }

  function addGroup() {
    if (groups.length >= 10) {
      props.showToast(c.maxGroups);
      return;
    }
    setGroups([...groups, { name: '', words: '' }]);
  }

  function removeGroup(index) {
    if (groups.length <= 1) {
      props.showToast(c.minGroups);
      return;
    }
    setGroups(groups.filter((_, groupIndex) => groupIndex !== index));
  }

  async function submitContribution(event) {
    event.preventDefault();
    const normalizedGroups = groups.map((group) => ({
      name: group.name.trim(),
      words: group.words.split(/[,，、]/).map((word) => word.trim()).filter(Boolean),
    }));
    if (!props.nickname.trim()) {
      props.showToast(c.nicknameRequired);
      return;
    }
    if (props.nickname.trim().length > 32) {
      props.showToast(c.nicknameTooLong);
      return;
    }
    if (normalizedGroups.length < 1 || normalizedGroups.length > 10) {
      props.showToast(c.invalidGroupCount);
      return;
    }
    if (normalizedGroups.some((group) => !group.name)) {
      props.showToast(c.invalidGroupName);
      return;
    }
    if (normalizedGroups.some((group) => group.words.length !== 4)) {
      props.showToast(c.invalidWords);
      return;
    }
    if (normalizedGroups.some((group) => group.name.length > 40 || group.words.some((word) => word.length > 40))) {
      props.showToast(c.contributionTextTooLong);
      return;
    }
    const groupNames = normalizedGroups.map((group) => group.name.toLowerCase());
    if (new Set(groupNames).size !== groupNames.length) {
      props.showToast(c.duplicateGroupNames);
      return;
    }
    const allWords = normalizedGroups.flatMap((group) => group.words.map((word) => word.toLowerCase()));
    if (new Set(allWords).size !== allWords.length) {
      props.showToast(c.duplicateWords);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: props.nickname,
          title: normalizedGroups[0]?.name || '',
          contactEmail: leaveContact ? contactEmail.trim() : '',
          groups: normalizedGroups,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || c.submitFailed);
      setGroups(emptyGroups());
      setLeaveContact(false);
      setContactEmail('');
      props.showToast(c.contributionSuccess);
    } catch (error) {
      props.showToast(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-panel">
      <p className="section-label">{c.contributeLabel}</p>
      <h1>{c.contributeTitle}</h1>
      <p className="page-copy">{c.contributeCopy}</p>
      <NameField {...props} />
      <form className="contribute-form" onSubmit={submitContribution}>
        <div className="contact-field">
          <label className="check-row">
            <input type="checkbox" checked={leaveContact} onChange={(event) => setLeaveContact(event.target.checked)} />
            <span>{c.leaveContact}</span>
          </label>
          {leaveContact && (
            <label>
              <span>{c.contactEmail}</span>
              <input type="email" required value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="you@example.com" />
            </label>
          )}
        </div>
        <div className="group-builder-head">
          <span>{c.groupProgress(groups.length)}</span>
          <button type="button" onClick={addGroup} disabled={groups.length >= 10}>{c.addGroup}</button>
        </div>
        <div className="group-fields dynamic">
          {groups.map((group, index) => (
            <fieldset key={index}>
              <legend>
                <span>{c.groupName(index + 1)}</span>
                <button type="button" onClick={() => removeGroup(index)} disabled={groups.length <= 1}>{c.removeGroup}</button>
              </legend>
              <input required maxLength={40} value={group.name} onChange={(event) => updateGroup(index, 'name', event.target.value)} placeholder={c.groupNamePlaceholder(index + 1)} />
              <input required value={group.words} onChange={(event) => updateGroup(index, 'words', event.target.value)} placeholder={c.groupWordsPlaceholder} />
            </fieldset>
          ))}
        </div>
        <button className="primary submit-form" type="submit" disabled={submitting}><Send size={17} />{submitting ? c.submitting : c.submitToAdmin}</button>
      </form>
    </section>
  );
}
function AdminApp() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('nanamicat-admin-key') || '');
  const [keyInput, setKeyInput] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(Boolean(adminKey));
  const [error, setError] = useState('');

  const filteredSubmissions = filter === 'all' ? submissions : submissions.filter((submission) => submission.status === filter);
  const statusLabels = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
  const emailStatusLabels = {
    not_requested: '未留下邮箱',
    not_configured: '邮件服务未配置',
    sent: '感谢邮件已发送',
    failed: '感谢邮件发送失败',
  };

  useEffect(() => {
    if (adminKey) loadSubmissions(adminKey);
  }, [adminKey]);

  async function api(path, options = {}, key = adminKey) {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key, ...options.headers },
    });
    if (response.status === 204) return null;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '后台请求失败。');
    return result;
  }

  async function loadSubmissions(key = adminKey) {
    setLoading(true);
    setError('');
    try {
      const result = await api('/api/admin/submissions', {}, key);
      setSubmissions(result.submissions);
    } catch (requestError) {
      setError(requestError.message);
      sessionStorage.removeItem('nanamicat-admin-key');
      setAdminKey('');
    } finally {
      setLoading(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api('/api/admin/submissions', {}, keyInput);
      sessionStorage.setItem('nanamicat-admin-key', keyInput);
      setSubmissions(result.submissions);
      setAdminKey(keyInput);
      setKeyInput('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id, status) {
    try {
      const result = await api(`/api/admin/submissions/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setSubmissions(submissions.map((submission) => submission.id === id ? result.submission : submission));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeSubmission(id) {
    if (!window.confirm('确定删除这条投稿吗？')) return;
    try {
      await api(`/api/admin/submissions/${id}`, { method: 'DELETE' });
      setSubmissions(submissions.filter((submission) => submission.id !== id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function logout() {
    sessionStorage.removeItem('nanamicat-admin-key');
    setAdminKey('');
    setSubmissions([]);
  }

  if (!adminKey) {
    return (
      <div className="admin-app">
        <main className="admin-login crayon-panel">
          <Logo />
          <p className="section-label">四格寻踪后台</p>
          <h1>管理员登录</h1>
          <p>输入管理员密钥后查看游客提交的谜题。</p>
          <form onSubmit={login}>
            <label><span>管理员密钥</span><input type="password" required value={keyInput} onChange={(event) => setKeyInput(event.target.value)} placeholder="输入 ADMIN_KEY" /></label>
            <button className="primary" type="submit" disabled={loading}><LockKeyhole size={17} />{loading ? '验证中...' : '进入后台'}</button>
          </form>
          {error && <p className="admin-error">{error}</p>}
          <a href="/">返回游戏</a>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="shell">
          <div className="admin-brand"><Logo /><span><small>四格寻踪</small><strong>游客投稿后台</strong></span></div>
          <div className="admin-header-actions">
            <a href="/">返回游戏</a>
            <button type="button" onClick={logout}><LogOut size={16} />退出</button>
          </div>
        </div>
      </header>
      <main className="shell admin-main">
        <section className="admin-summary">
          <div><span>全部投稿</span><strong>{submissions.length}</strong></div>
          <div className="yellow"><span>待审核</span><strong>{submissions.filter((item) => item.status === 'pending').length}</strong></div>
          <div className="green"><span>已通过</span><strong>{submissions.filter((item) => item.status === 'approved').length}</strong></div>
          <div className="purple"><span>已拒绝</span><strong>{submissions.filter((item) => item.status === 'rejected').length}</strong></div>
        </section>
        <section className="admin-toolbar">
          <div>
            <p className="admin-kicker">审核队列</p>
            <h1>游客留下的题目</h1>
          </div>
          <div className="admin-filters">
            {[
              ['pending', '待审核'],
              ['approved', '已通过'],
              ['rejected', '已拒绝'],
              ['all', '全部'],
            ].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
          </div>
        </section>
        {error && <p className="admin-error">{error}</p>}
        {loading ? <p className="admin-empty">正在读取投稿...</p> : (
          <section className="submission-list">
            {filteredSubmissions.length === 0 && <p className="admin-empty">当前没有这类投稿。</p>}
            {filteredSubmissions.map((submission) => (
              <article className="submission-card" key={submission.id}>
                <div className="submission-card-head">
                  <div>
                    <span className={`status-badge ${submission.status}`}>{statusLabels[submission.status]}</span>
                    <h2>{submission.title}</h2>
                    <p>投稿人：{submission.nickname} · {new Date(submission.createdAt).toLocaleString('zh-CN')}</p>
                    <p className="submission-contact">
                      <Mail size={14} />
                      {submission.contactEmail ? submission.contactEmail : '未留下联系邮箱'}
                      <span>{emailStatusLabels[submission.thankYouEmail?.status || 'not_requested']}</span>
                    </p>
                  </div>
                </div>
                <div className="submission-groups">
                  {submission.groups.map((group, index) => (
                    <div className={['yellow', 'green', 'blue', 'purple'][index]} key={`${submission.id}-${index}`}>
                      <strong>{group.name}</strong>
                      <span>{group.words.join('、')}</span>
                    </div>
                  ))}
                </div>
                <div className="submission-actions">
                  <button className="approve" onClick={() => setStatus(submission.id, 'approved')}><Check size={16} />通过题目</button>
                  <button className="reject" onClick={() => setStatus(submission.id, 'rejected')}><X size={16} />拒绝题目</button>
                  <button onClick={() => setStatus(submission.id, 'pending')}><RefreshCcw size={16} />移回待审核</button>
                  <button className="delete" onClick={() => removeSubmission(submission.id)}><Trash2 size={16} />删除题目</button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
function Support({ copy: c }) {
  const [qrOpen, setQrOpen] = useState(false);
  useEffect(() => {
    if (!qrOpen) return undefined;
    function closeQr(event) {
      if (event.key === 'Escape') setQrOpen(false);
    }
    window.addEventListener('keydown', closeQr);
    return () => window.removeEventListener('keydown', closeQr);
  }, [qrOpen]);
  return (
    <>
      <aside className="support-panel" aria-label={c.supportLabel}>
        <div>
          <p className="section-label">{c.supportLabel}</p>
          <h2>{c.supportTitle}</h2>
          <p>{c.supportCopy}</p>
        </div>
        <figure>
          <button type="button" className="qr-button" onClick={() => setQrOpen(true)} aria-label={c.enlargeQr}>
            <img src="/wechat-pay.jpg" alt="WeChat Pay" />
          </button>
          <figcaption><Coffee size={15} />WeChat Pay</figcaption>
        </figure>
      </aside>
      {qrOpen && (
        <div className="modal-backdrop qr-backdrop" onClick={() => setQrOpen(false)}>
          <section className="modal crayon-panel qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setQrOpen(false)} aria-label={c.cancel} autoFocus><X size={20} /></button>
            <p className="section-label">{c.supportLabel}</p>
            <h2 id="qr-title">{c.qrTitle}</h2>
            <img src="/wechat-pay.jpg" alt="WeChat Pay" />
          </section>
        </div>
      )}
    </>
  );
}

function HelpModal({ copy: c, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal crayon-panel" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label={c.cancel} autoFocus><X size={20} /></button>
        <p className="section-label">{c.howTo}</p>
        <h2 id="help-title">{c.helpTitle}</h2>
        <ol className="help-steps">
          {c.helpSteps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
        </ol>
        <button type="button" className="primary" onClick={onClose}>{c.start}</button>
      </section>
    </div>
  );
}
const isAdminRoute = /^\/admin(?:\/|$)/.test(window.location.pathname)
  || /^\/control-panel\/?$/.test(window.location.pathname);
createRoot(document.getElementById('root')).render(isAdminRoute ? <AdminApp /> : <App />);





