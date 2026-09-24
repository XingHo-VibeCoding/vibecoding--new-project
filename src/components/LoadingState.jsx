// Day 8｜状态一：加载中（骨架屏）
// 骨架条的形状模仿真实条目（排名方块 + 两行文字），让加载后的切换不跳版
import { PLATFORMS } from '../lib/mockData'

const DEFAULT_IDS = ['weibo', 'zhihu', 'douyin']

export default function LoadingState({ platformIds = DEFAULT_IDS }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="热搜数据加载中"
    >
      {platformIds.map((id) => {
        const p = PLATFORMS.find((x) => x.id === id)
        if (!p) return null
        return (
          <section
            key={id}
            className="rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm"
          >
            <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full opacity-50"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-base font-semibold text-slate-400">{p.name}</span>
              </div>
              <span className="text-xs text-slate-400">加载中…</span>
            </header>

            <div className="space-y-3.5 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-1">
                  <div className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-slate-800/70" />
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-3.5 animate-pulse rounded bg-slate-800/70"
                      style={{ width: `${72 + (i % 3) * 9}%` }}
                    />
                    <div className="h-3 w-28 animate-pulse rounded bg-slate-800/45" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}