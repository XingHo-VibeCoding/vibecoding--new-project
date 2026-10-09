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

### POST /api/favorite — 添加收藏（Day 18 实现上线）

- **认证（当前过渡版）**：`userKey` 放请求 body（与 GET 的查询参数过渡版同源，Day 19 起改为 `Authorization: Bearer <jwt>`）。
- **请求**：`{ "userKey": "seed-user-yolo", "itemId": "weibo-2026-10-08-76363973" }`
- **校验（400 BAD_REQUEST，中文说明缺了什么）**：
  - `userKey` / `itemId` 必填、非空字符串，超长拒绝（userKey ≤ 64 字符、itemId ≤ 128 字符）；
  - `itemId` 必须真实存在于 `trends` 表（防外键报错裸奔到用户面前，返回「该热搜不存在或已下榜」）。
- **防重复（409 DUPLICATE）**：同一 `userKey + itemId` 已在收藏中 → 返回 `{ok:false, error:{code:"DUPLICATE", message:"该热搜已在收藏中"}}`，数据库行数不增。（Day 18 修订：原 v0.4 定的「幂等 200」改为明确拒绝，对齐手册 Day 18 完成标准——重复可被感知，错误信息可读。）
- **响应 200**：`{ "ok": true }`

### DELETE /api/favorite — 取消收藏（Day 22 实现上线）

- **认证（当前过渡版）**：`userKey` 走查询参数（与 GET 一致；Day 19 起改 `Authorization: Bearer <jwt>`）。
- **请求**：`DELETE /api/favorite?userKey=seed-user-yolo&itemId=weibo-2026-10-08-76363973`
- **校验（400 BAD_REQUEST）**：
  - `userKey` / `itemId` 必填、非空字符串，超长拒绝（userKey ≤ 64 字符、itemId ≤ 128 字符）；
  - 不再单独校验 `itemId` 是否存在于 `trends` 表——取消不存在的收藏是合法的"幂等清理"，返 200；即使 `itemId` 在 `trends` 已被删除（外键 ON DELETE CASCADE 已级联），DELETE favorites 也会返 0 行，**不会有外键错误**。
- **幂等**：未收藏时调用返 200 `{ ok: true }`（PostgREST `DELETE with filter` 不影响行时不报错，0 行响应在仓库层吞掉、不返 404）。
- **响应 200**：`{ "ok": true }`
- **实现说明**：云函数 `favorite` 走 HTTP API `DELETE /v1/rdb/rest/favorites?user_key=eq.&item_id=eq.`，`Prefer: return=minimal` 不取回行。一步走完（不做 `existsByUserAndItem` + `delete` 两步）以减少网络往返与并发幻读。
- **实测记录**：2026-10-09 部署后本机用现有 user 验证：先 POST 收藏 → DELETE 取消 → GET 列表为空；再 DELETE 一次（幂等）→ 仍 200。

### GET /api/preferences — 个性化偏好（Day 20）

- **认证**：需要。返回 `{ "ok": true, "platforms": ["weibo","zhihu","douyin"] }`

### PUT /api/preferences — 保存偏好（Day 20）

- **请求**：`{ "platforms": ["weibo","zhihu","douyin"] }`
- **校验**：数组、1–3 个、值在 6 平台枚举内，否则 400。
- **响应 200**：`{ "ok": true }`

### POST /api/sync — 热搜同步（Day 17 板块②）

- **用途**：拉取微博 / B站 / 抖音 / 百度四个公开榜单（附录 F 指定来源 + Day 21 新增百度），upsert 进 `trends` 表。手动触发；日后的定时任务复用同一函数。
- **鉴权（当前过渡版）**：可选。环境变量 `SYNC_TOKEN` 配置了才校验（请求头 `x-sync-token` 相等才执行，否则 401）；未配置则放行——被恶意触发的最坏结果是幂等重复写入。
- **请求**：无 body 要求。
- **响应 200**（至少一个平台成功）：

```json
{
  "ok": true,
  "date": "2026-10-08",
  "platforms": ["weibo: 30 条", "bilibili: 50 条", "douyin: 45 条", "baidu: 50 条"]
}
```

