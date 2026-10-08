// 数据访问层（Day 19 重构产物）
// 职责：把「怎么写 trends 表」从 sync 接口里抽出来。
// 接口文件（functions/sync/index.js）只调这里暴露的方法，不出现任何 SQL。
//
// 写入：PostgREST upsert（on_conflict=platform,title,trend_date + merge-duplicates），
// 等价于 SQL 的 INSERT ... ON CONFLICT (platform,title,trend_date) DO UPDATE，
// 重复执行不产生重复行（幂等）。

const { rest } = require('../rest')

// 批量 upsert 趋势行（参数化，零字符串拼接）
async function upsertMany(rows) {
  if (!rows || rows.length === 0) return
  await rest('/v1/rdb/rest/trends?on_conflict=platform,title,trend_date', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  })
}

module.exports = { upsertMany }
