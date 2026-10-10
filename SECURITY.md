# SECURITY.md — 安全自查清单

> Day 23（2026-10-09）产出。逐面记录「现状 / 风险 / 缓解 / 何时修」。
> 标注【实测】的条目都有 curl 证据，不是推断。复查时先重跑对应命令再改结论。

## 总览

| # | 安全面 | 等级 | 一句话结论 |
|---|---|---|---|
| 1 | API Key 密钥管理 | ⚠️ 待办 | 代码零硬编码，但 Day 20 暴露过的旧 Key 未轮换 |
| 2 | CORS 跨域 | ✅ 达标 | 网关只放行固定前端域名，伪造 Origin 被拒 |
| 3 | userKey 伪造成他用户 | ⚠️ 已知过渡态 | 无登录体系前无解，Day 25 登录功能根治 |
| 4 | /api/sync 匿名可触发 | ⚠️ 一分钟可堵 | 代码已支持 SYNC_TOKEN，只差控制台配置 |
| 5 | PostgREST 注入面 | ✅ 达标 | 参数化查询 + encodeURIComponent，无拼接 SQL |
| 6 | localStorage 依赖 | ℹ️ 低风险 | 只存非敏感的用户偏好与匿名 ID |

---

## 1. API Key 密钥管理 ⚠️

**现状**
- 全项目（functions/src/db/*.md/cloudbaserc.json）grep 无硬编码密钥；无 `.env` 文件进 git
- Key 只存在于云函数环境变量 `CLOUDBASE_API_KEY`（兼容 `CLOUDBASE_APIKEY` 双名，见 `functions/*/rest.js`）
- 仓库层 `rest()` 把 Key 放在服务端请求头 `Authorization: Bearer`，前端 bundle 里没有它【实测：公网 JS 177KB 产物中无 Bearer 串】

**风险**
- ⚠️ **历史暴露**：Day 20（2026-10-08）排查公网黑屏时，API Key 曾在聊天上下文中明文出现过。持有者可直连 PostgREST 读写删全部数据。

**缓解 / 何时修**
- **立即**：控制台轮换 Key（步骤见下方「控制台操作」§1）。这是唯一未完成的 P0。
- 长期：上真实登录体系后，按用户粒度授权而非单把服务端 Key。

---

## 2. CORS 跨域 ✅

**现状（2026-10-09 实测）**
- 预检：`OPTIONS /api/favorite`（带前端 Origin + 请求 DELETE）→ `204`，回显 `access-control-allow-origin: https://rednews-...tcloudbaseapp.com`、`allow-methods: DELETE`，`server: tcbgw`
- 伪造 Origin 预检 → **400 拒绝**【实测：Origin: https://evil.example.com】
- GET 响应头 `access-control-allow-origin` 恒为固定前端域名，非 `*` 通配
- 云函数侧 `functions/hot|favorite/index.js` 的 `respond()` 也各自带了 ACAO 头（双保险）

**风险**
- 无实质风险。唯一理论面：前端托管域名本身是公开 URL，CORS 防的是「别的网站调我们的 API」，不防「别人直接打开我们的页面」——那本来就是要开放的。

**缓解 / 何时修**
- 无需动作。若日后换自定义域名，同步改两个云函数里的 `FRONTEND_ORIGIN` 常量。

---

## 3. userKey 伪造成他用户 ⚠️（已知过渡态）

**现状**
- `src/lib/userKey.js`：浏览器 localStorage 里的 UUID 充当用户 ID
- `GET /api/favorite?userKey=...`、POST body、DELETE query 均明文携带 userKey
- 服务端只校验「非空 + 长度 ≤64」，**不校验归属**——谁都能带别人的 userKey 读写删他的收藏

**风险**
- 知道（或撞库猜出）他人 userKey 即可：清空其收藏（DELETE）、塞垃圾收藏（POST）。UUID 不可猜，但 userKey 会出现在 URL 里（浏览器历史 / 服务器日志 / 分享截屏都可能泄漏）。

**缓解 / 何时修**
- 现状可接受：数据价值低（收藏列表），课程 MVP，契约已标记过渡。
- **Day 25 登录功能根治**：签发服务端 token，`Authorization: Bearer` 取代 query 传参，userKey 由 token 派生（`functions/favorite/index.js` 顶部注释已留了升级路径）。

---

## 4. /api/sync 匿名可触发 ⚠️（一分钟可堵）

