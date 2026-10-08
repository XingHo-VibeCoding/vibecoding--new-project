// 热搜同步云函数 POST /api/sync（Day 17 板块②，按手册附录 F 规格实现）
//
// 数据源（必须原样使用这三个公开接口，不替换、不绕过任何反爬/登录/频率限制）：
//   1. 微博  https://weibo.com/ajax/side/hotSearch
//   2. B站   https://api.bilibili.com/x/web-interface/search/square?limit=50
//   3. 抖音  https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383
//
// 请求头（附录 F 明确：缺一个就失败）：
//   User-Agent 必须是桌面 Chrome；Referer 各平台用自己的站点首页。
//   微博缺 Referer → 403；B站缺桌面 UA → 412；抖音缺 Referer → 200 但列表为空。
//
// 写入：PostgREST upsert（on_conflict=platform,title,trend_date + merge-duplicates），
//   等价于 SQL 的 INSERT ... ON CONFLICT (platform,title,trend_date) DO UPDATE，
//   重复执行不产生重复行（幂等）。
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

// ---------- 组装 trends 行 ----------

function searchUrl(platform, title) {
  const q = encodeURIComponent(title)
  if (platform === 'weibo') return `https://s.weibo.com/weibo?q=${q}`
  if (platform === 'bilibili') return `https://search.bilibili.com/all?keyword=${q}`
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

  // 三个平台并行抓取，单个失败不影响其他（附录 F 要求 1）
  const tasks = [
    ['weibo', fetchWeibo],
    ['bilibili', fetchBilibili],
    ['douyin', fetchDouyin],
  ].map(async ([platform, fetcher]) => {
    try {
      const items = await fetcher()
      const rows = items.map((it) => toRow(platform, it, trendDate, fetchedAt))
      if (rows.length > 0) {
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

  // 三个平台全部失败：返回失败，页面保 seed 标「示例数据」（附录 F 要求 6）
  if (okPlatforms.length === 0) {
    return jsonOut(502, {
      ok: false,
      error: {
        code: 'UPSTREAM',
        message: `三个平台全部抓取失败：${failedPlatforms.map((r) => `${r.platform}（${r.error}）`).join('；')}`,
      },
    })
  }

  return jsonOut(200, {
    ok: true,
    date: trendDate,
    platforms: results.map((r) => (r.error ? `${r.platform}: 失败 — ${r.error}` : `${r.platform}: ${r.count} 条`)),
  })
}
