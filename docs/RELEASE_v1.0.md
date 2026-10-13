# v1.0 发布清单（2026-10-13）

> **项目**：热浪 TREND WAVE（多平台热搜聚合）
> **版本号**：v1.0
> **标记位置**：git tag `v1.0` → commit `3751de6`（Day 26 正式发布 commit；可部署代码与 `9c496a4` 完全一致）
> **正式发布时间**：2026-10-13 GMT+8

---

## 1. 版本内容

### 1.1 包含的提交（自 v0 起全部提交）
- `9c496a4` Day 25｜发布前检查 Skill 入库
- `c3213c7` Day 24｜修同平台当天多次 sync 累积
- `1cea2d8` Day 23｜API Key 轮换 + SYNC_TOKEN 生效
- `2361035` Day 23｜fetch 超时 + 错误分类 + SECURITY.md
- `448c171` Day 22｜DELETE /api/favorite 闭环
- `988b0af` Day 21｜四平台上线（百度 + 筹备中标记）
- `9fd1acc` Day 20｜修公网黑屏 + general 兜底
- `d592a5f` Day 20｜部署公网，前端切真接口

### 1.2 主要能力
- 4 平台真实热搜（weibo / douyin / bilibili / baidu），2 平台筹备中（zhihu / xiaohongshu）
- 收藏增删（POST/DELETE /api/favorite，按 userKey 隔离）
- 错误降级（NETWORK / TIMEOUT / SERVER / API 四种文案）
- /api/sync 鉴权（无 token 401，详情页不暴露写操作）

---

## 2. 发布前必须通过的验证项

完整检查在 `verify-project` Skill（`.workbuddy/skills/verify-project/SKILL.md`）。v1.0 发布时一次性全跑，结果存档。

| # | 项 | 通过条件 |
|---|----|---------|
| C1 | 公网首页 + 真实数据 | 首页 200 + `/api/hot` 返 ≥1 条 |
| C2 | 健康接口 | `/api/health` 返 `{ok:true}` |
| C3 | 收藏 CRUD 闭环 | POST→409/200、GET、DELETE、清理 0 条 |
| C4 | 密钥扫描 | 工作区 + git 全历史 0 命中 |
| C5 | .gitignore + .env.example | 规则覆盖、文件存在、可入库 |
| C6 | /api/sync 鉴权 | 无 token POST → 401 |
| C7 | 数据卫生 | 各平台 ≤ 上限、rank 无重复（或 WARN） |
| C8 | CORS 预检 | OPTIONS 返 204 + ACAO |
| C9 | 数据库 | /api/hot 真实数据隐含 DB + Key 活 |
| C10 | 额度与到期 | 记下当前用量、到期日 |

**任意 FAIL 必须修完再发布**。WARN 不阻断，但需记录。

---

## 3. 发布方式

### 3.1 代码
- 已 commit 到本地 `main`（`3751de6`），**待 Yolo 执行 `git push origin main --tags`**（含 tag `v1.0`）
- 已打 tag `v1.0`

### 3.2 前端静态托管
```bash
# 1. 清理旧构建
rm -rf dist
# 2. 构建
npm run build
# 3. 部署到 CloudBase
unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy ALL_PROXY all_proxy
npx -y -p @cloudbase/cli@latest tcb hosting deploy dist -e rednews-d5gd5vdss6b4d2119
```

### 3.3 云函数
```bash
# 4 个函数（favorite / health / hot / sync）当前代码已就绪
# Day 24 已部署 sync，Day 23 已部署其他三个
# 发布前确认无新代码改动（本次 v1.0 无云函数代码变更）
```

### 3.4 备份
- **代码**：`git tag v1.0`（含全部 commit 历史）
- **数据**：CloudBase PostgreSQL 暂未导出，Day 27 资源检查时一并导出（本次 v1.0 发布前数据无变更，不强制要求）
- **静态托管当前 dist**：保留本地 `dist-v1.0/` 备份目录（用于回滚演练）
- **回滚用旧 dist**：保留 Day 22 的 `dist-day22-prev/` 备份目录（演练中的「上一稳定版」）

---

## 4. 发布后逐项验证

按下面顺序跑，发现异常立即触发回滚（见 `ROLLBACK.md`）：

1. 打开公网首页 `https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/`
2. 查看 4 列是否都展示当日数据
3. 展开任一列的「更多」，确认 rank 连续无重复
4. 点一个词条进详情页
5. 收藏 → 取消收藏（不报错）
6. 进入「我的收藏」页（之前的收藏还在）
7. 跑一遍 verify-project Skill（C1-C10）

---

## 5. 验收签字位

| 角色 | 验收 | 时间 |
|-----|-----|------|
| AI（小曹同学） | 跑完 verify-project 全部 PASS + 公网核心流程通过 | 2026-10-13 |
| Yolo | 浏览器亲眼走一遍 + 同意发布 | 待确认 |
