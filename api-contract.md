# API 接口契约（api-contract）

> 版本：v0.1（Day 15 制定）
> 性质：前后端共同的约定。接口改了先改这里，再写代码。
> 来源：TECH_DESIGN.md「五、API」的运行化落地；Day 16–20 按此逐个实现。

---

## 一、基础约定

| 项 | 值 |
|---|---|
| API 网关基址 | `https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com` |
| 数据格式 | 请求与响应均为 JSON（`Content-Type: application/json`） |
| 时间格式 | ISO 8601 UTC 字符串（如 `2026-10-01T15:23:16.003Z`） |
| 字符编码 | UTF-8 |
| 认证方式 | `Authorization: Bearer <token>`（JWT，7 天过期；Day 19 接入，此前的接口无需认证） |

### 统一错误格式

```json
{
  "ok": false,
  "error": { "code": "NOT_FOUND", "message": "条目不存在" }
}
```

| HTTP 状态 | code | 场景 |
|---|---|---|
| 400 | `BAD_REQUEST` | 参数缺失/格式错误 |
| 401 | `UNAUTHORIZED` | token 缺失或过期 |
| 404 | `NOT_FOUND` | 资源不存在（如无效的热搜 id） |
| 500 | `INTERNAL` | 服务端异常（前端展示兜底话术 + 重试） |

成功响应一律带 `"ok": true`。

---

## 二、已上线接口（Day 15 实测通过）

### GET /api/health — 健康检查

- **用途**：验证「云函数 → 公网」链路存活；前端错误页的「重试」也可先打它探活。
- **认证**：无
- **请求参数**：无
- **响应 200**：

```json
{
  "ok": true,
  "service": "trend-wave",
  "time": "2026-10-01T15:23:16.003Z"
}
```

- **实测记录**：2026-10-01 首次部署即通（HTTP 200，耗时 0.58s）。

---

## 三、待实现接口（Day 16–20 按此实现，实现一个勾一个）

### GET /api/hot — 全平台热搜列表 ✅ 已上线（2026-10-07 实测通过）

- **认证**：无（公开数据）
- **查询参数**：`platforms`（可选，逗号分隔，默认全部 6 个）
- **响应 200**：

```json
{
  "ok": true,
  "items": [
    {
      "id": "weibo-1",
      "platform": "weibo",
      "title": "人口老龄化数据再创新高",
      "rank": 1,
      "heat": 9876543,
      "category": "society",
      "publishedAt": "2026-10-01T12:00:00.000Z",
      "url": "https://..."
    }
  ]
}
```

- **约定**：`heat` 为整数（原始热度）；`category` 枚举 = entertainment / society / tech / finance / sports / gaming / **general**（general 为 Day 17 真实同步数据专用，三个公开接口不提供分类；前端配色 Day 18 跟上）。字段与前端现有 `mockData.js` 的 HotItem 结构**一字不差**，Day 17 只换数据源不改前端。
- **实现说明**：云函数 `hot` 通过 CloudBase HTTP API（PostgREST）读 `trends` 表，取**最新有数据的 trend_date**（不写死"今天"，同步没跑的早晨不空屏）。取数密钥 = 函数环境变量（`CLOUDBASE_API_KEY` 或控制台注入的 `CLOUDBASE_APIKEY`，两个名字都认）。
- **实测记录**：2026-10-07 公网 200，返回 12 条（6 平台 × 2），`heat` 为整数、字段 camelCase 与契约一致。

### POST /api/auth/login — 登录（Day 19）

- **请求**：`{ "username": "yolo", "password": "..." }`（密码 bcrypt 哈希比对）
- **响应 200**：`{ "ok": true, "token": "<jwt>", "expiresAt": "..." }`
- **响应 401**：`{ "ok": false, "error": { "code": "UNAUTHORIZED", "message": "用户名或密码错误" } }`

### GET /api/favorite — 收藏列表 ✅ 过渡版已上线（2026-10-07；Day 19 换 Bearer token）

- **认证（当前过渡版）**：`userKey` 走查询参数（`?userKey=...`），Day 19 起改为 `Authorization: Bearer <jwt>`。返回该用户收藏，按收藏时间倒序（与前端 localStorage 头插法一致）。
- **响应 200**：`{ "ok": true, "items": [ /* HotItem[] */ ] }`
- **响应 400**（缺 userKey）：`{ "ok": false, "error": { "code": "BAD_REQUEST", "message": "缺少 userKey" } }`
- **实现说明**：云函数 `favorite` 走 HTTP API 做 `favorites JOIN trends`，密钥取法同 `hot`。
- **实测记录**：2026-10-07 公网 200（`seed-user-yolo` 返回 4 条倒序）；缺参数返回 400。

### POST /api/favorite — 添加收藏（Day 19）

- **请求**：`{ "itemId": "weibo-1" }`；**响应 200**：`{ "ok": true }`
- **重复添加**：幂等，仍返回 200。

### DELETE /api/favorite/:itemId — 取消收藏（Day 19）

- **响应 200**：`{ "ok": true }`；未收藏时删除也返回 200（幂等）。

### GET /api/preferences — 个性化偏好（Day 20）

- **认证**：需要。返回 `{ "ok": true, "platforms": ["weibo","zhihu","douyin"] }`

