// Day 20｜API 客户端层
// 集中管：API 基础地址 / 4 个调用 / 响应字段规范化
//
// dev 模式：fetch('/api/...')，由 vite.config.js 的 server.proxy 转到 CloudBase 网关，
//           避免开发期跨域 + 不用在这里写绝对 URL
// 生产构建：import.meta.env.PROD === true → 用兜底绝对 URL（API 网关域名）
//
// ⚠️ 改环境只改这个常量；别在多处拼接

import { getUserKey } from './userKey'

// API 网关域名（Day 15 创建的环境，公网唯一入口）
// 注：环境 ID / 域名都不是秘密，公开放这里
const PROD_API_BASE = 'https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com'

// dev 走相对路径（vite proxy 转发）；生产用绝对 URL
const API_BASE = import.meta.env.PROD ? PROD_API_BASE : ''

// 把后端 snake_case / Date 字符串转成前端好用的形状
// 重要：publishedAt 必须是 number（ms），下游 `now - publishedAt`、`formatRelative()` 都依赖这个
function normalizeHotItem(row) {
  if (!row || typeof row !== 'object') return row
  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    rank: Number(row.rank),
    heat: Number(row.heat),
    category: row.category,
    url: row.url,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).getTime() : 0,
  }
}

// fetch 统一封装：处理 ok / error 形状，把契约错误扔出去
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    // 非 JSON 响应（极少见，平台层 5xx 可能返 HTML）
    throw new Error(`接口返回非 JSON (HTTP ${res.status})`)
  }
  if (!res.ok || (data && data.ok === false)) {
    const code = (data && data.error && data.error.code) || `HTTP_${res.status}`
    const msg = (data && data.error && data.error.message) || `请求失败 (HTTP ${res.status})`
    const err = new Error(msg)
    err.code = code
    err.status = res.status
    throw err
  }
  return data
}

// GET /api/hot?platforms=weibo,douyin
// 不传 platforms = 全平台（详情页 / 收藏页要的是全量）
// 返回 { items, updatedAt(ms) }：updatedAt 来自后端 lastFetched = trends 最新 trend_date 0 点（Date 转 ms）
export async function getHotItems(platforms) {
  const qs = platforms && platforms.length
    ? `?platforms=${encodeURIComponent(platforms.join(','))}`
    : ''
  const data = await request(`/api/hot${qs}`)
  const items = (data.items || []).map(normalizeHotItem)
  return {
    items,
    updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
  }
}

// GET /api/favorite?userKey=xxx
// 返回 { items, updatedAt }，同 getHotItems
export async function getFavorites(userKey) {
  const data = await request(`/api/favorite?userKey=${encodeURIComponent(userKey)}`)
  const items = (data.items || []).map(normalizeHotItem)
  return {
    items,
    updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
  }
}

// POST /api/favorite { userKey, itemId }
export async function addFavorite({ userKey, itemId }) {
  return request('/api/favorite', {
    method: 'POST',
    body: JSON.stringify({ userKey, itemId }),
  })
}

// DELETE /api/favorite?userKey=...&itemId=...（Day 22）
// 后端走 queryString（与 GET 一致）；幂等：未收藏时也返 200
export async function removeFavorite({ userKey, itemId }) {
  return request(
    `/api/favorite?userKey=${encodeURIComponent(userKey)}&itemId=${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  )
}

// GET /api/health（检查台展示用）
export async function getHealth() {
  return request('/api/health')
}

// 集中导出 userKey 获取器（页面各处需要的同一份）
export { getUserKey }
