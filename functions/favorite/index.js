// Day 17 板块①：GET /api/favorite —— 收藏列表
// 契约：api-contract.md「三、GET /api/favorite」，形状 { ok: true, items: [HotItem] }，
// 按收藏时间倒序（对齐前端 localStorage 头插法的展示顺序）。
//
// ⚠️ 过渡实现（Day 17）：本课程 Day 23 前没有登录体系（不建用户表），
//    user_key 先用查询参数 userKey 传入；Day 19 契约升级为
//    Authorization: Bearer <token> 后从 token 取 user_key，届时移除查询参数版。
//
// 取数走 CloudBase 数据库 HTTP API（原因见 functions/hot/index.js 顶部注释）。
// 分两步查：先按 user_key 拿收藏（自带顺序），再按 id 批量取条目，在函数内还原顺序——
// 不依赖 PostgREST 的外键嵌套（embedded resource），少一个出错面。

const { rest, apiConfigured } = require('./rest')

const FRONTEND_ORIGIN = 'https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com'

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': FRONTEND_ORIGIN,
    },
    body: JSON.stringify(body),
  }
}

function toHotItem(row) {
  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    rank: Number(row.rank),
    heat: Number(row.heat),
    category: row.category,
    url: row.url,
    publishedAt: new Date(row.published_at).toISOString(),
  }
}

exports.main = async (event) => {
  if (!apiConfigured()) {
    return respond(500, {
      ok: false,
      error: {
        code: 'INTERNAL',
        message: '数据库访问密钥未配置：请在云函数环境变量里配置 CLOUDBASE_API_KEY（控制台 → 环境 → API Key 管理 创建）',
      },
    })
  }

  // 查询参数 userKey 必填（Day 19 后由 token 取代）
  const qs = event.queryStringParameters || {}
  const userKey = (qs.userKey || '').trim()
  if (!userKey) {
    return respond(400, {
      ok: false,
      error: { code: 'BAD_REQUEST', message: '缺少 userKey 参数（Day 19 起改用 Authorization 认证）' },
    })
  }

  try {
    // 1) 该用户的收藏，按收藏时间倒序
    const favRows = await rest(
      `/v1/rdb/rest/favorites?select=item_id,created_at&user_key=eq.${encodeURIComponent(userKey)}&order=created_at.desc`
    )
    if (!Array.isArray(favRows) || favRows.length === 0) {
      return respond(200, { ok: true, items: [] })
    }

    // 2) 批量取条目（id=in.(...)），再按收藏顺序还原
    const ids = favRows.map((r) => r.item_id)
    const trendRows = await rest(
      `/v1/rdb/rest/trends?select=id,platform,title,rank,heat,category,url,published_at&id=in.(${ids.join(',')})`
    )
    const byId = new Map((trendRows || []).map((r) => [r.id, r]))
    const items = ids.map((id) => byId.get(id)).filter(Boolean).map(toHotItem)

    return respond(200, { ok: true, items })
  } catch (err) {
    console.error('[favorite] 查询失败：', err && err.message, JSON.stringify((err && err.detail) || null))
    return respond(500, {
      ok: false,
      error: { code: 'INTERNAL', message: '服务暂时不可用，请稍后重试' },
    })
  }
}
