# 热搜分类器（category 恢复方案）

> 2026-10-14 实施。起因：页面上每条热搜的标签都是「综合」，用户问「我的社会、娱乐、科技等标签呢」。

## 一、问题与根因

| 现象 | 根因 |
|---|---|
| 列表里每条都标「综合」 | 微博/抖音/B站/百度四家公开热榜接口**都只返回标题、排名、热度，没有分类字段**。Day 17 切真数据起，`functions/sync/index.js` 的 `toRow()` 一律写死 `category: 'general'` |
| 筛选栏 6 个分类点了 0 条 | 库里 `category` 全是 `general`，`activeCategories.includes(i.category)` 永远不命中。7 个 chip 里 6 个是坏的 |
| 「社会/娱乐/科技」这些名字还在 | 它们只是前端 `src/lib/mockData.js` 的 `CATEGORIES` 字典（Day 1–16 假数据时代按平台权重随机生成分类，生成器已删除，字典留着给筛选栏和配色用） |

## 二、方案与性质声明

按标题关键词做**启发式推断**：`functions/sync/categories.js` 的 `classifyCategory(title)`，在同步入库时给每条打标，推断不出来的留 `general`。

**这是本项目的分组，不是平台官方分类。** 对外文案不得写成「平台官方分类」；页面上它只是视觉分组和筛选维度。

## 三、文件

| 文件 | 职责 |
|---|---|
| `functions/sync/categories.js` | 分类器本体。打分制 + 词表 + 歧义词护栏，纯函数、无依赖，可单独 `require` 测试 |
| `functions/sync/index.js` | `toRow()` 里 `category: classifyCategory(item.title)` |
| `scripts/classify-preview.cjs` | 预览脚本：拿真实标题跑分类器，看命中率/分布/抽样/未分类清单 |
| `docs/CATEGORY_CLASSIFIER.md` | 本文档 |

## 四、怎么跑预览

```bash
# 线上真实数据（需先 unset 代理变量）
unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy ALL_PROXY all_proxy
node scripts/classify-preview.cjs

# 离线快照
curl -s "<API>/api/hot?platforms=weibo,douyin,bilibili,baidu&limit=300" -o hot-live.json
node scripts/classify-preview.cjs hot-live.json
```

> **路径坑**：快照文件别写 `/tmp/xxx.json`。Git Bash 的 `/tmp` 是 `C:\Users\<你>\AppData\Local\Temp`，
> 而 Node 是 Windows 程序，会把它解析成「当前盘符下的 `\tmp`」（本项目在 D 盘 → `D:\tmp`），
> 于是报 `ENOENT: no such file or directory, open 'D:\tmp\...'`。**用项目内相对路径或完整 Windows 路径。**

输出：不同阈值下的覆盖率 → 各分类条数与抽样 → 留「综合」的全量清单。
**先看抽样，再谈部署**——抽样里出现误判就回退那条词。

## 五、规则

1. **打分制**，不是先命中先返回。一条标题常同时命中多类（「郑钦文中网夺冠 霸王茶姬赢麻了」= 体育 6 分 vs 财经 2 分），累加取最高。
2. **权重**：`strong`=2（几乎无歧义，如「夺冠」「跌停」「黑客」）、`weak`=1（语境词，如「网友」「手机」）、`entity`=2（人名/品牌/影视动漫 IP/球队名）。
3. **阈值** `MIN_SCORE = 2`：最高分不足 2 就返回 `general`。调小命中更多但误判更多（实测阈值 1 → 77%，2 → 72%，3 → 32%）。取 2 的原则是「宁可标综合，也不硬塞一个分类」。
4. **优先级** `CATEGORY_PRIORITY = [gaming, sports, tech, finance, entertainment, society]`：同分时取靠前者。游戏排在体育前面，因为电竞赛事标题常带「冠军/决赛」，让电竞归游戏；反过来体育标题几乎不含游戏词。
5. **词边界**：纯英文/数字词（`AI`、`NBA`、`JDG`）编译成 `\b...\b` 正则，避免 `WB` 命中 `WBCC`。
6. **BLOCKERS 护栏**：`苹果` 撞上「石头/水果/汁/画」就不算数（苹果石头画不是苹果公司），`小米` 撞上「武林外传/粥/饭」不算数。宁可漏判也不误判——误判比不分类更伤信任。
7. **泛词禁令**：「生活 / 日常 / 城市 / 老板」这类词不进 society。抖音一大半标题是生活流内容，加了会把「我的假日慢充宝藏城市」也吃进社会（实测踩过）。