### PUT /api/preferences — 保存偏好（Day 20）

- **请求**：`{ "platforms": ["weibo","zhihu","douyin"] }`
- **校验**：数组、1–3 个、值在 6 平台枚举内，否则 400。
- **响应 200**：`{ "ok": true }`

### POST /api/sync — 热搜同步（Day 17 板块②）

- **用途**：拉取微博 / B站 / 抖音三个公开榜单（附录 F 指定来源），upsert 进 `trends` 表。手动触发；日后的定时任务复用同一函数。
- **鉴权（当前过渡版）**：可选。环境变量 `SYNC_TOKEN` 配置了才校验（请求头 `x-sync-token` 相等才执行，否则 401）；未配置则放行——被恶意触发的最坏结果是幂等重复写入。
- **请求**：无 body 要求。
- **响应 200**（至少一个平台成功）：

```json
{
  "ok": true,
  "date": "2026-10-07",
  "platforms": ["weibo: 30 条", "bilibili: 30 条", "douyin: 失败 — 抖音返回 200 但列表为空，通常是请求头缺少 Referer"]
}
```

- **响应 502**（三平台全部失败）：`{ "ok": false, "error": { "code": "UPSTREAM", "message": "三个平台全部抓取失败：微博（…）；B站（…）；抖音（…）" } }`
- **实现约定**：
  - 每平台取前 30 条；三平台并行，单平台失败不影响其他；
  - `trend_date` 按**北京时间**（UTC+8）计算，避免云函数 UTC 时区在 0–8 点把当天算成前一天；
  - 写入用 PostgREST upsert（`on_conflict=platform,title,trend_date` + `Prefer: resolution=merge-duplicates`），重复执行不产生重复行；
  - 同步数据 `category` 固定 `'general'`（三个公开接口不提供分类）；`id` = `{platform}-{trend_date}-{md5(title) 前 8 位}`（不含 rank——排名会变，id 必须稳定，`favorites` 外键锚定它）。

---

## 四、跨域（Day 20 统一处理）

前端 `https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com` 与 API 网关不同源，Day 20 在云函数侧统一加 CORS 响应头（`Access-Control-Allow-Origin` 指向前端域名 + OPTIONS 预检）。Day 15–19 期间用浏览器直接访问/联调，不受影响。

---

## 五、数据模型（Day 16 定稿，建表脚本见 `db/schema.sql`）

> 表结构从本契约的返回形状推导，与前端 `mockData.js` 的 HotItem 字段一字不差。字段名用 snake_case（数据库侧），接口 JSON 保持 camelCase（如 `publishedAt` ↔ `published_at`），云函数层做映射。

### trends — 热搜条目（GET /api/hot 的数据源）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | 平台名+序号（如 `weibo-1`），与 HotItem.id 同格式 |
| platform | TEXT CHECK | 6 平台枚举：weibo/zhihu/douyin/baidu/xiaohongshu/bilibili |
| title | TEXT NOT NULL | 热搜标题 |
| rank | SMALLINT | 排名（≥1，TOP50） |
| heat | BIGINT | 原始热度整数 |
| category | TEXT CHECK | 7 分类枚举：entertainment/society/tech/finance/sports/gaming/general（general 为 Day 17 同步数据专用） |
| url | TEXT | 跳原文外链（可空） |
| published_at | TIMESTAMPTZ | 抓取/发布时刻，API 层转 ISO 8601 UTC |
| trend_date | DATE | 所属榜单日期 |

- 唯一约束：`(platform, title, trend_date)` — 同平台同日不重录，Day 17 重复抓取的判重依据。
- 索引：`(trend_date, platform, rank)` — /api/hot 主查询路径。

### favorites — 收藏（Day 19 favorite 接口的数据源）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGSERIAL PK | 自增 |
| user_key | TEXT NOT NULL | 匿名用户标识（本课程不登录不建用户表；Day 23+ 有账号体系后再升级） |
| item_id | TEXT FK → trends(id) | ON DELETE CASCADE，条目删除时收藏级联清理 |
| created_at | TIMESTAMPTZ | 收藏时间，列表按它倒序（对齐前端头插法） |

- 唯一约束：`(user_key, item_id)` — 幂等收藏的实现基础。
- 种子脚本：`db/seed.sql`（12 行 trends + 5 行 favorites，可重复执行；**Day 20 上线后禁止执行**）。

---

## 六、变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-10-01 | v0.1 | Day 15 制定：/api/health 上线实测通过，其余 8 个接口定型待实现 |
| 2026-10-04 | v0.2 | Day 16 回写：trends / favorites 两表定稿，建表与种子脚本入库 `db/` |
| 2026-10-07 | v0.3 | Day 17：GET /api/hot 上线（读 trends）；GET /api/favorite 过渡版上线（userKey 走查询参数，Day 19 换 token）。云函数取数走 HTTP API + 服务端 API Key（环境变量，不入仓库） |
| 2026-10-07 | v0.4 | Day 17 板块②：新增 POST /api/sync（微博/B站/抖音公开榜单同步，幂等 upsert）；category 枚举新增 general（真库已 ALTER，schema.sql 同步）；同步数据 id 改为 platform-date-标题hash 格式 |
