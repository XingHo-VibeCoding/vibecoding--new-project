// Day 17 板块①：GET /api/hot —— 全平台热搜列表
// 契约：api-contract.md「三、GET /api/hot」
// 形状：成功 { ok: true, items: [HotItem] }；失败 { ok: false, error: { code, message } }
//
// 【为什么走 HTTP API 而不是 pg 直连】（Day 17 实测结论）
// 免费体验版是共享集群：控制台「网络配置」内网地址为空，官方社区确认
// 「直连能力等待后续功能更新后提供，需标准版 + VPC 内网互联」。
// 所以云函数改用 CloudBase 数据库 HTTP API（PostgREST）取数，契约与前端零改动。

const { rest, apiConfigured } = require('./rest')

const ALLOWED_PLATFORMS = ['weibo', 'zhihu', 'douyin', 'baidu', 'xiaohongshu', 'bilibili']

// CORS：提前放行前端静态托管域名（GET 属简单请求，无需 OPTIONS 预检；
// 统一的预检与跨域策略按契约 Day 20 处理）
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

// 数据库行（snake_case）→ 契约 HotItem（camelCase）
// BIGINT 这里防御性 Number()；timestamptz 字符串统一转 ISO 8601 UTC
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

  // 解析 platforms 查询参数（可选，逗号分隔，默认全部 6 平台）
  const qs = event.queryStringParameters || {}
  let platforms = [...ALLOWED_PLATFORMS]
  if (qs.platforms) {
    const requested = qs.platforms.split(',').map((s) => s.trim()).filter(Boolean)
    const bad = requested.filter((p) => !ALLOWED_PLATFORMS.includes(p))
    if (bad.length > 0) {
      return respond(400, {
        ok: false,
        error: {
          code: 'BAD_REQUEST',
          message: `不支持的平台：${bad.join('、')}（可选值：${ALLOWED_PLATFORMS.join(', ')}）`,
        },
      })
    }
    platforms = requested
  }

  try {
    // 1) 库里最新有数据的榜单日期（不写死今天：同步任务没跑的早晨页面也不空屏）
    const latestRows = await rest('/v1/rdb/rest/trends?select=trend_date&order=trend_date.desc&limit=1')
    const latestDate = Array.isArray(latestRows) && latestRows[0] ? latestRows[0].trend_date : null
    if (!latestDate) {
      return respond(200, { ok: true, items: [] })
    }

    // 2) 该日期 + 所选平台的条目，按平台、排名排序
    const query = [
      'select=id,platform,title,rank,heat,category,url,published_at',
      `trend_date=eq.${latestDate}`,
      `platform=in.(${platforms.join(',')})`,
      'order=platform.asc,rank.asc',
    ].join('&')

    const rows = await rest(`/v1/rdb/rest/trends?${query}`)
    return respond(200, { ok: true, items: (rows || []).map(toHotItem) })
  } catch (err) {
    console.error('[hot] 查询失败：', err && err.message, JSON.stringify((err && err.detail) || null))
    return respond(500, {
      ok: false,
      error: { code: 'INTERNAL', message: '服务暂时不可用，请稍后重试' },
    })
  }
}
