---
name: verify-project
description: 热浪 TREND WAVE 的发布前检查清单（Day 25 建立）。改完代码、部署后、或每次发布前运行：覆盖公网首页、健康接口、收藏读写闭环、Git 密钥安全、.gitignore、sync 鉴权、各平台数据卫生（Day 24 累积 bug 回归）、CORS 预检、数据库连通、CloudBase 额度，逐项输出 PASS/FAIL + 证据。说「运行 verify-project」或「发布前检查」即触发。
---

# 发布前检查（verify-project）

> 本 Skill 的检查项全部来自本项目 Day 15–24 真实踩过的坑，不是通用模板。
> 运行环境：Windows Git Bash。跑 CLI 前先 `unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy ALL_PROXY all_proxy`（这台机器的代理 env 残留会让 CloudBase CLI 挂掉）。
> 输出纪律：**逐项 PASS / FAIL / 未执行 + 证据**。禁止「看起来正常」「基本没问题」这类模糊表述。命令失败或证据拿不到 = FAIL，不许猜。

## 固定地址

| 项 | 值 |
|---|---|
| API 网关 | `https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com` |
| 前端托管 | `https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com` |
| 工作目录 | `D:/Major/vibecoding/Project1` |

## 检查项

### C1 公网首页可访问且展示数据库真实数据
**来源**：Day 20 公网黑屏——general 分类前端无兜底，整页白屏但接口是好的，只查接口发现不了。
**怎么查**（两步缺一不可，SPA 壳里没有业务数据，不能只看 HTML）：
1. `curl -s -o /dev/null -w "%{http_code}" <前端托管地址>/` → 必须 200
2. `curl -s <API网关>/api/hot` → 必须 `ok: true` 且 `items` 非空
**通过**：两步都达标。任一步失败或 items 为空（可能只剩 seed）= FAIL。

### C2 健康接口正常
**来源**：Day 15 链路起点。注意 health 是最小实现，**不连数据库**，数据库检查看 C9。
**命令**：`curl -s <API网关>/api/health`
**通过**：HTTP 200 且 JSON 含 `"ok": true`。

### C3 收藏读写闭环（写接口 + 读接口各一次，结果正确）
**来源**：Day 18 POST / Day 22 DELETE 闭环。
**怎么查**（用临时 userKey，测完即删不留脏数据）：
1. 从 `/api/hot` 任取一条真实 `item.id`（拿到 `ITEM_ID`）
2. `POST /api/favorite`，body `{"userKey":"verify-<时间戳>","itemId":"<ITEM_ID>"}` → 200 `ok:true`
3. 重复 POST 同一对 → 409 DUPLICATE（防重复生效）
4. `GET /api/favorite?userKey=<同一 userKey>` → items 里含该 ITEM_ID
5. `DELETE /api/favorite?userKey=...&itemId=...` → 200
6. 再 GET → items 不含该 ITEM_ID（数据已清理）
**通过**：六步全部按预期。注意 curl 的 DELETE 要加 `-X DELETE`。

### C4 代码和 Git 历史搜不到硬编码密钥
**来源**：Day 20 API Key 写进 commit 被迫轮换。**变量名出现在代码里是正常的（`process.env.CLOUDBASE_API_KEY`），要抓的是「赋了真值」。**
**怎么查**（在工作目录跑）：
1. 工作区扫描（排除依赖、构建产物、本地密钥文件）：
   `grep -rIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.workbuddy -E "CLOUDBASE_API_KEY.{0,4}(=|:).{0,4}['\"]eyJ|Bearer eyJ[A-Za-z0-9_-]{20,}" .`
2. Git 全历史扫描：`git log -p | grep -E "eyJ[A-Za-z0-9_-]{40,}" | head -5`
**通过**：两步都 0 命中（exit code 1 / 无输出）。有命中 = FAIL，附命中文件与行号。