- **响应 502**（全部平台失败）：`{ "ok": false, "error": { "code": "UPSTREAM", "message": "全部平台抓取失败：微博（…）；B站（…）；抖音（…）；百度（…）" } }`
- **实现约定**：
  - 条数口径按各平台接口的实际返回：微博 30 条、B站 50 条（接口 `limit=50`）、抖音取接口返回的全部（约 45 条）、百度 50 条；四平台并行，单平台失败不影响其他；
  - `trend_date` 按**北京时间**（UTC+8）计算，避免云函数 UTC 时区在 0–8 点把当天算成前一天；
  - 写入用 PostgREST upsert（`on_conflict=platform,title,trend_date` + `Prefer: resolution=merge-duplicates`），重复执行不产生重复行；
  - 同步数据 `category` 固定 `'general'`（公开接口不提供分类）；`id` = `{platform}-{trend_date}-{md5(title) 前 8 位}`（不含 rank——排名会变，id 必须稳定，`favorites` 外键锚定它）。
  - **百度特例（Day 21）**：响应结构为 `data.cards[]` → 取 `component === 'tabTextList'` → `content[0].content[]`；数组第 0 项是 `isTop: true` 的置顶条目（不带 `index`），**必须剔除**，否则会和真正的第 1 名撞 `rank`；其余按下标重新编号。该接口**不返回热度值**，`heat` 记 `0`，前端对 `heat === 0` 的条目隐藏热度块。
- **未接入的平台（Day 21 实测）**：知乎 `api/v3/feed/topstory/hot-lists/total` 返回 **401 身份未经过验证**（需登录 Cookie，云端无稳定凭据）；小红书无公开榜单接口（需登录态 + 前端签名）。两者不做假数据填充，前端在选择栏与空列标注「数据源筹备中」。

---

## 四、跨域（Day 20 统一处理）

前端 `https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com` 与 API 网关不同源，Day 20 在云函数侧统一加 CORS 响应头（`Access-Control-Allow-Origin` 指向前端域名 + OPTIONS 预检）。Day 15–19 期间用浏览器直接访问/联调，不受影响。

---

## 五、PATCH 范围说明（Day 22 决议）

学习计划 Day 22「补齐修改和删除：PATCH / DELETE」原意是数据操作闭环。本项目当前设计下，**PATCH 接口不暴露**。原因如下：

| 资源 | 字段 | 是否需要 PATCH | 说明 |
|---|---|---|---|
| `favorites` | user_key / item_id / created_at | ❌ | 开关式收藏：可加可删，但**没有可改字段**（收藏时间改了没意义，user/item 不能改） |
| `trends` | platform / title / rank / heat / category / url / published_at / trend_date | ❌ | 完全由 `POST /api/sync` 写入；用户层无改写入口 |

如未来需要给收藏加「备注」「分组」「标签」等可改字段，再补 `PATCH /api/favorite/:itemId`；给热搜加「手动校正分类」功能，再补 `PATCH /api/hot/:id`。**当前不做**。

---

## 六、数据模型（Day 16 定稿，建表脚本见 `db/schema.sql`）

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

## 七、变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-10-01 | v0.1 | Day 15 制定：/api/health 上线实测通过，其余 8 个接口定型待实现 |
| 2026-10-04 | v0.2 | Day 16 回写：trends / favorites 两表定稿，建表与种子脚本入库 `db/` |
| 2026-10-07 | v0.3 | Day 17：GET /api/hot 上线（读 trends）；GET /api/favorite 过渡版上线（userKey 走查询参数，Day 19 换 token）。云函数取数走 HTTP API + 服务端 API Key（环境变量，不入仓库） |
| 2026-10-07 | v0.4 | Day 17 板块②：新增 POST /api/sync（微博/B站/抖音公开榜单同步，幂等 upsert）；category 枚举新增 general（真库已 ALTER，schema.sql 同步）；同步数据 id 改为 platform-date-标题hash 格式 |
| 2026-10-08 | v0.5 | Day 18：POST /api/favorite 定稿并上线——重复收藏由「幂等 200」改为 409 明确拒绝（对齐手册 Day 18 完成标准），补齐 userKey/itemId 校验与 itemId 存在性检查 |
| 2026-10-08 | v0.6 | Day 21：POST /api/sync 新增百度数据源（榜单 3 → 4 个平台），明确百度置顶项剔除与 heat=0 口径；记录知乎 401 / 小红书无公开接口的实测结论与「数据源筹备中」的降级约定 |
| 2026-10-09 | v0.7 | Day 22：DELETE /api/favorite 实现上线（取消收藏，幂等 200）；新增「五、PATCH 范围说明」——favorites 是开关式、trends 由 sync 写，本项目当前无可写字段，**PATCH 接口不暴露** |
