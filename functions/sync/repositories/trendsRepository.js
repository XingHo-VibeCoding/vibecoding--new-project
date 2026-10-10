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

// Day 24｜清理「当天同平台、本轮没抓到的新 rank 旧条目」：
//   多次 sync 累积会让 B 站当天的 trends 行 > 接口单次返回 50（已实测 101 条/50 rank）。
//   原因：upsert 的 ON CONFLICT 只比对 (platform,title,trend_date)，同一 rank 上
//   换了不同标题的新词条不会触发冲突，于是旧行原样保留。
//   修法：sync 写本批之前，先把 (platform, trend_date) 下 id 不在 keepIds 里的旧行删掉，
//   再 upsert 新的一批——保证当天同平台恰好就是当前抓到的那批。
//   副作用：favorites.item_id 的 FK 是 ON DELETE CASCADE，被删 trends 行指向的收藏
//   会静默删除（CLOUDBASE.md Day 22 已记录此约束）。这是 day-24 选定方案 A 的取舍：
//   业务上「词条已下榜 → 收藏也跟着下榜」是符合直觉的，留住 ghost 行反而误导用户。
async function deleteStaleByPlatformAndDate(platform, trendDate, keepIds) {
  if (!Array.isArray(keepIds) || keepIds.length === 0) {
    // 理论上不会到这里：sync 在调 cleanup 前一定先有 rows（fetch 函数失败会在
    // 上面 try/catch 捕获，不会走到这里），但保险起见显式 return——空 keepIds
    // 等同于「把当天该平台全部删掉」，会丢掉刚抓到的数据，绝不能让 DELETE 误触发。
    return { deleted: 0, skipped: true }
  }
  // PostgREST 的 in.(...) 用括号包逗号分隔的双引号字符串列表（最多约 150 个 ID，
  // 单批最多 50 远低于上限）。每个 ID 做最小转义：剥离可能的反引号/双引号，
  // 防止外部拼接注入——id 由 sync 内部 md5 拼出，本来就不会含特殊字符。
  const list = keepIds.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',')
  const filter =
    `platform=eq.${encodeURIComponent(platform)}` +
    `&trend_date=eq.${encodeURIComponent(trendDate)}` +
    `&id=not.in.(${list})`
  await rest(`/v1/rdb/rest/trends?${filter}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
  return { deleted: 'unknown', skipped: false } // Prefer: return=minimal 不返回行数
}

module.exports = { upsertMany, deleteStaleByPlatformAndDate }
