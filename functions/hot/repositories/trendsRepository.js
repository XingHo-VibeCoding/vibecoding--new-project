// 数据访问层（Day 19 重构产物）
// 职责：把「怎么查 trends 表」从接口里抽出来。
// 接口文件（functions/hot/index.js）只调这里暴露的方法，不出现任何 SQL。
//
// 取数走 CloudBase 数据库 HTTP API（PostgREST）—— 原因见 functions/hot/index.js 顶部注释
// 与 functions/favorite/rest.js / functions/sync/rest.js 同一份薄封装，此处按函数各持一份（与 rest.js 重复策略一致，MVP 阶段接受受控重复）。

const { rest } = require('../rest')

// 数据库行（snake_case）→ 契约 HotItem（camelCase）
// BIGINT 防御性 Number()；timestamptz 字符串统一转 ISO 8601 UTC
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

// 取库里最新有数据的榜单日期（不写死"今天"——同步任务没跑的早晨页面也不空屏）
async function findLatestTrendDate() {
  const rows = await rest('/v1/rdb/rest/trends?select=trend_date&order=trend_date.desc&limit=1')
  return Array.isArray(rows) && rows[0] ? rows[0].trend_date : null
}

// 取某日期 + 若干平台的全部条目，按平台、排名排序
async function findByDateAndPlatforms(trendDate, platforms) {
  const query = [
    'select=id,platform,title,rank,heat,category,url,published_at',
    `trend_date=eq.${trendDate}`,
    `platform=in.(${platforms.join(',')})`,
    'order=platform.asc,rank.asc',
  ].join('&')
  const rows = await rest(`/v1/rdb/rest/trends?${query}`)
  return (rows || []).map(toHotItem)
}

module.exports = { findLatestTrendDate, findByDateAndPlatforms }
