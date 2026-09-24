// 品牌头部 + 全局指标卡（Day 7 第 3 步 F1 建立；Day 8 追加「更新时间 + 状态胶囊」）
import { PLATFORMS, formatHeat, formatClock } from '../lib/mockData'
import { DATA_STATUS } from '../hooks/useHotData'

// 状态胶囊：让用户随时知道页面当前处于哪种状态
const STATUS_PILL = {
  [DATA_STATUS.LOADING]: { text: '数据加载中', cls: 'border-slate-600 bg-slate-700/40 text-slate-300', dot: 'bg-slate-400 animate-pulse' },
  [DATA_STATUS.SUCCESS]: { text: '数据已就绪', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  [DATA_STATUS.EMPTY]:   { text: '暂无数据',   cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300',       dot: 'bg-amber-400' },
  [DATA_STATUS.ERROR]:   { text: '加载失败',   cls: 'border-red-500/40 bg-red-500/10 text-red-300',             dot: 'bg-red-400' },
}

export default function BrandHeader({ stats, status, updatedAt }) {
  const pill = STATUS_PILL[status] || STATUS_PILL[DATA_STATUS.LOADING]

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
      {/* 品牌主区 */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            {/* 波浪图标 */}
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 12 C 6 18, 18 6, 22 12" strokeLinecap="round" />
              <path d="M2 18 C 6 24, 18 12, 22 18" strokeLinecap="round" opacity="0.5" />
            </svg>
            <h1 className="text-2xl font-black tracking-wide text-slate-100">
              热浪 <span className="text-orange-500">TREND WAVE</span>
            </h1>
          </div>
          <span className="hidden text-xs text-slate-400 sm:inline">
            多平台热搜聚合 · 雷达站
          </span>
        </div>
        {/* 登录入口：Day 23 才做（disabled：一眼看得出点不动） */}
        <button
          className="shrink-0 cursor-not-allowed rounded-full border border-slate-700 px-4 py-1.5 text-sm text-slate-400 opacity-60"
          disabled
          title="登录功能 Day 23 上线"
        >
          登录（Day 23）
        </button>
      </div>

      {/* 第二行：更新时间 + 当前状态 */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-6 pb-4 text-xs">
        <span className="text-slate-400">
          数据更新于{' '}
          <span className="font-mono text-slate-300">
            {updatedAt ? formatClock(updatedAt) : '—:—:—'}
          </span>
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${pill.cls}`}
          aria-live="polite"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
          {pill.text}
        </span>
      </div>

      {/* 数据指标行（纵向节奏 20→16→12px 递减，统一 4px 网格） */}
      <div className="mx-auto max-w-7xl px-6 pb-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            label="今日收录"
            value={stats.total > 0 ? `${stats.total} 条` : '—'}
            accent="orange"
            hint={`覆盖 ${stats.platformCount} 个平台`}
          />
          <MetricCard
            label="最高热度"
            value={stats.topHeat > 0 ? formatHeat(stats.topHeat) : '—'}
            accent="red"
            hint={stats.topTitle ? `「${stats.topTitle}」` : '等待数据'}
          />
          <MetricCard
            label="更新节奏"
            value="每 5 分钟"
            accent="blue"
            hint="实时感知全网动态"
          />
        </div>
      </div>

      {/* 进度指示 */}
      <div className="border-t border-slate-800/60 bg-slate-950/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-2 text-xs text-slate-400">
          <span>
            第 2 周 · <span className="text-orange-400">Day 9</span>
            <span className="text-slate-400">／28</span> 　设计规则审查与修复
          </span>
          <span>
            {PLATFORMS.length} 个平台 · 每平台 50 条 · 共 {stats.platformCount * 50} 条
          </span>
        </div>
      </div>
    </header>
  )
}

function MetricCard({ label, value, hint, accent }) {
  const accentMap = {
    orange: 'from-orange-500/15 to-orange-500/0  border-orange-500/30 text-orange-300',
    red:    'from-red-500/15 to-red-500/0       border-red-500/30 text-red-300',
    blue:   'from-blue-500/15 to-blue-500/0     border-blue-500/30 text-blue-300',
  }
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 backdrop-blur-sm ${accentMap[accent]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-slate-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 line-clamp-1">{hint}</p>}
    </div>
  )
}