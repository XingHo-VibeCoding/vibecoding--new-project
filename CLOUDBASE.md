# CloudBase 环境档案（Day 15 记录）

> 手册「容易吃亏的事」：免费体验环境到期后公网地址会失效，且不会提前很久提醒。
> 到期前用 Day 27 导出的备份 + 仓库代码可重新部署恢复。

| 项 | 值 | 记录时间 |
|---|---|---|
| 环境 ID | `rednews-d5gd5vdss6b4d2119` | 2026-10-01 |
| 剩余额度 | 3000 点 | 2026-10-01 |
| 到期日期 | **2027-04-01 前后（开通日起 6 个月，控制台「用量/费用」页可查确切日期）** | 2026-10-01 |
| 计费方式 | 免费体验环境（不开按量计费 / 付费套餐 / 预置并发——安全红线） | — |

## 到期前的动作清单

- [ ] **2027-03 上旬**：控制台核对确切到期日与剩余额度
- [ ] Day 27：按附录 E 导出数据库备份（PostgreSQL）
- [ ] 需要延续时：按回滚手册在新环境重新部署（仓库代码 + 备份数据）

## 本环境的部署物

| 部署物 | 地址 | 上线日 |
|---|---|---|
| GET /api/health | https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/health | Day 15（2026-10-01） |
| GET /api/hot | https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/hot | Day 17（2026-10-08） |
| GET /api/favorite | https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/favorite | Day 17（2026-10-08） |
| POST /api/favorite | https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/favorite | Day 18（2026-10-08） |
| POST /api/sync | https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/sync | Day 17（2026-10-08） |
| DELETE /api/favorite | https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/favorite | Day 22（2026-10-09） |
| 前端静态托管（mock 版） | https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/ | Day 15（2026-10-01） |
| 前端静态托管（真数据版） | https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/ | Day 20（2026-10-08） |

> **Day 22（2026-10-09）改动**：数据操作闭环——取消收藏走真接口。
> - 后端：`favorite` 云函数新增 `handleDelete` 分支（`favoritesRepository.deleteByUserAndItem` 走 PostgREST `DELETE with filter`，幂等：未收藏也返 200）。
> - 前端：`src/lib/api.js` 加 `removeFavorite`；`src/App.jsx` 的 `toggleFavorite` 取消路径从「乐观删本地 + 提示『云端保留待 Day 22』」改为「先打 DELETE → 成功才动本地 state → 失败回滚」；toast 文案改成「已取消收藏」。
> - 契约：`api-contract.md` v0.7 改写 DELETE 段、补全参数/校验/状态码；新增「五、PATCH 范围说明」段（favorites 是开关式、trends 由 sync 写，本项目当前无可写字段，**PATCH 不暴露**）；章节编号五→六、六→七。
> - 部署：`tcb fn deploy favorite --path /api/favorite --force`（云函数 COS 上传成功），`tcb hosting deploy dist /`（前端静态托管上传 3 文件，产物 hash `index-Dt5c0EXR.js`）。
> - 实测：公网跑 23 个回归用例（基线空 → POST → GET 验证 → DELETE → GET 验证 → DELETE 幂等 → 缺 userKey 400 → 缺 itemId 400 → 重复 POST 409 → 清理），全部 ✅。
> - 未改：`hot` / `sync` / `health` 三个云函数本次未动。
>
> ⚠️ **Day 22 已知数据卫生问题（沿用 Day 21 标记）**：同一平台当天多次同步会累积，所以 B站 101 条 > 接口单次返回 50 条。Day 23 起需要决定「当天只保留最新一批」的清理策略（注意 favorites 外键级联删除的副作用）。
>

