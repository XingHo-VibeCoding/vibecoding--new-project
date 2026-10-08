// 数据访问层（Day 19 重构产物）
// 职责：把「怎么查 trends 表」从 favorite 接口里抽出来。
// 接口文件（functions/favorite/index.js）只调这里暴露的方法，不出现任何 SQL。

const { rest } = require('../rest')

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

// 批量取趋势条目（按 id 列表）
async function findByIds(ids) {
  if (!ids || ids.length === 0) return []
  const query = `select=id,platform,title,rank,heat,category,url,published_at&id=in.(${ids.join(',')})`
  const rows = await rest(`/v1/rdb/rest/trends?${query}`)
  return rows || []
}

// 收藏写入前：itemId 必须在 trends 表里，否则外键错误会裸奔到用户面前
async function existsById(id) {
  const rows = await rest(
    `/v1/rdb/rest/trends?select=id&limit=1&id=eq.${encodeURIComponent(id)}`
  )
  return Array.isArray(rows) && rows.length > 0
}

// 把 {id → row} 查表后还原成 HotItem 列表（用于 GET /api/favorite：先按 user_key 拿收藏顺序，再按 id 批量取 trends 详情）
async function findByIdsAsHotItems(ids) {
  const rows = await findByIds(ids)
  return rows.map(toHotItem)
}

module.exports = { findByIds, findByIdsAsHotItems, existsById }
