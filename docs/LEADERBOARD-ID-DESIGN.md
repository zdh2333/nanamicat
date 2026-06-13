# 排行榜 + 玩家身份改造设计文档

## 目标

让每个玩家拥有**永久不变的 playerId**，排行榜的累计成绩绑定到 playerId；昵称只是显示字段，可改，改后排行榜自动反映。这解决：

1. 同一玩家改名 → 排行榜**保留**该玩家的累积
2. 玩家不主动点"保存昵称"也要有默认昵称（地区+XXXX）出现在排行榜上
3. 玩家每次刷新页面不会变 ID，因此不会重复刷分

## 数据流

### 玩家身份生命周期

```
页面加载
  ↓
localStorage.nanamicat.playerId ?
  ├─ 存在 → 直接用
  └─ 不存在 → 生成 player_<uuid>，调 /api/player (POST) 注册
        ↓
       后端检查 playerId 是否已存在
        ├─ 存在 → 更新 nickname + updated_at
        └─ 不存在 → INSERT 新行

localStorage.nanamicat.nickname ?
  ├─ 存在 → 用
  └─ 不存在 → 生成 "地区+XXXX" 形式（例 "Tokyo1234"）
        持久化
        调 /api/player (POST) 把默认昵称传给后端
        ↓
       后端会更新或创建 player
```

### 玩家改名流程

```
玩家在排行榜页改昵称
  ↓
失焦或按回车
  ↓
setNickname(newName) 立即
  ↓
saveNickname() 调 /api/player (POST) { playerId, nickname: newName }
  ↓
后端 UPDATE players SET nickname = newName WHERE id = playerId
  ↓
前端收到更新后的 player
  ↓
loadLeaderboard() 重拉排行榜
loadAdmin() 重拉 admin 面板（如有权限）
```

### 通关流程

```
玩家完成 puzzle
  ↓
submitScore() 调 /api/score (POST) { playerId, nickname, mode, puzzleId }
  ↓
后端：
  1. SELECT * FROM players WHERE id = playerId → 拿到当前 player
  2. INSERT OR IGNORE INTO score_events
     dedupe_key = `${playerId}|${mode}|${puzzleId}`
     → 同一玩家同一题不重复记分
  3. 如果真插入 → UPDATE players SET text_clears += 1, total_score += 1
  ↓
前端收到 updated player → setRecentCompletions → setStreak
```

## 数据模型（后端 D1）

### `players` 表（保持原结构）
- `id` (TEXT) — 唯一主键，前端生成的 `player_<uuid>`
- `nickname` (TEXT) — 显示字段
- `text_clears` (INTEGER) — 累计通关数
- `total_score` (INTEGER) — 累计分数
- `created_at` / `updated_at` (TEXT)

### `score_events` 表
- `id`, `player_id`, `nickname`, `mode`, `puzzle_id`, `points`, `created_at`
- `dedupe_key = player_id|mode|puzzle_id` 防止重刷同一题

> 关键：**`players.id` 才是主键**，不是 nickname。**改 nickname 不会分裂**成多行。

## 端改动

### 前端 (`src/main.jsx`)

#### 1. 启动时自动初始化 player

新增 useEffect: 首次加载 → 检查 `nanamicat.playerId` / `nanamicat.nickname`，缺哪个就生成哪个，调 `/api/player` 注册。

```js
useEffect(() => {
  let cancelled = false;
  (async () => {
    let id = getStored("nanamicat.playerId", "");
    let nick = getStored("nanamicat.nickname", "");
    if (!id) {
      id = `player_${crypto.randomUUID()}`;
      setStored("nanamicat.playerId", id);
      setPlayerId(id);
    }
    if (!nick) {
      const region = guessRegion();  // "Tokyo", "Beijing", "Singapore" 等
      const suffix = String(Math.floor(1000 + Math.random() * 9000));
      nick = `${region}${suffix}`;
      setStored("nanamicat.nickname", nick);
      setNickname(nick);
    }
    if (!cancelled) {
      // 把本地状态上报给后端（创建或更新 nickname）
      try {
        const payload = await api("/api/player", {
          method: "POST",
          body: JSON.stringify({ playerId: id, nickname: nick })
        });
        // 同步 playerId（后端可能分配了不同的）
        if (payload?.player?.id) {
          setPlayerId(payload.player.id);
          setStored("nanamicat.playerId", payload.player.id);
        }
      } catch {}
    }
  })();
  return () => { cancelled = true; };
}, []);
```