> **Day 23（2026-10-09）改动**：错误处理 + 安全边界。
> - 前端：8 文件——`src/lib/api.js` 的 `request()` 加 `AbortController` 10s 超时（断网不再 Loading 死锁）+ `errorKind()` 分类（NETWORK/TIMEOUT/SERVER/API）；`src/hooks/useHotData.js` 多存 `errorKind` 状态；`src/components/ErrorState.jsx` 按 kind 换「网络连不上/请求超时/服务端开小差」三套文案；`src/components/DetailPage.jsx` 透传 kind；`src/App.jsx` 收藏首次拉取失败不再静默 setFavorites([])，改记 `favoritesLoadFailed` 状态透传给收藏页；`src/components/FavoritesPage.jsx` 加黄色降级提示条 + 空态文案改成「不确定你有没有收藏过」；`src/components/BrandHeader.jsx` 进度 Day 22 → Day 23。
> - 文档：新增 `SECURITY.md`——6 面安全自查（API Key 管理 / CORS / userKey 伪造他用户 / `/api/sync` 匿名可触发 / PostgREST 注入 / localStorage），每面「现状/风险/缓解/何时修」，含两条控制台操作（API Key 轮换 + SYNC_TOKEN 配置）的保姆级步骤。
> - 部署：`tcb hosting deploy dist /`（前端 3 文件，产物 hash `index-DV6Jn0v1.js`，180 KB）。
> - 实测：dry-run 22 用例全过（esbuild 打包 `api.js` 为 CJS + mock fetch），公网冒烟回归——前端 hash 切换 ✅、新 JS 含 `ERROR_KINDS` 等标记 ✅、`/api/hot` 200 4 平台 179 条 ✅、`/api/favorite` 200 ✅。
> - 未改：4 个云函数均未动；`api-contract.md` 未动（无接口契约变化）。
>
> ⚠️ **Day 23 待办（Yolo 控制台操作，AI 不做）**：
> 1. 轮换 Day 20 暴露过的旧 API Key——按 `SECURITY.md` §1 步骤，4 个云函数换 Key 后删旧 Key；
> 2. 给 `sync` 云函数配 `SYNC_TOKEN` 环境变量——按 `SECURITY.md` §2 步骤，候选 token `4171119ab998e7739771e86d816ab1ef`（也可本地 `openssl rand -hex 16` 自生成）。
> 配完后我跑两轮回归命令：① 4 接口 200（API Key 切换成功）② 无 header POST /api/sync → 401 + 带 `x-sync-token` → 200（鉴权生效）。
>
> ✅ Day 23 控制台操作已闭环（详见 `2026-10-10.md` 日志 + `SECURITY.md` 末段「Day 23 实测闭环」）：API Key 轮换 + SYNC_TOKEN 配齐 + 鉴权回归通过。
>
> ---
>
> **Day 24（2026-10-10）改动**：修复真实 Bug——「同平台当天多次 sync 累积」让 B 站列出 54 条（rank 9/27/40/46 各重复一次）。
> - **复现**：公网 `/api/hot?platforms=bilibili` 拿到 54 条，rank 范围 1-50 但有 4 个 rank 各重复；前端 B 站列展开后视觉可见「同一 rank 出现两次不同标题」（截图 `screenshots/day24-bug-bilibili.png`，复现阶段留证）。
> - **定位**：排除 A 接口返 54（实测只返 50）、B 客户端拼错（后端直接查也 54）、C 网络去重（重复条目不同）、D upsert 不删同 rank 异标题旧行——锁定 D。upsert 的 ON CONFLICT 键是 `(platform,title,trend_date)` 不含 rank，第 N+1 次 sync 时同一 rank 上换成新标题，旧行因新标题不命中冲突而原样保留 → 累积。
> - **修复（方案 A）**：`functions/sync/repositories/trendsRepository.js` 新增 `deleteStaleByPlatformAndDate(platform, trendDate, keepIds)`，用 `id=not.in.(keepIds)` 清掉本轮没抓到的新 rank 旧行；`functions/sync/index.js` 在 `upsertMany` 之前先调 cleanup。收藏靠 `favorites.item_id` 的 FK `ON DELETE CASCADE` 自然静默删（**这是 day-24 选方案 A 的取舍**：业务上「词条下榜 → 收藏也跟着下榜」符合直觉，留住 ghost 行反而误导用户；`api-contract.md` 不动，因为接口形状没变）。
> - **部署**：`tcb fn deploy sync --path /api/sync --force`（COS 上传成功）；前端无改动，hash 不动。
> - **验证**（公网 `/api/hot`，2026-10-10 16:12 GMT+8）：
>   - weibo:    30 条 / 重复 rank=[4]（**上游接口数据质量问题，非 sync bug，见下条「不顺手修清单」**）
>   - douyin:   49 条 / 重复 rank=[] / rank 范围 1-49 ✅
>   - bilibili: 50 条 / 重复 rank=[] / rank 范围 1-50 ✅（修复前 54 条 / 4 个重复）
>   - baidu:    50 条 / 重复 rank=[] / rank 范围 1-50 ✅
> - **幂等性**：再跑一次 `POST /api/sync`（相同 token），bilibili 仍 50 条 / 0 重复——cleanup + upsert 组合稳定。
> - **前端留证**：截图 `screenshots/day24-fix-overview.png`（含全部 4 列）+ `screenshots/day24-fix-full.png`（B 站列展开 50 条）；API 证据 `screenshots/day24-api-evidence.txt`。
> - **不顺手修的 Bug 清单**（Day 24 任务要求「记录下来但不修」）：
>   1. 微博接口本身 `realpos=4` 出现两次（30 条数据里有 2 条 rank=4）—— 上游数据质量问题，记入 Day 25+ 选题候选。
>
> ---

## 跨域（CORS）配置（Day 20 核实）

静态托管域名 `https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com` 已在 CORS 白名单（Day 15 部署时框架自动加入），可省略手工配置。  
验证方法：

```bash
tcb cors list -e rednews-d5gd5vdss6b4d2119 | grep tcloudbaseapp
curl -sI -X OPTIONS -H "Origin: https://<static-host>" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type" "https://<envId>.service.tcloudbase.com/api/<path>"
# 应返回 204 + access-control-allow-*
```

## 部署命令（换机器/重建环境用）

```bash
# CLI 登录（浏览器扫码授权）
npx -y -p @cloudbase/cli@latest tcb login
# 云函数 + HTTP 访问路径（注意：不要加 --httpFn，那是另一套 Web 函数模式）
npx -y -p @cloudbase/cli@latest tcb fn deploy health --path /api/health --force
# 前端（先 rm -rf dist && npm run build，再上传）
npx -y -p @cloudbase/cli@latest tcb hosting deploy dist / -e rednews-d5gd5vdss6b4d2119
```

## 访问方式与两个「看起来像故障」的报错（Day 15 实测记录）

**正确 URL（务必带全路径，别只开域名）：**

| 用途 | 完整 URL |
|---|---|
| 云函数 | `https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/health` |
| 前端页面 | `https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/` |

| 现象 | 真实原因 | 处置 |
|---|---|---|
| 网关域名报 `INVALID_PATH` | 只开了 `/api/health` 一条路由（`tcb service list` 可查），**根路径本来就没有路由** | 补全路径即可，不是故障 |
| 托管域名报 `404 NoSuchKey` | COS 侧报错，通常是 CDN 边缘/浏览器缓存了「上传完成前」的 404 | `Ctrl+Shift+R` 强刷 或无痕窗口；CDN 几分钟内自动刷新；`curl -H "Cache-Control: no-cache" <url>` 可判定源站是否正常 |

已验证：托管域名 `/`、`//`、`/index.html`、不带尾斜杠四种写法均返回 200。
