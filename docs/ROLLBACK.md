# 回滚手册（v1.0 配套）

> **范围**：热浪 TREND WAVE（CloudBase 部署）
> **更新于**：2026-10-13
> **使用时机**：发布后任何环节出现 `verify-project` C1-C10 任意 FAIL，或公网核心流程不能跑通

---

## 1. 触发条件（什么情况必须回滚）

满足以下**任一**条件，立即启动回滚：

| 情况 | 判定 | 动作 |
|-----|------|-----|
| 公网首页打不开 | `curl -I` 返非 200 | 回滚前端 |
| /api/hot 返 5xx 或无数据 | 接口 500/超时/0 条 | 回滚云函数 |
| /api/sync 鉴权消失 | 无 token POST 返 200 | **紧急**：密钥可能泄露，**先**轮换 API Key，**再**回滚 |
| C4 密钥扫描有命中 | grep 命中 eyJ | 紧急（见上条） |
| C7 条数超上限 | 任一平台 > 单次上限 | 修 sync 重新跑，不必回滚 |
| 数据被误删 | 收藏/历史丢失 | **回滚救不回**，需用 Day 27 导出的备份重新导入 |
| 前端有 JS 错误 | 浏览器控制台红字 | 看具体错；不能修就回滚 |

**判断流程**：
1. 先看哪个检查 FAIL → 定位层级（前端 / 云函数 / 数据 / 安全）
2. 改配置/小 bug → 不必回滚，直接修
3. 改不动或时间紧 → 立即回滚

---

## 2. 回滚步骤（分三层）

### 2.1 前端静态托管回退（**已实操演练**，Day 26）

**原理**：用本地保存的「上一稳定版」dist 重新上传到 CloudBase 静态托管。

**步骤**：
```bash
# 0. 前提：每个版本发布前，已把它的 dist 单独备份成 dist-<版本>/ 目录
#    （本次：dist-v1.0/ = v1.0 快照；dist-prev/ = 上一版快照）
cd D:/Major/vibecoding/Project1

# 1. 看一眼有哪些版本快照
ls -d dist-*/        # 应看到 dist-v1.0/ dist-prev/ 等

# 2. 把「要回退到的版本」拷到 dist/
rm -rf dist
cp -r dist-prev dist     # 换成你要回退到的那个 dist-<版本>/

# 3. 部署（注意带 -e 环境 ID，漏了会报「未指定环境」）
unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy ALL_PROXY all_proxy
npx -y -p @cloudbase/cli@latest tcb hosting deploy dist -e rednews-d5gd5vdss6b4d2119

# 4. 验证（CDN 需几分钟刷新；如 hash 没变，加 no-cache 或等 1-2 分钟再试）
curl -sI https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/   # 期望 200
curl -s -H "Cache-Control: no-cache" https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com/ | grep -oE 'index-[A-Za-z0-9]+\.js'  # 看 hash 是否已切换
```
```

**耗时参考**（Day 26 实测）：约 25-40 秒（取决于网络）

### 2.2 云函数回退（**手册内容，不实操**）

**不实操原因**：Day 22-24 的云函数改动已在线上稳定运行，4 个函数（favorite / health / hot / sync）当前代码无已知 bug；v1.0 范围内云函数代码无变更；云函数回退涉及重新打包 + 上传 + 重新配环境变量，比前端回退风险高，没有压测用例时不轻易做。

**操作步骤（如确需执行）**：
```bash
# 1. 找到上一个稳定版本的 commit
git log --oneline -- functions/  # 找到上一个云函数稳定 commit

# 2. checkout 旧代码到新分支（或直接在 main 上 reset）
git checkout <stable-commit-sha> -- functions/

# 3. 重新部署各函数
unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy ALL_PROXY all_proxy
npx -y -p @cloudbase/cli@latest tcb fn deploy favorite --path /api/favorite --force
npx -y -p @cloudbase/cli@latest tcb fn deploy health --path /api/health --force
npx -y -p @cloudbase/cli@latest tcb fn deploy hot --path /api/hot --force
npx -y -p @cloudbase/cli@latest tcb fn deploy sync --path /api/sync --force

# 4. 验证（依次跑）
curl -s https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/health
curl -s "https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/hot?platforms=bilibili"

# 5. ⚠️ 环境变量需重新检查：sync 的 SYNC_TOKEN、4 函数的 CLOUDBASE_API_KEY
#    部署时 --force 会带环境变量，但保险起见到控制台 Functions → sync → 函数配置 → 环境变量 确认
```

### 2.3 数据恢复（**手册内容，不实操**）

**不实操原因**：本次 v1.0 发布前数据无结构变更，所有收藏/历史数据为增量新加，无丢失风险；真正的数据备份导出计划在 Day 27 资源检查时执行。

**操作步骤（如确需执行）**：
```bash
# 1. 从 Day 27 导出的 SQL 备份恢复
#    备份位置：E:/Major/vibecoding/Project1/.workbuddy/backups/db-YYYYMMDD.sql
#    （具体路径以 Day 27 实际产出为准）

# 2. 用 psql 导入到 CloudBase PostgreSQL
PGPASSWORD=<DB_PASSWORD> psql \
  -h <cloudbase-pg-host> \
  -U <db-user> \
  -d <db-name> \
  -f <backup-file>

# 3. 验证
curl -s "https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/hot" | jq '.items | length'
# 期望非 0

# 4. ⚠️ 警告：导入会覆盖当前表的所有数据；如果只是想恢复部分数据，先 SELECT 确认范围
```

---

## 3. 回滚后验证

按顺序跑，任一不通过则继续回滚或切到「数据恢复」：

1. **健康检查**：`curl /api/health` → `{"ok":true}`
2. **数据库**：`curl /api/hot` → `items` 数量与回滚前一致
3. **公网首页**：`curl -I <静态托管URL>` → 200
4. **核心流程**（浏览器手测）：
   - 看到 4 列数据
   - 收藏 → 取消 → 我的收藏列表更新
   - 详情页加载
5. **跑一遍 verify-project Skill**：所有 FAIL 项已变 PASS

---

## 4. 关键时间窗口

| 步骤 | 期望耗时 | 卡点 |
|------|---------|------|
| 定位问题（看哪个检查 FAIL） | 1-2 分钟 | 记不清检查项就打开 verify-project |
| 前端回退（部署） | 30-60 秒 | 网络慢会拉长 |
| 前端回退后验证 | 1 分钟 | 浏览器缓存强刷（Ctrl+Shift+R） |
| 云函数回退 | 2-3 分钟 | 4 个函数 + 环境变量 |
| 数据恢复 | 5-15 分钟 | 取决于备份大小 + 网络 |

**全流程总耗时：5-20 分钟**。回滚不等于恢复原状，先保「能访问」再谈「功能完整」。

---

## 5. 演练记录

真实演练见 `ROLLBACK_DRILL_2026-10-13.md`（同目录），含每步耗时与结果。