#### 2. 昵称输入框预填

排行榜/贡献面板里 `<input value={nickname}>` 已经有 `nickname` 状态（来自 localStorage 或自动生成），不需要改。

#### 3. 改名 → 重拉排行榜

```js
async function saveNickname() {
  const cleanName = nickname.trim();
  if (!cleanName || !playerId) return;
  try {
    const payload = await api("/api/player", {
      method: "POST",
      body: JSON.stringify({ playerId, nickname: cleanName })
    });
    setStored("nanamicat.nickname", cleanName);
    if (payload?.player?.id) {
      setPlayerId(payload.player.id);
      setStored("nanamicat.playerId", payload.player.id);
    }
    // 强制重拉：排行榜、admin、玩家自己累积都更新
    loadLeaderboard({ showError: true });
    if (view === "admin") loadAdmin();
    setApiNotice(locale === "zh" ? "昵称已更新" : "Nickname updated");
  } catch (err) {
    setApiNotice(err.message);
  }
}
```

#### 4. `ensurePlayer` 改为只读本地 + 改昵称后已注册

`ensurePlayer()` 现在不需要在 `submitScore` 里再注册 — 启动时已经注册了。改为：

```js
async function ensurePlayer() {
  // Make sure we have a playerId; if not, the boot effect should have
  // generated one. If somehow we don't (e.g. localStorage cleared in
  // another tab), fall back to a synchronous empty-nickname return so
  // we don't submit a score that fails server-side validation.
  if (!playerId) {
    return null;
  }
  // If the local nickname was changed but the server hasn't heard yet,
  // push the update.
  const cleanName = nickname.trim();
  if (cleanName) {
    try {
      const payload = await api("/api/player", {
        method: "POST",
        body: JSON.stringify({ playerId, nickname: cleanName })
      });
      if (payload?.player?.id) {
        setPlayerId(payload.player.id);
        setStored("nanamicat.playerId", payload.player.id);
      }
    } catch {}
  }
  return { id: playerId, nickname: nickname.trim() };
}
```

#### 5. `guessRegion` helper

```js
function guessRegion() {
  // Best-effort region guess from browser locale. The user can edit it.
  const lang = (navigator.language || "en").toLowerCase();
  if (lang.includes("ja")) return "Tokyo";
  if (lang.includes("zh-tw") || lang.includes("zh-hk")) return "Taipei";
  if (lang.includes("zh")) return "Beijing";
  if (lang.startsWith("ko")) return "Seoul";
  if (lang.startsWith("es")) return "Madrid";
  if (lang.startsWith("fr")) return "Paris";
  if (lang.startsWith("de")) return "Berlin";
  return "Player";
}
```

### 后端 (`worker/nanamicat-api.js`)

**现状已经按 playerId 累加**（line 219-227 in dev-api.js），worker/nanamicat-api.js 同样 (line 511-518)。**无需大改**，只加：

#### `/api/player` 行为强化

- 收到 `playerId` 时，先按 ID 查 → 找到 → UPDATE nickname + updated_at
- 没找到但 nickname 存在 → 查 nickname → 找到 → UPDATE（防止旧玩家换浏览器后丢 ID 但保留昵称）
- 都没找到 → 创建新行（保留后端生成的 ID，但用前端的 playerId）
- 关键：**用前端传来的 playerId 作为 ID**，不重新生成

## 验证

| 场景 | 期望 |
|---|---|
| 首次访问 | localStorage 生成 playerId + 默认昵称 "Tokyo1234"，后端创建 player |
| 通关 1 题 | 排行榜显示 "Tokyo1234" 1 次通关 |
| 改名 "TakoFan"，通关 1 题 | 排行榜显示 "TakoFan" 2 次通关（不分裂） |
| 清空 localStorage，改名 "TakoFan"，通关 1 题 | 后端按 nickname 查 → 找到旧 player → 改名 + 累加 1 次 |
| 同一玩家 5 次刷新页面 | playerId 不变，score 不重刷（dedupe_key 生效） |
| 排行榜 GET | 按 total_score 排序，玩家累计数对 |
