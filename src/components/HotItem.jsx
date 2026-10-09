// 单个热搜条目（Day 7 第 3 步 F1：第 3 列才用到）
// Day 13：点击整条不再跳外部原文，而是进站内详情页（PRD F4）——外链移到详情页的「查看原文」
import { CATEGORY_MAP } from '../lib/mockData'
import { formatHeat, formatRelative } from '../lib/mockData'
import { ROUTES } from '../hooks/useHashRoute'

// TOP 3 排名前三用的强调色
const RANK_STYLE = {
  1: { bg: 'bg-red-500',     text: 'text-white', glow: 'shadow-red-500/30' },
  2: { bg: 'bg-orange-500',  text: 'text-white', glow: 'shadow-orange-500/30' },
  3: { bg: 'bg-amber-500',   text: 'text-slate-900', glow: 'shadow-amber-500/30' },
}

export default function HotItem({ item, now, isFavorited = false, onToggleFavorite }) {
  // Day 20 加：容错——真实数据若出现未知分类（不在 CATEGORY_MAP），
  // 回落到「综合」样式而不是直接炸。HotItem 在列表每行都要渲染，单点失败会整页崩。
  const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.general
  const rankStyle = RANK_STYLE[item.rank] || { bg: 'bg-slate-700/60', text: 'text-slate-400', glow: '' }

  return (
    <a
      href={ROUTES.detail(item.id)}
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-800/40 focus-visible:bg-slate-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
    >
      {/* 排名标 */}
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold shadow-sm ${rankStyle.bg} ${rankStyle.text} ${rankStyle.glow}`}
      >
        {item.rank}
      </span>

      {/* 标题 + 元信息 */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-100 group-hover:text-white">
          {item.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-md border px-1.5 py-0.5 ${cat.bg} ${cat.text} ${cat.border}`}
          >
            {cat.name}
          </span>
          {/* Day 21：百度榜单接口不返回热度值（heat 记 0），
              这类条目就不渲染热度块，避免出现「0 热度」这种刺眼文案 */}
          {item.heat > 0 && (
            <span className="text-orange-400/90">
              <span className="font-semibold">{formatHeat(item.heat)}</span>
              <span className="ml-0.5 text-slate-400">热度</span>
            </span>
          )}
          <span className="text-slate-400">{formatRelative(item.publishedAt, now)}</span>
        </div>
      </div>

      {/* Day 11 F5：收藏星（PRD「我的收藏」第一步，未登录存本地）
          放在 <a> 里面，必须拦截事件——否则点星会同时触发整条热搜的跳转 */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()   // 不触发外层 <a> 的跳转
          e.stopPropagation()   // 也不让它冒泡
          onToggleFavorite?.(item.id)
        }}
        aria-pressed={isFavorited}
        aria-label={isFavorited ? `取消收藏：${item.title}` : `收藏：${item.title}`}
        title={isFavorited ? '取消收藏' : '收藏'}
        className={`shrink-0 self-start rounded-md px-1.5 py-0.5 text-base leading-6 transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
          isFavorited
            ? 'animate-pop text-orange-400 hover:text-orange-300'
            : 'text-slate-500 hover:text-orange-300'
        }`}
      >
        {isFavorited ? '★' : '☆'}
      </button>
    </a>
  )
}