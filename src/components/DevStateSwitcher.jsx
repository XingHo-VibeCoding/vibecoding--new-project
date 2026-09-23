// Day 8｜开发态四状态切换器（演示用）
//
// ⚠️ 这是个「脚手架」不是产品功能 —— 真实产品里用户不需要手动切状态。
// 它存在的唯一理由：让「空」和「错误」这两种自然触发不了的态能被看见、被截图。
// 计划在 Day 13（正式做四种状态处理 + 多级页面）时删掉。
//
// 放在页脚左侧、半透明，不抢主视图的注意力。

import { DATA_STATUS } from '../hooks/useHotData'

const OPTIONS = [
  { key: DATA_STATUS.LOADING, label: '加载中', dot: 'bg-slate-400' },
  { key: DATA_STATUS.SUCCESS, label: '成功',   dot: 'bg-emerald-400' },
  { key: DATA_STATUS.EMPTY,   label: '空',     dot: 'bg-amber-400' },
  { key: DATA_STATUS.ERROR,   label: '错误',   dot: 'bg-red-400' },
]

export default function DevStateSwitcher({ current, onChange }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-950/90 px-3 py-1.5 shadow-lg shadow-black/40 backdrop-blur-md">
        <span className="mr-1 select-none text-[10px] uppercase tracking-wider text-slate-500">
          开发态演示
        </span>
        {OPTIONS.map((o) => {
          const active = current === o.key
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              title={`切到「${o.label}」状态`}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition ${
                active
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${o.dot} ${active ? '' : 'opacity-50'}`} />
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}