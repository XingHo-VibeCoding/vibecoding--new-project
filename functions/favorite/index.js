// Day 17 板块①：GET /api/favorite —— 收藏列表
// Day 18 板块①：POST /api/favorite —— 添加收藏（第一条业务写入接口）
// 契约：api-contract.md「三、GET/POST /api/favorite」。
//   GET  返回 { ok: true, items: [HotItem] }，按收藏时间倒序（对齐前端 localStorage 头插法）
//   POST 返回 { ok: true }；重复收藏 409 DUPLICATE；校验失败 400 中文说明
//
// ⚠️ 过渡实现（Day 17–18）：本课程 Day 23 前没有登录体系（不建用户表），
//    user_key 先用查询参数（GET）/ 请求 body（POST）传入；Day 19 契约升级为
//    Authorization: Bearer <token> 后从 token 取 user_key，届时移除过渡版。
//
// 取数走 CloudBase 数据库 HTTP API（原因见 functions/hot/index.js 顶部注释）。
// 分两步查：先按 user_key 拿收藏（自带顺序），再按 id 批量取条目，在函数内还原顺序——
// 不依赖 PostgREST 的外键嵌套（embedded resource），少一个出错面。

const { rest, apiConfigured } = require('./rest')

const FRONTEND_ORIGIN = 'https://rednews-d5gd5vdss6b4d2119-1499375657.tcloudbaseapp.com'

// —— 校验规则（与契约 v0.5 一致）——
const LIMITS = { userKey: 64, itemId: 128 }

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

function badRequest(message) {
  return respond(400, {
    ok: false,
    error: { code: 'BAD_REQUEST', message },
  })
}

function toHotItem(row) {
  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    rank: Number(row.rank),
    heat: Number(row.heat),
    url: row.url,
    category: row.category,
    publishedAt: new Date(row.published_at).toISOString(),
  }
}

// ---------- POST：添加收藏（Day 18）----------
async function handlePost(event) {
  // 1) 解析 body（网关把 POST body 放在 event.body，可能是字符串）
  let body = {}
  if (typeof event.body === 'string' && event.body) {
    try {
      body = JSON.parse(event.body)
    } catch (e) {
      return badRequest('请求体不是合法的 JSON')
    }
  } else if (event.body && typeof event.body === 'object') {
    body = event.body
  }

  // 2) 字段校验：必填、类型、长度（错误信息说清「缺了什么」）
  const userKey = typeof body.userKey === 'string' ? body.userKey.trim() : ''
  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : ''

  if (!userKey) return badRequest('缺少必填字段 userKey')
  if (!itemId) return badRequest('缺少必填字段 itemId')
  if (userKey.length > LIMITS.userKey) {
    return badRequest(`userKey 超长：最多 ${LIMITS.userKey} 个字符，收到 ${userKey.length} 个`)
  }
  if (itemId.length > LIMITS.itemId) {
    return badRequest(`itemId 超长：最多 ${LIMITS.itemId} 个字符，收到 ${itemId.length} 个`)
  }

  // 3) 存在性检查：itemId 必须真在 trends 表里（不让外键错误裸奔到用户面前）
  const trendRows = await rest(
    `/v1/rdb/rest/trends?select=id&limit=1&id=eq.${encodeURIComponent(itemId)}`
  )
  if (!Array.isArray(trendRows) || trendRows.length === 0) {
    return badRequest('该热搜不存在或已下榜，无法收藏')
  }

  // 4) 防重复：同一 userKey + itemId 已收藏 → 409 明确拒绝（行数不增）
  const dupRows = await rest(
    `/v1/rdb/rest/favorites?select=item_id&limit=1&user_key=eq.${encodeURIComponent(userKey)}&item_id=eq.${encodeURIComponent(itemId)}`
  )
  if (Array.isArray(dupRows) && dupRows.length > 0) {
    return respond(409, {
      ok: false,
      error: { code: 'DUPLICATE', message: '该热搜已在收藏中' },
    })
  }

  // 5) 写入（PostgREST POST 单行插入）
  await rest('/v1/rdb/rest/favorites', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_key: userKey, item_id: itemId }),
  })

  // 服务端日志（Day 18 余力加练）：一条结构化日志，以后排查全靠它
  console.log(
    JSON.stringify({
      action: 'favorite_add',
      userKey,
      itemId,
      result: 'ok',
      time: new Date().toISOString(),
    })
  )

  return respond(200, { ok: true })
}

// ---------- GET：收藏列表（Day 17）----------
async function handleGet(event) {
  // 查询参数 userKey 必填（Day 19 后由 token 取代）
  const qs = event.queryStringParameters || {}
  const userKey = (qs.userKey || '').trim()
  if (!userKey) {
    return badRequest('缺少 userKey 参数（Day 19 起改用 Authorization 认证）')
  }

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

  const method = (event.httpMethod || 'GET').toUpperCase()
  try {
    if (method === 'POST') {
      return await handlePost(event)
    }
    return await handleGet(event)
  } catch (err) {
    console.error(
      JSON.stringify({
        action: 'favorite_' + method.toLowerCase(),
        result: 'error',
        message: err && err.message,
        detail: (err && err.detail) || null,
        time: new Date().toISOString(),
      })
    )
    return respond(500, {
      ok: false,
      error: { code: 'INTERNAL', message: '服务暂时不可用，请稍后重试' },
    })
  }
}
