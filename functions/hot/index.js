// Day 17 板块①：GET /api/hot —— 全平台热搜列表
// 契约：api-contract.md「三、GET /api/hot」
// 形状：成功 { ok: true, items: [HotItem] }；失败 { ok: false, error: { code, message } }
//
// Day 19 重构：所有 SQL 抽到 ./repositories/trendsRepository.js，本文件零 SQL。
//
// 【为什么走 HTTP API 而不是 pg 直连】（Day 17 实测结论）
// 免费体验版是共享集群：控制台「网络配置」内网地址为空，官方社区确认
// 「直连能力等待后续功能更新后提供，需标准版 + VPC 内网互联」。
// 所以云函数改用 CloudBase 数据库 HTTP API（PostgREST）取数，契约与前端零改动。

const { apiConfigured } = require('./rest')
const trendsRepository = require('./repositories/trendsRepository')

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
    const latestDate = await trendsRepository.findLatestTrendDate()
    if (!latestDate) {
      return respond(200, { ok: true, items: [] })
    }
    const items = await trendsRepository.findByDateAndPlatforms(latestDate, platforms)
    return respond(200, { ok: true, items })
  } catch (err) {
    console.error('[hot] 查询失败：', err && err.message, JSON.stringify((err && err.detail) || null))
    return respond(500, {
      ok: false,
      error: { code: 'INTERNAL', message: '服务暂时不可用，请稍后重试' },
    })
  }
}
