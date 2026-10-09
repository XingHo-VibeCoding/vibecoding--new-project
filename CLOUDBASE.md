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
| 前端静态托管（mock 版） | https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/ | Day 15（2026-10-01） |
| 前端静态托管（真数据版） | https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/ | Day 20（2026-10-08） |

> **Day 21（2026-10-08）改动**：`sync` 云函数新增百度数据源后重新部署
> （`tcb fn deploy sync --path /api/sync --force`），手动触发一次同步，
> 云端当日数据变为 weibo 93 / bilibili 101 / douyin 83 / baidu 50 条。
> 前端静态托管同步更新（文案、平台「筹备中」标注、空态三分）。
> `hot` / `favorite` / `health` 三个云函数本次未改动，无需重新部署。
>
> ⚠️ **已知数据卫生问题**：同一平台当天多次同步会累积（upsert 只去重同标题，
> 掉榜又回榜的条目会留下），所以 B站 101 条 > 接口单次返回的 50 条。
> Day 22 需要决定「当天只保留最新一批」的清理策略（注意 favorites 外键级联删除的副作用）。

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
