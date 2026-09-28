// 筛选栏（Day 12：PRD F3 关键词 + 分类标签，调用 frontend-guidelines Skill 实现）
// 规则：
//   1. 关键词对标题做「包含」匹配，不区分大小写（主要防英文关键词，如 AI / GPT）
//   2. 分类可多选，不选任何分类 = 看全部分类
//   3. 关键词和分类同时存在时是「且」的关系（先按分类圈范围，再按关键词收窄）
//   4. 筛选是临时状态，不写 localStorage——刷新即清空（和收藏不同，筛选不该跨会话记住）
import { CATEGORIES } from '../lib/mockData'

export default function FilterBar({
  keyword,
  onKeywordChange,
  activeCategories,
  onToggleCategory,
  onClear,
  matchCount,
  totalCount,
}) {
  const kw = keyword.trim()
  const hasFilter = kw !== '' || activeCategories.length > 0

  return (
    <section
      aria-label="筛选热搜"
      className="mb-6 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="filter-keyword" className="text-sm font-medium text-slate-300">
          筛选
        </label>

        {/* 关键词输入：type="search" 自带清除按钮（Edge/Chrome 显示 ×） */}
        <input
          id="filter-keyword"
          type="search"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="标题关键词，如：AI"
          className="w-44 rounded-full border border-slate-700/70 bg-slate-800/30 px-4 py-1.5 text-sm text-slate-100 transition placeholder:text-slate-500 hover:border-slate-500/80 focus:border-orange-400/60 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
        />

        <span className="mx-1 hidden h-5 w-px bg-slate-700/60 sm:block" aria-hidden="true" />

        {CATEGORIES.map((c) => {
          const isActive = activeCategories.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => onToggleCategory(c.id)}
              aria-pressed={isActive}
              title={isActive ? `取消「${c.name}」分类` : `只看「${c.name}」分类`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
                isActive
                  ? `${c.bg} ${c.text} ${c.border}`
                  : 'border-slate-700/70 bg-transparent text-slate-400 hover:border-slate-500/80 hover:text-slate-200'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isActive ? '' : 'opacity-60'}`}
                style={{ backgroundColor: c.color }}
              />
              {c.name}
            </button>
          )
        })}

        {/* 清空按钮只在有筛选条件时出现——没有条件时它没有意义（R2：不能看起来能点但点了没反应） */}
        {hasFilter && (
          <button
            onClick={onClear}
            className="ml-auto rounded-full border border-slate-600/70 bg-transparent px-3 py-1.5 text-sm text-slate-300 transition hover:border-red-400/60 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            清空筛选
          </button>
        )}
      </div>

      {/* 筛选结果播报：屏幕阅读器和肉眼都能知道当前命中多少条（Day 11 学的反馈双通道） */}
      <p role="status" aria-live="polite" className="mt-3 text-xs text-slate-400">
        {hasFilter
          ? `当前筛选：${matchCount} / ${totalCount} 条匹配` +
            (kw ? ` · 关键词「${kw}」` : '') +
            (activeCategories.length
              ? ` · 分类 ${activeCategories
                  .map((id) => CATEGORIES.find((c) => c.id === id).name)
                  .join('、')}`
              : '') +
            '。点「清空筛选」恢复全部。'
          : '支持关键词 + 分类组合筛选，多个分类可同时选中，筛选只对当前展示的平台生效。'}
      </p>
    </section>
  )
}
