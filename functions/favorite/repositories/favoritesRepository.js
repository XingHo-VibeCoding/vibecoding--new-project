// 数据访问层（Day 19 重构产物）
// 职责：把「怎么读写 favorites 表」从接口里抽出来。
// 接口文件（functions/favorite/index.js）只调这里暴露的方法，不出现任何 SQL。

const { rest } = require('../rest')

// 某用户的全部收藏，按收藏时间倒序（与前端 localStorage 头插法展示顺序一致）
async function findByUserKey(userKey) {
  const rows = await rest(
    `/v1/rdb/rest/favorites?select=item_id,created_at&user_key=eq.${encodeURIComponent(userKey)}&order=created_at.desc`
  )
  return Array.isArray(rows) ? rows : []
}

// 同一 userKey + itemId 是否已收藏（防重复）
async function existsByUserAndItem(userKey, itemId) {
  const rows = await rest(
    `/v1/rdb/rest/favorites?select=item_id&limit=1&user_key=eq.${encodeURIComponent(userKey)}&item_id=eq.${encodeURIComponent(itemId)}`
  )
  return Array.isArray(rows) && rows.length > 0
}

// 写入一条收藏（外键约束会保证 item_id 一定在 trends 里；存在性检查放在 trendsRepository.existsById）
async function insert(userKey, itemId) {
  await rest('/v1/rdb/rest/favorites', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_key: userKey, item_id: itemId }),
  })
}

// 取消一条收藏（Day 22）—— 幂等：未收藏时调用也返回 0 行受影响，不报错
// 不做"先 select 再 delete"的两步走是为了减少一次网络往返，也避免 select-到-delete 之间被并发
// 收藏导致的幻读；DELETE with filter 在 PostgREST 上是原子的。
async function deleteByUserAndItem(userKey, itemId) {
  await rest(
    `/v1/rdb/rest/favorites?user_key=eq.${encodeURIComponent(userKey)}&item_id=eq.${encodeURIComponent(itemId)}`,
    { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
  )
}

module.exports = { findByUserKey, existsByUserAndItem, insert, deleteByUserAndItem }
