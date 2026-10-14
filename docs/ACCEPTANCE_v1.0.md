# 热浪 TREND WAVE · 最终验收表（Day 28）

> 版本：v1.0 ｜ 验收日期：2026-10-14 ｜ 环境：CloudBase `rednews-d5gd5vdss6b4d2119`
> 公网地址（前端）：https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/
> API 网关：https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com
> 代码仓库：https://github.com/XingHo-VibeCoding/vibecoding--new-project （32 个 commit，tag `v1.0`）
> 状态口径：**PASS / 部分 PASS / FAIL / 未执行**，每项附可当场复现的证据。

---

## 一、100 分验收表

| 项目 | 分值 | 状态 | 证据 |
|---|---|---|---|
| 提示词理解与改写 | 20 | **PASS** | 3 条真实「模糊需求 → 可执行提示词」改写 + 复盘，见 §三 |
| 前端页面与交互 | 15 | **PASS** | 3 个视图（首页 / 详情 / 我的收藏）+ 收藏 ★ 即时反馈 + loading/empty/error 三态；见 §二.1 |
| 云函数与 API | 15 | **PASS** | `/api/health`、`/api/hot`、`/api/favorite`（GET/POST/DELETE）、`/api/sync`；错误响应 400/401/409/502 齐备 |
| 云数据库（PostgreSQL） | 15 | **部分 PASS** | 初始化 ✅、真实读写 ✅、删除 ✅、刷新持久化 ✅；**修改 = 未执行**（收藏无可改字段，见 §四） |
| 第三周周成果 | 10 | **PASS** | 云端数据服务 v1（`/api/hot` 真接口，4 平台真实榜单）+ 健康检查 `/api/health` + 线上演示证据 |
| Skill 与测试 | 10 | **PASS** | `verify-project`（C1–C11）+ `frontend-guidelines`；Skill 诱饵测试（故意塞假密钥被抓出）✅；Day 24 真实 Bug 修复 + 回归 ✅ |
| 线上发布 | 10 | **PASS** | 公网前端 200 + 线上真实读写（收藏）+ 数据 180 条（trends 表真实行） |
| 额度、到期和备份 | 5 | **PASS** | 用量 **8.02 / 3000 点**、到期 **2027-04-01 23:59:59**、数据全量导出方式已成文（`docs/RESOURCE_CHECK_2026-10-13.md`） |
| **合计** | **100** | **95 / 100** | 未执行项 1 处（修改），已在 §四 如实说明 |

---

## 二、项目与能力底线对应表

| 能力底线 | 本项目对应功能 | 证据 |
|---|---|---|
| 至少 3 个页面/视图 | 首页（多平台热搜榜）/ 详情页（`#/detail/<id>`）/ 我的收藏（`#/favorites`） | 哈希路由三视图；截图 `day27-fix-no-dev-traces.png` |
| 至少 1 个有反馈的交互 | 收藏按钮：点 ☆ → 变橙色 ★（即时视觉反馈）；重复收藏返回 409「该热搜已在收藏中」 | `src/components/HotItem.jsx` + `POST /api/favorite` |
| 至少 1 类数据真实写入并读取 | 收藏：`POST /api/favorite` 写入 → `GET /api/favorite` 读回 | 公网实测（§四 两遍流程记录） |
| 前端、云函数和数据库完整链路 | React 前端 → 云函数（hot/favorite）→ CloudBase PostgreSQL（trends / favorites 表） | 三视图 + 4 云函数 + 2 表 |
| 一次公网发布 | CloudBase 静态托管 + API 网关 | 前端 200、API 200 |
| 刷新后数据仍存在 | 收藏后刷新页面，收藏仍在（数据落库，非 localStorage） | 两遍流程第 2、4 步 |
| 额度、到期和备份已记录 | 用量 / 到期 / 导出方式 | `docs/RESOURCE_CHECK_2026-10-13.md` |
| 能解释提示词和验证方式 | 提示词改写记录 + `verify-project` Skill 的 C1–C11 检查项 | §三 + `.workbuddy/skills/verify-project/SKILL.md` |

---

## 三、3 条真实提示词改写（20 分项证据）

| # | 原话（模糊需求） | 改写成可执行提示词 | 结果/复盘 |
|---|---|---|---|
| 1 | Day 21：「**这三个平台的数据没有**」 | 定界为「sync 只抓 3 平台 → 补百度 fetcher（三层嵌套解析 + 剔除 `isTop` 置顶项）→ 其余平台前端标『数据源筹备中』而非放假数据 → 空列拆三态」 | 百度 50 条上线；诚实标注 > 假数据填充 |
| 2 | Day 24：「**B站列展开后条数不对**」 | 按【现象 / 复现步骤 / 已尝试动作】整理：现象=B站 54 条/50 rank、4 个 rank 重复；复现=多次触发 sync；定位=排除接口/前端/重复项，锁定 upsert 不删同 rank 异标题旧行；修法=upsert 前先删本轮未出现的旧行 | 真实 Bug 定位到修复，回归通过 |
| 3 | Day 27：「**还是有 Day 的打卡痕迹**」 | 定界为「扫描线上 bundle + 三视图 DOM 的 `Day`/`待办`/`已完成`/`Vibe`/`PRD` 关键词 → 删待办面板 + 换 footer → 复验」；并把「对外页面无开发痕迹」固化为 Skill 新检查项 C11 | 真人发现的问题 → 修复 → 复验通过 → 沉淀为可复用检查 |