**现状（2026-10-09 实测）**
- 【实测】不带任何 token `POST /api/sync` → **HTTP 200**，四平台真实抓取并写库
- `functions/sync/index.js` 第 180–185 行：`SYNC_TOKEN` 环境变量**配置了才校验** `x-sync-token` 请求头；当前未配置 = 公网任何人可触发同步

**风险**
- 被刷会：① 消耗 CloudBase 免费额度（3000 点，2027-04 到期）② 加剧「当天多次 sync 累积」数据卫生问题（B站 101 条那个坑）③ 对上游四个平台高频请求可能招致封禁。
- 写入本身幂等（upsert），不会被注入脏数据，所以是「可刷」而非「可毁」。

**缓解 / 何时修**
- **建议今天做**：控制台给 sync 配 `SYNC_TOKEN` 环境变量即可，代码零改动（步骤见下方「控制台操作」§2）。
- 长期：Day 24+ 做定时触发器后，token 仍保留（定时器不带 header 也走不了这条 HTTP 路径）。

---

## 5. PostgREST 注入面 ✅

**现状**
- 全部数据访问走 `functions/*/repositories/*`，无字符串拼接 SQL
- 过滤参数一律 `encodeURIComponent` 包裹后拼 `?user_key=eq.<val>`（PostgREST 参数化语法）【实测读码：`favoritesRepository.js` 第 10/18/37 行】
- PostgREST 本身按白名单语法解析 query 参数，`eq.` 后注入 `,`/`&` 会被编码掉
- 服务端 Key 从不透传给客户端，前端无法绕过云函数直连数据库（数据库 HTTP API 只认 Bearer Key）

**风险 / 何时修**
- 当前无已知注入路径。复查点：以后每次给 repositories 加新方法，检查所有入参是否过 `encodeURIComponent`。

---

## 6. localStorage 依赖 ℹ️

**现状**
- 只存两样：`trendwave:platforms`（平台偏好，非敏感）、`trendwave:userKey`（匿名 UUID）
- `getUserKey()` 对 localStorage 不可用（隐私模式等）有 try/catch 兜底，页面不崩

**风险 / 何时修**
- 极低。UUID 本身就是公开 ID（见 §3 的已知风险，问题不在存储而在传输）。
- Day 25 登录后 userKey 层整体移除。

---

## 控制台操作（需要 Yolo 本人在 CloudBase 控制台执行）

### §1 轮换 API Key（P0，约 3 分钟）

```
1. 打开控制台 https://console.cloud.tencent.com/tcb
   环境：rednews-d5gd5vdss6b4d2119
2. 左侧「环境 → API 密钥管理」（旧版入口叫「环境总览 → API Key」）
3. 「新建密钥」→ 生成后立刻复制新 Key（页面关掉就看不到了）
4. 依次进 4 个云函数（hot / favorite / sync / health）：
   「函数配置 → 环境变量 → 编辑」
   - 若已有 CLOUDBASE_API_KEY（或 CLOUDBASE_APIKEY）：值改成新 Key
   - 若用的是「绑定 API Key」注入：先解除绑定再重新绑定新 Key
5. 回到密钥列表，删掉旧 Key（就是 Day 20 暴露那把）
6. 冒烟回归（我这边跑，你喊一声即可）：
   GET /api/hot 200 + GET /api/favorite 200 + POST /api/sync 200
```

⚠️ 顺序别颠倒：先配新再删旧，中间空窗期所有接口会 500（Key 失效）。
删旧 Key 前确认 4 个函数都换完了。

### §2 给 sync 配 SYNC_TOKEN（约 1 分钟）

```
1. 本地生成一个随机 token（任选其一）：
   Git Bash:  openssl rand -hex 16
   或用我当时给你的：直接告诉我「生成一个」，我跑命令给你
2. 控制台 → 云函数 → sync → 「函数配置 → 环境变量」新增：
   键：SYNC_TOKEN   值：<上面生成的随机串>
3. 无需重新部署（环境变量热生效；若有延迟，等 30 秒重试）
4. 验证（我这边跑）：
   不带 header POST /api/sync → 401 UNAUTHORIZED ✅
   带 x-sync-token: <token> POST /api/sync → 200 ✅
5. token 记到你的密码管理器 / 本地私密笔记，不要进 git
```

---

## 复查节奏

- Day 24（修 B 站 101 条）：顺带重跑 §2 的两个验证命令
- Day 25（登录功能）：§3 / §6 两项预期关闭，更新本表
- 上线公网宣传前：§1 必须已完成，全表重跑一遍实测命令