## 六、实测（2026-10-14，线上 180 条真实标题）

- 覆盖率：**129/180 = 72%**（阈值 2）
- 分布：娱乐 39 · 社会 27 · 体育 22 · 财经 21 · 游戏 14 · 科技 6 · 综合 51
- 未分类的 51 条主要是：抖音生活流内容（桂花香、金秋、假日）、B站 UP 主人名与缩写（欣小萌、KT VIT）、无归属题材（健康养生、宠物日常）
- 已修掉的误判：「内娱来了五位AI艺人」→娱乐（补 `艺人`）、「新人结婚66个拱门」→社会（补 `新郎/新娘`）、「维尔茨身价暴跌」→体育（补球员名）、「VCTCN 冠军赛」→游戏（补 `VCT/VCTCN`）
- 第二轮补词（上线后照当天标题缺口补的）：NBA 球队名与 `狂胜`、LoL 英雄名与 `削弱`、
  `谷歌/Google/Gemini`、`影之刃/明日方舟`、`宣判/肇事/持刀/大桥/隧道`、`秋粮/国考/非遗`、`航展/宇宙/望远镜/机器狗`。
  同时把 `球场` 从 weak 提到 strong。核对：`苹果发布3款新品`→科技 而 `创意苹果石头画`→综合（护栏生效）、
  `王者十一周年庆`→游戏 而 `王者归来`→综合（`王者` 只给 weak，不误伤）。
- 上线后互验：线上 179 条与本地逐条比对 **0 条不一致**；历史回填后 `2026-10-12` 未分类 180 → 51，与本地测的 129/180 完全吻合。

## 七、发布与回填（2026-10-14 已执行）

1. 部署云函数（改完先跑预览脚本）：
   ```bash
   unset HTTPS_PROXY HTTP_PROXY https_proxy http_proxy ALL_PROXY all_proxy
   npx -y -p @cloudbase/cli@latest tcb fn deploy sync --path /api/sync --force
   ```
   envId 走 `cloudbaserc.json`（`rednews-d5gd5vdss6b4d2119`），不用另传 `-e`。
   函数整目录打包，新增的 `categories.js` 会一起上传。
2. 触发一次同步：
   ```bash
   curl -X POST "<API>/api/sync" -H "x-sync-token: <环境变量里的真值>"
   ```
3. `/api/hot` 返回的是**最新有数据的 trend_date**，所以跑完同步，页面立刻就是带分类的新数据。
   实测结果：`{"ok":true,"date":"2026-10-14","platforms":["weibo: 30 条","bilibili: 50 条","douyin: 49 条","baidu: 50 条"]}`
4. 历史日期回填（本次做了）：
   ```bash
   # 1) 取出所有未分类标题
   npx -y -p @cloudbase/cli@latest tcb db execute --json --sql "SELECT DISTINCT title FROM trends WHERE category='general'"
   # 2) 本地用 classifyCategory 重算，按分类拼成 6 条 UPDATE（标题里的单引号写成两个）
   # 3) 逐条执行
   npx -y -p @cloudbase/cli@latest tcb db execute --json --sql "UPDATE trends SET category='sports' WHERE category='general' AND title IN ('...','...')"
   ```
   实测：880 条未分类标题里 332 条可归类，执行 6 条 UPDATE 共影响 **355 行**；
   各日期分类种数从 1 变 7，`2026-10-12` 那天未分类从 180 → 51（正好等于本地测得 129/180 = 72%，互相验证）。
   `UPDATE` 不动 `id`，`favorites` 外键不受影响，可重复执行。

### 覆盖率会随当天内容波动

同一套词表：`2026-10-12` 快照 72%，`2026-10-14` 当天只有 59~60%。原因是当天榜单被时政/民生/生活类
新闻占满（「中朝新鸭绿江大桥」「秋日穿搭」这类本来就没有归属）。**别追着单日数字补词**，
补的必须是跨天通用的词（NBA 球队、LoL 英雄、谷歌/Gemini、宣判/肇事/大桥这类法治民生词）。


## 八、维护纪律

- 分类准度全靠词表，改词表**必须**先跑 `scripts/classify-preview.cjs` 看抽样
- 只加「一眼能看出归属」的词；同分打平就靠优先级解决，不要靠堆词
- 出现新歧义词（某词在不同语境指两回事）就加一条 `BLOCKERS`，不要靠调阈值绕
- 覆盖率不是目标。18% 的标题本来就无家可归，硬塞分类只会制造误判
