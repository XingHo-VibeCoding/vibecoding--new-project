// 单平台榜单列（Day 7 第 3 步 F1：TOP 10 + 展开剩余 40 条）
import { useState } from 'react'
import HotItem from './HotItem'

const VISIBLE_COUNT = 10

export default function PlatformColumn({ platform, items, now }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, VISIBLE_COUNT)
  const hiddenCount = items.length - VISIBLE_COUNT

  return (
    <section
      className="flex flex-col rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm"
      aria-label={`${platform.name}热搜榜`}
    >
      {/* 列头：平台名 + 区间 */}
      <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-slate-900"
            style={{ backgroundColor: platform.color, boxShadow: `0 0 12px ${platform.color}80` }}
          />
          <h3 className="text-base font-semibold tracking-wide text-slate-100">
            {platform.name}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">
            TOP {expanded ? `1–${items.length}` : `1–${VISIBLE_COUNT}`} / {items.length}
          </p>
          <p className="mt-0.5 text-xs text-orange-400/80">
            {expanded ? '已展开全部' : `${hiddenCount} 条待展开`}
          </p>
        </div>
      </header>

      {/* 榜单列表 */}
      <ol className="flex-1 divide-y divide-slate-800/40 px-2 py-2">
        {visible.map((item) => (
          <li key={item.id}>
            <HotItem item={item} now={now} />
          </li>
        ))}
      </ol>

      {/* 展开按钮（仅在未展开时显示） */}
      {!expanded && hiddenCount > 0 && (
        <div className="border-t border-slate-800/60 p-3">
          <button
            onClick={() => setExpanded(true)}
            className="w-full rounded-lg border border-slate-700/80 bg-slate-800/30 px-4 py-2.5 text-sm text-slate-300 transition hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-300"
          >
            展开剩余 {hiddenCount} 条 →
          </button>
        </div>
      )}
    </section>
  )
}