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

module.exports = { findByUserKey, existsByUserAndItem, insert }
