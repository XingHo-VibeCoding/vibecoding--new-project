// Day 17 板块①：GET /api/favorite —— 收藏列表
// Day 18 板块①：POST /api/favorite —— 添加收藏（第一条业务写入接口）
// Day 19 重构：所有 SQL 抽到 ./repositories/*，本文件零 SQL。
// Day 22：DELETE /api/favorite —— 取消收藏（数据操作闭环的"删"）。
//
// 契约：api-contract.md「三、GET/POST/DELETE /api/favorite」：
//   GET    返回 { ok: true, items: [HotItem] }，按收藏时间倒序（对齐前端 localStorage 头插法）
//   POST   返回 { ok: true }；重复收藏 409 DUPLICATE；校验失败 400 中文说明
//   DELETE 返回 { ok: true }，幂等（未收藏时也成功）
//
// ⚠️ 过渡实现（Day 17–18）：本课程 Day 23 前没有登录体系（不建用户表），
//    user_key 先用查询参数（GET）/ 请求 body（POST）传入；Day 19 契约升级为
//    Authorization: Bearer <token> 后从 token 取 user_key，届时移除过渡版。

const { apiConfigured } = require('./rest')
const trendsRepository = require('./repositories/trendsRepository')
const favoritesRepository = require('./repositories/favoritesRepository')

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

// ---------- POST：添加收藏（Day 18）----------
async function handlePost(event) {
  // 1) 解析 body
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

  // 2) 字段校验
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

  try {
    // 3) 存在性检查（不让外键错误裸奔到用户面前）
    const trendExists = await trendsRepository.existsById(itemId)
    if (!trendExists) {
      return badRequest('该热搜不存在或已下榜，无法收藏')
    }

    // 4) 防重复
    const already = await favoritesRepository.existsByUserAndItem(userKey, itemId)
    if (already) {
      return respond(409, {
        ok: false,
        error: { code: 'DUPLICATE', message: '该热搜已在收藏中' },
      })
    }

    // 5) 写入
    await favoritesRepository.insert(userKey, itemId)

    // 服务端日志（Day 18 余力加练）
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
  } catch (err) {
    throw err
  }
}

// ---------- GET：收藏列表（Day 17）----------
async function handleGet(event) {
  const qs = event.queryStringParameters || {}
  const userKey = (qs.userKey || '').trim()
  if (!userKey) {
    return badRequest('缺少 userKey 参数（Day 19 起改用 Authorization 认证）')
  }

  // 1) 该用户的收藏，按收藏时间倒序
  const favRows = await favoritesRepository.findByUserKey(userKey)
  if (favRows.length === 0) {
    return respond(200, { ok: true, items: [] })
  }

  // 2) 批量取条目，再按收藏顺序还原
  const ids = favRows.map((r) => r.item_id)
  const items = await trendsRepository.findByIdsAsHotItems(ids)
  // 保留 favoritesRepository 给的收藏顺序
  const byId = new Map(items.map((it) => [it.id, it]))
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean)

  return respond(200, { ok: true, items: ordered })
}

// ---------- DELETE：取消收藏（Day 22）----------
// 走 queryString（与 GET 一致）；幂等：未收藏时调用也返回 0 行受影响，HTTP 仍 200。
// 不做"先 existsByUserAndItem 再 delete"的两步：避免多一次网络往返与并发幻读，
// PostgREST 的 DELETE with filter 是原子的。
async function handleDelete(event) {
  const qs = event.queryStringParameters || {}
  const userKey = (qs.userKey || '').trim()
  const itemId = (qs.itemId || '').trim()

  if (!userKey) return badRequest('缺少 userKey 参数（Day 19 起改用 Authorization 认证）')
  if (!itemId) return badRequest('缺少 itemId 参数')
  if (userKey.length > LIMITS.userKey) {
    return badRequest(`userKey 超长：最多 ${LIMITS.userKey} 个字符，收到 ${userKey.length} 个`)
  }
  if (itemId.length > LIMITS.itemId) {
    return badRequest(`itemId 超长：最多 ${LIMITS.itemId} 个字符，收到 ${itemId.length} 个`)
  }

  await favoritesRepository.deleteByUserAndItem(userKey, itemId)

  // 服务端日志（与 POST 风格一致）
  console.log(
    JSON.stringify({
      action: 'favorite_remove',
      userKey,
      itemId,
      result: 'ok',
      time: new Date().toISOString(),
    })
  )
  return respond(200, { ok: true })
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
    if (method === 'DELETE') {
      return await handleDelete(event)
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
