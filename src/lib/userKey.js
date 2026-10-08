// Day 20｜userKey 管理
// 浏览器身份：Day 19 之前没登录体系，userKey 充当「用户 ID」
//   - 首次访问：crypto.randomUUID() 生成，落 localStorage
//   - 后续访问：localStorage 读出，原样使用
// Day 23 登录后换成 token（云函数从 Authorization 取 user_key），届时移除这一层。

const KEY = 'trendwave:userKey'

export function getUserKey() {
  try {
    const v = localStorage.getItem(KEY)
    if (v && v.length >= 8) return v
  } catch {
    /* localStorage 不可用 —— 用临时 ID 也能让当天能用，刷新后失效 */
  }
  // 兜底：生成一个新的
  return ensureUserKey()
}

export function ensureUserKey() {
  const v = safeUuid()
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* 存不进去：当天仍可使用（接口仍能收到 userKey），明天会再分配一个 */
  }
  return v
}

function safeUuid() {
  // 现代浏览器 / Node 19+ / Chrome 92+ 都有 crypto.randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // 极旧浏览器兜底
  return 'u-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}