**复盘**：三条的共同规律——**模糊需求要先「变成可观察的验收标准」再动手**。能说清「改什么文件、怎么算通过」的，一次就能做对。

---

## 四、核心流程两遍记录（「修改」项如实标记未执行）

核心流程：**写入 → 刷新 → 持久化 → 修改 → 删除**

| 步骤 | 第 1 遍 | 第 2 遍 | 说明 |
|---|---|---|---|
| 写入 | ✅ POST 200 | ✅ POST 200 | 新增收藏 |
| 刷新 | ✅ 页面重载 | ✅ 页面重载 | F5 后数据仍在 |
| 持久化 | ✅ GET 读回含该条 | ✅ GET 读回含该条 | 数据在数据库，非内存 |
| **修改** | **未执行** | **未执行** | 收藏为开关式（有/无），**无可改字段**；Day 22 决议 PATCH 不暴露，理由见 `api-contract.md` §五 |
| 删除 | ✅ DELETE 200 | ✅ DELETE 200 | 取消收藏，幂等（再删仍 200） |

**两遍结果一致** = 核心流程可重复完成。唯一缺口是「修改」这一步：**不是没做，是本项目设计上没有可改的东西**——如实标记为「未执行」，不计入 PASS。

### API 调用范例（可直接复制复验）

> 鉴权说明：当前为**过渡版**——`userKey` 走查询参数（GET/DELETE）或请求 body（POST），**无需额外请求头**；完整契约见 `api-contract.md`。

```bash
GW=https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com
ITEM=$(curl -s $GW/api/hot | node -pe 'JSON.parse(require("fs").readFileSync(0)).items[0].id')

# 写入
curl -s -X POST $GW/api/favorite -H "Content-Type: application/json" \
     -d "{\"userKey\":\"demo-1\",\"itemId\":\"$ITEM\"}"            # → 200 {"ok":true}
# 读回（刷新后仍能读到 = 持久化）
curl -s "$GW/api/favorite?userKey=demo-1"                        # → 200 {"ok":true,"items":[...]}
# 重复收藏 → 409 DUPLICATE ；收藏不存在的条目 → 400 BAD_REQUEST
# 取消收藏（幂等：未收藏也返 200）
curl -s -X DELETE "$GW/api/favorite?userKey=demo-1&itemId=$ITEM" # → 200 {"ok":true}
```

---

## 五、结营交付清单（附录 J 8 项）

| # | 交付项 | 状态 | 位置 |
|---|---|---|---|
| 1 | 公网地址 | ✅ | https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/ |
| 2 | 代码仓库链接 | ✅ | https://github.com/XingHo-VibeCoding/vibecoding--new-project |
| 3 | 3–5 分钟演示录屏 | ⏳ **待 Yolo 录制** | 提纲见 §六 |
| 4 | 最终验收表和项目映射表 | ✅ | 本文档 |
| 5 | 一条最有效的改写提示词 | ✅ | §三 第 2 条（Day 24 Bug 修复式改写） |
| 6 | 运行和技术路线说明 | ✅ | `TECH_DESIGN.md` + 本文档 §二 |
| 7 | 数据库/部署/额度/到期/备份说明（不含密钥） | ✅ | `CLOUDBASE.md` + `docs/RESOURCE_CHECK_2026-10-13.md` + `docs/ROLLBACK.md` |
| 8 | 200 字以内结营总结 | ✅ | `docs/SUMMARY_28DAYS.md` |

---

## 六、3–5 分钟演示提纲

1. **用户问题（30 秒）**：热搜分散在微博/抖音/B站/百度，用户要一个个 App 翻。热浪把它们聚到一屏。
2. **核心流程（2 分钟）**：打开首页 → 4 平台榜单并列 → 点一条看详情 → 收藏（★ 即时变色）→ 刷新确认还在 → 「我的收藏」里再点一次取消。
3. **提示词改写（30 秒）**：举 §三 第 2 条，说明「模糊需求 → 现象/复现/定位/修法」的改写。
4. **验证方式（30 秒）**：`verify-project` Skill 的 C1–C11；Day 26 回滚演练（前端 13 秒回退）。
5. **平台限制（20 秒）**：知乎 401（需登录 Cookie）、小红书无公开接口 → 标「数据源筹备中」，不放假数据；百度不返回热度值 → heat=0 降级渲染。
6. **后续优化（20 秒）**：见 §七。

---

## 七、已完成 / 未完成 / 后续优化

**已完成**：4 平台真实数据聚合、三视图哈希路由、收藏闭环（云函数 + 数据库 + 级联删除）、超时与错误分类、发布前检查 Skill（C1–C11）、v1.0 发布 + 回滚演练 + 数据备份。

**未完成（如实标记）**：①「修改」环节——收藏无可改字段，PATCH 不暴露（Day 22 决议）；② 知乎/小红书数据源未接入（知乎需登录、小红书无公开接口）；③ 无账号体系（匿名 `userKey`）。

**后续优化**：① 给收藏加「备注/分组」→ 补 `PATCH /api/favorite/:itemId`，顺带补齐核心流程「修改」；② 接真实数据源（附录 F）；③ 加注册登录（附录 D）；④ 复用现有 `GET /api/hot` 加一个「热度趋势/分类占比」统计页；⑤ 定时触发 sync 需先解决 SYNC_TOKEN 挡定时器的问题。
