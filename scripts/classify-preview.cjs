// 分类器预览：拿真实标题跑 functions/sync/categories.js，看命中率、分布、抽样。
// 改完词表先跑它，再谈部署——不看抽样就部署等于把误判推到线上。
//
// 用法：
//   node scripts/classify-preview.cjs                    # 拉线上 /api/hot 全部平台
//   node scripts/classify-preview.cjs /tmp/hot-live.json # 用本地快照（离线跑）
//
// 本项目根 package.json 是 type:module，所以这个文件必须是 .cjs 才能 require 云的 CJS 模块。
const fs = require('fs')
const { classifyCategory } = require('../functions/sync/categories')

const API = 'https://rednews-d5gd5vdss6b4d2119.service.tcloudbase.com/api/hot?platforms=weibo,douyin,bilibili,baidu&limit=300'
const NAME = {
  sports: '体育', gaming: '游戏', tech: '科技',
  finance: '财经', entertainment: '娱乐', society: '社会', general: '综合',
}

async function loadItems(arg) {
  if (arg && fs.existsSync(arg)) {
    return JSON.parse(fs.readFileSync(arg, 'utf8')).items
  }
  const res = await fetch(arg || API)
  const json = await res.json()
  return json.items
}

;(async () => {
  const items = await loadItems(process.argv[2])
  console.log(`样本 ${items.length} 条`)

  for (const threshold of [1, 2, 3]) {
    const tagged = items.filter((i) => classifyCategory(i.title, threshold) !== 'general').length
    console.log(`  阈值 ${threshold}：已分类 ${tagged}/${items.length}（${(tagged / items.length * 100).toFixed(0)}%）`)
  }

  const buckets = {}
  for (const it of items) (buckets[classifyCategory(it.title)] = buckets[classifyCategory(it.title)] || []).push(`${it.platform}｜${it.title}`)

  console.log('\n===== 默认阈值下的分布与抽样（每类 3 条）=====')
  for (const id of ['sports', 'gaming', 'tech', 'finance', 'entertainment', 'society']) {
    const list = buckets[id] || []
    console.log(`\n【${NAME[id]}】${list.length} 条`)
    list.slice(0, 3).forEach((t) => console.log('  ' + t))
  }

  const gen = buckets.general || []
  console.log(`\n===== 留「综合」${gen.length} 条（全列）=====`)
  gen.forEach((t) => console.log('  ' + t))
})()
