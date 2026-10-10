// 热搜同步云函数 POST /api/sync（Day 17 板块②，按手册附录 F 规格实现）
//
// 数据源（必须原样使用这些公开接口，不替换、不绕过任何反爬/登录/频率限制）：
//   1. 微博  https://weibo.com/ajax/side/hotSearch
//   2. B站   https://api.bilibili.com/x/web-interface/search/square?limit=50
//   3. 抖音  https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383
//   4. 百度  https://top.baidu.com/api/board?platform=wise&tab=realtime（Day 21 新增）
//
// 【为什么只有 4 个平台】（Day 21 实测结论）
//   知乎  https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total → 401 身份未经过验证，
//         需要登录 Cookie，云函数侧拿不到稳定凭据，且 Cookie 会过期。
//   小红书 无公开榜单接口，请求需要登录态 + 前端签名，云端不可行。
//   这两个平台保留在选择栏里，但标记为「数据源筹备中」（见 src/lib/mockData.js 的 ready 字段），
//   不做假数据填充——宁可空着并说明原因，也不伪造。
//
// 请求头（附录 F 明确：缺一个就失败）：
//   User-Agent 必须是桌面 Chrome；Referer 各平台用自己的站点首页。
//   微博缺 Referer → 403；B站缺桌面 UA → 412；抖音缺 Referer → 200 但列表为空。
//
// 写入：PostgREST upsert（on_conflict=platform,title,trend_date + merge-duplicates），
//   等价于 SQL 的 INSERT ... ON CONFLICT (platform,title,trend_date) DO UPDATE，
//   重复执行不产生重复行（幂等）。
//
// 清理：Day 24 起，upsert 之前先按 (platform, trend_date) 删掉「id 不在本批 keepIds」的旧行。
//   修「B站 101 > 单次 50（rank 9/27/40/46 重复）」——同 rank 换标题的新词条
//   不触发 ON CONFLICT，旧行原样保留会累积。删旧 → 插新，保证当天就是当前抓到的那批。
//   副作用：favorites.item_id 的 FK 是 ON DELETE CASCADE，被删 trends 行指向的收藏
//   静默删除（CLOUDBASE.md Day 22 已记此约束）。
//
// 触发：POST /api/sync。可选鉴权：环境变量 SYNC_TOKEN 配了才校验
//   （请求头 x-sync-token 与之相等才执行）；没配就放行——课程 MVP 阶段的取舍，
//   被恶意触发的最坏结果只是重复幂等写入。
const crypto = require('crypto')
const { apiConfigured } = require('./rest')
const trendsRepository = require('./repositories/trendsRepository')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// 北京时间的「今天是几号」。云函数默认时区是 UTC，直接 toISOString() 取日期，
// 会在北京时间 00:00–08:00 之间算成前一天，导致同一天榜单被写进两批数据。
function beijingDate(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

// ---------- 三个平台的抓取与字段映射 ----------

async function fetchWeibo() {
  const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
    headers: { 'User-Agent': UA, Referer: 'https://weibo.com' },
  })
  if (!res.ok) {
    const hint = res.status === 403 ? '，通常是请求头缺少 Referer' : ''
    throw new Error(`微博接口返回 ${res.status}${hint}`)
  }
  const json = await res.json()
  const list = (json && json.data && Array.isArray(json.data.realtime) ? json.data.realtime : []).slice(0, 30)
  if (list.length === 0) throw new Error('微博返回了空的 realtime 列表')
  return list
    .filter((it) => it && it.word)
    .map((it, i) => ({
      title: it.word,
      rank: Number.isInteger(it.realpos) && it.realpos > 0 ? it.realpos : i + 1,
      heat: Number(it.num) || 0,
    }))
}