### C5 .gitignore 覆盖 .env 且仓库有 .env.example
**来源**：Day 15 安全约定。`.env.example` 给换机器/重建环境的人看需要配哪些变量。
**怎么查**：
1. `grep -nE "^!?\.env" .gitignore`（须覆盖 `.env` 及 `.env.*`，且有 `!.env.example` 反例——注意反例行以 `!` 开头，正则要能匹配到它，Day 25 第一轮实跑时 `^\.env` 漏掉了这条）
2. `ls .env.example` 文件存在且非空
**通过**：两条都满足。缺 `.env.example` = FAIL（Day 25 实跑时就是 FAIL，补文件后转 PASS）。

### C6 /api/sync 鉴权生效
**来源**：Day 23 加 SYNC_TOKEN 前公网任何人可白嫖触发 sync。
**怎么查**：`curl -s -o /dev/null -w "%{http_code}" -X POST <API网关>/api/sync`（不带任何 header）
**通过**：返回 401。返回 200 = FAIL（鉴权被关了或 token 没配）。
**注意**：带 token 的正向验证（401→200）留给 Yolo 本人做——**token 真值只存云函数环境变量，绝不写进任何入库文件（包括本 Skill）**。

### C7 当天各平台条数不超上限、rank 无重复（Day 24 bug 回归）
**来源**：Day 24 同天多次 sync 累积（B站 54 条/50 rank，4 个 rank 各重复一次）。
**上限**：weibo 30 / bilibili 50 / douyin 50 / baidu 50（单次接口返回上限）。
**怎么查**：对每个平台 `curl -s "<API网关>/api/hot?platforms=<p>"`，统计 items 数量与 rank 重复。
**判定分两级（不许混）**：
- 条数 > 上限 → **FAIL**（累积 bug 复发，`deleteStaleByPlatformAndDate` 可能没生效）
- 条数 ≤ 上限但个别 rank 重复 → **WARN**（上游接口数据质量，如微博 `realpos=4` 已知问题，Day 24 记录在案；非发布阻断，但要报出是哪个 rank）
**通过**：全部平台条数 ≤ 上限，且 rank 重复项只出现在已知豁免清单（微博 realpos）。

### C8 CORS 预检放行前端域名
**来源**：Day 20 核实静态托管域名须在白名单。
**命令**：
`curl -sI -X OPTIONS -H "Origin: <前端托管地址>" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type" "<API网关>/api/favorite"`
**通过**：HTTP 204（或 200），且响应头 `access-control-allow-origin` 的值 = 前端托管域名。

### C9 数据库可连接、核心表存在
**来源**：Day 16 建表 / Day 17 API Key 未配会 500。**不走 health（它不连库）**。
**怎么查**：`curl -s "<API网关>/api/hot"` 的返回里，取 4 个已接入平台（weibo/douyin/bilibili/baidu）各自的 items 数。
**通过**：至少 3 个平台 ≥ 1 条当日真实数据（允许个别平台当天抓取失败，`/api/sync` 响应里有失败原因）。全部为 0 = FAIL。

### C10 记录剩余额度和到期时间（提醒性质，FAIL 不阻断发布）
**来源**：Day 15 环境档案——免费体验版会静默到期，公网地址失效前不会提前很久提醒。
**命令**：`npx -y -p @cloudbase/cli@latest tcb env list`（先 unset 代理）
**输出**：报一行「环境 ID / 到期时间」。到期日 90 天内要提醒 Yolo 安排 Day 27 备份。

## 输出格式（照这个表格交）

```
| # | 检查项 | 结论 | 证据（命令 + 关键输出） |
|---|--------|------|------------------------|
| C1 | ... | PASS/FAIL/WARN/未执行 | ... |

结论：X PASS / Y FAIL / Z WARN —— 是否可发布
```

## 失败规则

- 任何命令执行失败、超时、拿不到输出 → 该项 FAIL，写明实际错误。
- 证据必须含命令原文和关键输出行，不许只写结论。
- C7 的 WARN 级必须列出具体 rank 与标题，不许笼统写「有重复」。
- 检查完毕删掉自己产生的临时数据（C3 的临时收藏已通过 DELETE 清理，无需额外动作）。
