# NanamiCat Puzzle Engine — Swift 移植对照

> 自动生成自 `src/main.jsx`。逻辑必须与 Web 完全一致以保证 `puzzleId` 与计分去重。

### `textGroupBank`

```javascript
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
```

### `puzzleThemes`

```javascript
const puzzleThemes = [
  "烟火中国", "街头日常", "纸上风物", "系统背面", "意义滑移", "抽象关系", "内在牵引", "隐喻机器", "城市缝隙", "屏幕生活",
  "旧物新义", "时间暗线", "边界游戏", "秩序与例外", "声音地图", "人情规则", "手艺与算法", "观看方式", "流动结构", "记忆容器"
];
```

### `redHerringNotes`

```javascript
const redHerringNotes = [
  "有些词共享场景，但真正分组看的是用途。",
  "有一组会被近义动作干扰，别只看字面。",
  "两组都像工具，关键差别在是否承担连接。",
  "注意红鲱鱼：一个词看似同类，其实属于更抽象的关系。",
  "这题故意让日常词和系统词互相靠近。",
  "不要只按名词分类，试着看动作和结构。"
];
```

### `englishPuzzleTerms`

```javascript
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
```



## 生成算法（与 Web 一致）

### `getTodayIndex(max)`
```javascript
const now = new Date();
return (now.getUTCFullYear() * 372 + now.getUTCMonth() * 31 + now.getUTCDate()) % max;
```

### `buildTextPuzzles()`
- `textPuzzleCount = 100`
- 每题 `difficulty = min(4, floor(index / 25) + 1)`
- `candidates = textGroupBank.filter(g => g.level <= difficulty)`
- `offsets = [0,7,19,31].map(step => (index*5 + step + difficulty*3) % candidates.length)`
- 4 组各取 `candidates[offsets[groupSlot]]`，item id: `text-{n}-{groupSlot}-{word}` 等价 `textItem(word, puzzleId)`
- puzzle id: `text-{String(index+1).padStart(3,'0')}`

### 游戏常量
| 常量 | 值 |
|------|-----|
| maxMistakes | 4 |
| textPuzzleCount | 100 |

### Swift 文件映射
| Web | Swift |
|-----|-------|
| textGroupBank | `PuzzleData.textGroupBank` |
| buildTextPuzzles | `PuzzleEngine.buildTextPuzzles()` |
| getTodayIndex | `PuzzleEngine.todayIndex(count:)` |
| englishPuzzleTerms | `PuzzleLocalization.terms` |
| localStorage keys | `UserDefaultsKeys` |

