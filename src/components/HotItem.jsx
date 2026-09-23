// 单个热搜条目（Day 7 第 3 步 F1：第 3 列才用到）
import { CATEGORY_MAP } from '../lib/mockData'
import { formatHeat, formatRelative } from '../lib/mockData'

// TOP 3 排名前三用的强调色
const RANK_STYLE = {
  1: { bg: 'bg-red-500',     text: 'text-white', glow: 'shadow-red-500/30' },
  2: { bg: 'bg-orange-500',  text: 'text-white', glow: 'shadow-orange-500/30' },
  3: { bg: 'bg-amber-500',   text: 'text-slate-900', glow: 'shadow-amber-500/30' },
}

export default function HotItem({ item, now }) {
  const cat = CATEGORY_MAP[item.category]
  const rankStyle = RANK_STYLE[item.rank] || { bg: 'bg-slate-700/60', text: 'text-slate-400', glow: '' }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-slate-800/40"
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
          <span className="text-orange-400/90">
            <span className="font-semibold">{formatHeat(item.heat)}</span>
            <span className="ml-0.5 text-slate-500">热度</span>
          </span>
          <span className="text-slate-500">{formatRelative(item.publishedAt, now)}</span>
        </div>
      </div>
    </a>
  )
}