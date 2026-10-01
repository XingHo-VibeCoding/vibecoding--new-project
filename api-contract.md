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

### GET /api/hot — 全平台热搜列表（Day 17 真实数据）

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

- **约定**：`heat` 为整数（原始热度）；`category` 枚举 = entertainment / society / tech / finance / sports / gaming。字段与前端现有 `mockData.js` 的 HotItem 结构**一字不差**，Day 17 只换数据源不改前端。

### POST /api/auth/login — 登录（Day 19）

- **请求**：`{ "username": "yolo", "password": "..." }`（密码 bcrypt 哈希比对）
- **响应 200**：`{ "ok": true, "token": "<jwt>", "expiresAt": "..." }`
- **响应 401**：`{ "ok": false, "error": { "code": "UNAUTHORIZED", "message": "用户名或密码错误" } }`

### GET /api/favorite — 收藏列表（Day 19）

- **认证**：需要。返回该用户收藏，按收藏时间倒序（与前端 localStorage 头插法一致）。
- **响应 200**：`{ "ok": true, "items": [ /* HotItem[] */ ] }`

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

---

## 四、跨域（Day 20 统一处理）

前端 `https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com` 与 API 网关不同源，Day 20 在云函数侧统一加 CORS 响应头（`Access-Control-Allow-Origin` 指向前端域名 + OPTIONS 预检）。Day 15–19 期间用浏览器直接访问/联调，不受影响。

---

## 五、变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-10-01 | v0.1 | Day 15 制定：/api/health 上线实测通过，其余 8 个接口定型待实现 |