async function fetchBilibili() {
  const res = await fetch(
    'https://api.bilibili.com/x/web-interface/search/square?limit=50',
    { headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com' } }
  )
  if (!res.ok) {
    const hint = res.status === 412 ? '，通常是请求头缺少桌面 User-Agent' : ''
    throw new Error(`B站接口返回 ${res.status}${hint}`)
  }
  const json = await res.json()
  const list =
    json && json.data && json.data.trending && Array.isArray(json.data.trending.list)
      ? json.data.trending.list
      : []
  if (list.length === 0) throw new Error('B站返回了空的 trending.list')
  // B站不返回排名，用数组下标 + 1（附录 F 规定）
  return list
    .filter((it) => it && it.keyword)
    .map((it, i) => ({
      title: it.keyword,
      rank: i + 1,
      heat: Number(it.heat_score) || 0,
    }))
}

async function fetchDouyin() {
  const res = await fetch(
    'https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383',
    { headers: { 'User-Agent': UA, Referer: 'https://www.douyin.com' } }
  )
  if (!res.ok) throw new Error(`抖音接口返回 ${res.status}`)
  const json = await res.json()
  const list =
    json && json.data && Array.isArray(json.data.word_list) ? json.data.word_list : []
  // 抖音缺 Referer 会返回 200 但列表为空（附录 F 明确提示）
  if (list.length === 0) throw new Error('抖音返回 200 但列表为空，通常是请求头缺少 Referer')
  return list
    .filter((it) => it && it.word)
    .map((it, i) => ({
      title: it.word,
      rank: Number.isInteger(it.position) && it.position > 0 ? it.position : i + 1,
      heat: Number(it.hot_value) || 0,
    }))
}

// 百度热搜（Day 21 新增）：https://top.baidu.com/api/board?platform=wise&tab=realtime
// 结构比前三个都绕，要三层下钻：data.cards[] → 找 component === 'tabTextList' → content[0].content[]
// 两个坑：
//   1. 榜单数组里第 0 项是「置顶」条目（isTop: true），不带 index。若不剔除，
//      它和真正 index=1 的那条都会算成第 1 名，库里就有两行 rank=1。
//      百度页面本身也不给置顶项编号，所以剔除它、其余按下标重新编号，与页面口径一致。
//   2. 该接口不返回热度值（没有 hotScore 字段），heat 一律记 0；
//      前端 HotItem 对 heat === 0 的条目不渲染热度块，不会显示成「0 热度」。
async function fetchBaidu() {
  const res = await fetch('https://top.baidu.com/api/board?platform=wise&tab=realtime', {
    headers: { 'User-Agent': UA, Referer: 'https://top.baidu.com/board?tab=realtime' },
  })
  if (!res.ok) throw new Error(`百度接口返回 ${res.status}`)
  const json = await res.json()
  const cards = json && json.data && Array.isArray(json.data.cards) ? json.data.cards : []
  const card = cards.find((c) => c && c.component === 'tabTextList') || cards[0]
  const list =
    card && Array.isArray(card.content) && card.content[0] && Array.isArray(card.content[0].content)
      ? card.content[0].content
      : []
  if (list.length === 0) throw new Error('百度返回了空的榜单列表')
  return list
    .filter((it) => it && it.word && !it.isTop)
    .slice(0, 50)
    .map((it, i) => ({
      title: it.word,
      rank: i + 1,
      heat: 0,
    }))
}

// ---------- 组装 trends 行 ----------

function searchUrl(platform, title) {
  const q = encodeURIComponent(title)
  if (platform === 'weibo') return `https://s.weibo.com/weibo?q=${q}`
  if (platform === 'bilibili') return `https://search.bilibili.com/all?keyword=${q}`
  if (platform === 'baidu') return `https://www.baidu.com/s?wd=${q}`
  return `https://www.douyin.com/search/${q}`
}

function toRow(platform, item, trendDate, fetchedAt) {
  // id 不含 rank（排名实时变动），标题 hash 保证同一天同标题幂等稳定，
  // favorites.item_id 外键锚定的是它，绝不能随排名漂移。
  const hash = crypto.createHash('md5').update(item.title).digest('hex').slice(0, 8)
  return {
    id: `${platform}-${trendDate}-${hash}`,
    platform,
    title: item.title,
    rank: item.rank,
    heat: item.heat,
    category: 'general', // 三个公开接口都不提供分类，统一标 general（Day 18 前端配色跟上）
    url: searchUrl(platform, item.title),
    published_at: fetchedAt,
    trend_date: trendDate,
  }
}

// ---------- 主流程 ----------

function jsonOut(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  }
}

function header(event, name) {
  const h = (event && event.headers) || {}
  return h[name] || h[name.toLowerCase()] || h[name.toUpperCase()]
}

exports.main = async function (event) {
  // 可选鉴权：配了 SYNC_TOKEN 才校验
  const token = process.env.SYNC_TOKEN
  if (token && header(event, 'x-sync-token') !== token) {
    return jsonOut(401, { ok: false, error: { code: 'UNAUTHORIZED', message: '同步令牌无效（请求头 x-sync-token）' } })
  }

  if (!apiConfigured()) {
    return jsonOut(500, {
      ok: false,
      error: { code: 'INTERNAL', message: '数据库访问密钥未配置：请在云函数环境变量里配置 CLOUDBASE_API_KEY' },
    })
  }

  const trendDate = beijingDate()
  const fetchedAt = new Date().toISOString()

  // 四个平台并行抓取，单个失败不影响其他（附录 F 要求 1）
  const tasks = [
    ['weibo', fetchWeibo],
    ['bilibili', fetchBilibili],
    ['douyin', fetchDouyin],
    ['baidu', fetchBaidu],
  ].map(async ([platform, fetcher]) => {
    try {
      const items = await fetcher()
      const rows = items.map((it) => toRow(platform, it, trendDate, fetchedAt))
      if (rows.length > 0) {
        // Day 24｜先清掉「当天同平台、本轮没抓到的新 rank 旧条目」再 upsert 本批
        // 修 50→54（rank 9/27/40/46 重复）的根因：upsert 的冲突键是 (platform,title,trend_date)，
        // 同 rank 换标题的新词条原样保留，旧行就累积下来。
        // 收藏：favorites.item_id 的 FK 是 ON DELETE CASCADE，被删 trends 行指向的收藏静默删。
        const keepIds = rows.map((r) => r.id)
        await trendsRepository.deleteStaleByPlatformAndDate(platform, trendDate, keepIds)
        await trendsRepository.upsertMany(rows)
      }
      return { platform, count: rows.length, error: null }
    } catch (e) {
      return { platform, count: 0, error: e.message || String(e) }
    }
  })

  const results = await Promise.all(tasks)

  const okPlatforms = results.filter((r) => r.error === null)
  const failedPlatforms = results.filter((r) => r.error !== null)

  // 全部平台都失败：返回失败，页面保 seed 标「示例数据」（附录 F 要求 6）
  if (okPlatforms.length === 0) {
    return jsonOut(502, {
      ok: false,
      error: {
        code: 'UPSTREAM',
        message: `全部平台抓取失败：${failedPlatforms.map((r) => `${r.platform}（${r.error}）`).join('；')}`,
      },
    })
  }

  return jsonOut(200, {
    ok: true,
    date: trendDate,
    platforms: results.map((r) => (r.error ? `${r.platform}: 失败 — ${r.error}` : `${r.platform}: ${r.count} 条`)),
  })
}
