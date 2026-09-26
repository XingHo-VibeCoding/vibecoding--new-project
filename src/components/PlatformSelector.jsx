// 平台选择栏（Day 10 提前实现 PRD F2：6 选 3 + 挤掉最早 + localStorage 记忆）
// 规则：
//   1. 最多同时展示 3 个平台（PRD F1 三列布局的上限）
//   2. 已选满 3 个时再点第 4 个 → 最早选中的那个被替换下去（先进先出）
//   3. 至少保留 1 个：最后一个选中的平台不允许取消
import { PLATFORMS } from '../lib/mockData'

export default function PlatformSelector({ active, onToggle, max = 3 }) {
  return (
    <section
      aria-label="选择要展示的热搜平台"
      className="mb-6 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-300">
          平台
          <span className="ml-1.5 font-mono text-xs text-slate-400">
            {active.length}/{max}
          </span>
        </span>

        {PLATFORMS.map((p) => {
          const isActive = active.includes(p.id)
          const isLast = isActive && active.length === 1
          return (
            <button
              key={p.id}
              onClick={() => onToggle(p.id)}
              aria-pressed={isActive}
              title={
                isLast
                  ? '至少保留 1 个平台，不能取消'
                  : isActive
                    ? `收起 ${p.name} 榜单`
                    : `展示 ${p.name} 榜单`
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
                isActive
                  ? 'bg-slate-800/60 text-slate-100'
                  : 'border-slate-700/70 bg-transparent text-slate-400 hover:border-slate-500/80 hover:text-slate-200'
              }`}
              style={
                isActive
                  ? {
                      borderColor: p.color,
                      boxShadow: `0 0 10px ${p.color}40`,
                    }
                  : undefined
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${isActive ? '' : 'opacity-50'}`}
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        最多同时展示 {max} 个平台：再选一个会替换掉最早选中的；至少保留 1 个。你的选择会被记住，下次进来不用重选。
      </p>
    </section>
  )
}
