// Day 20｜API 客户端层
// Day 23｜错误处理与安全边界：加请求超时 + 错误分类（网络 / 超时 / 服务端）
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

// Day 23：请求超时。超时后 abort，网络挂起不再无限 Loading（状态机死锁的边界修复）。
// 取 10s：公网实测接口 P95 < 1s，10s 是「远超正常值但用户还能忍」的量级。
const REQUEST_TIMEOUT_MS = 10_000

// Day 23：错误分类。err.code 的取值约定（前端唯一出口，别处别自己造）：
//   'NETWORK'   —— 请求根本没到服务器（断网 / DNS / TLS）
//   'TIMEOUT'   —— 请求发出去了但等了 10s 没响应
//   'HTTP_4xx/5xx' / 后端 error.code —— 服务器有回应，按响应内容分
export const ERROR_KINDS = {
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
}

// 判断一个 err 是哪类——ErrorState 按这个换人话文案
export function errorKind(err) {
  if (!err) return ''
  if (err.code === ERROR_KINDS.NETWORK) return ERROR_KINDS.NETWORK
  if (err.code === ERROR_KINDS.TIMEOUT) return ERROR_KINDS.TIMEOUT
  // fetch 抛 TypeError 一般是「Failed to fetch」（断网 / CORS 被拦）
  if (err instanceof TypeError) return ERROR_KINDS.NETWORK
  if (err && err.name === 'AbortError') return ERROR_KINDS.TIMEOUT
  return err.status >= 500 ? 'SERVER' : 'API'
}

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
// Day 23：加 AbortController 超时；网络层异常统一带 code 抛出（见 errorKind 注释）
async function request(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: controller.signal,
      ...options,
    })
  } catch (err) {
    // 两条路到这里：①断网/DNS/CORS（浏览器抛 TypeError: Failed to fetch）
    // ②超时被 abort（err.name === 'AbortError'）——统一转成带 code 的 Error
    const kind = err && err.name === 'AbortError' ? ERROR_KINDS.TIMEOUT : ERROR_KINDS.NETWORK
    const friendly =
      kind === ERROR_KINDS.TIMEOUT ? '请求超时（10 秒无响应）' : '网络连不上（请检查网络后重试）'
    const wrapped = new Error(friendly)
    wrapped.code = kind
    throw wrapped
  } finally {
    clearTimeout(timer)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // 非 JSON 响应（极少见，平台层 5xx 可能返 HTML）
    const err = new Error(`接口返回非 JSON (HTTP ${res.status})`)
    err.code = `HTTP_${res.status}`
    err.status = res.status
    throw err
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
