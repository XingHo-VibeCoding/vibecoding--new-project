// Day 13｜V2 详情页（PRD F4）：单条热搜完整信息 + 原文链接 + 返回列表
// 四种状态一个不少：
//   loading → 骨架屏（数据没到之前不能渲染字段）
//   success → 完整字段（标题/平台/排名/热度/发布时间/状态标签/分类/原文链接）
//   empty   → URL 里的 id 在数据里找不到（手输 #/detail/weibo-99 之类）
//   error   → 数据源出错，复用列表页的错误组件
import { PLATFORMS, CATEGORY_MAP, formatHeat, formatRelative } from '../lib/mockData'
import { DATA_STATUS } from '../hooks/useHotData'
import ErrorState from './ErrorState'

// 状态标签（爆/沸/新）：PRD F4 要求显示，但不加新数据——
// 按已有字段推导：排名前 3 = 爆；热度 ≥ 900 万 = 沸；发布不到 30 分钟 = 新
function getStatusTags(item, now) {
  const tags = []
  if (item.rank <= 3) {
    tags.push({ label: '爆', cls: 'border-red-500/50 bg-red-500/15 text-red-300' })
  }
  if (item.heat >= 9_000_000) {
    tags.push({ label: '沸', cls: 'border-orange-500/50 bg-orange-500/15 text-orange-300' })
  }
  if (now - item.publishedAt < 30 * 60 * 1000) {
    tags.push({ label: '新', cls: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' })
  }
  return tags
}

// 信息格子：标签 + 值，详情页四要素复用
function InfoCell({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-800/25 px-3 py-2.5">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-100">{value}</dd>
    </div>
  )
}

export default function DetailPage({
  id,
  status,
  items,
  errorMsg,
  anchor,
  favorites = [],
  onToggleFavorite,
  retry,
}) {
  // 状态一：加载中（骨架屏，形状模仿详情卡：徽章行 + 标题 + 信息格子）
  if (status === DATA_STATUS.LOADING) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="详情加载中"
        className="mx-auto max-w-2xl rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-sm sm:p-8"
      >
        <div className="h-6 w-28 animate-pulse rounded-full bg-slate-800/70" />
        <div className="mt-5 h-8 w-3/4 animate-pulse rounded bg-slate-800/70" />
        <div className="mt-3 h-4 w-2/5 animate-pulse rounded bg-slate-800/45" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-800/45" />
          ))}
        </div>
        <div className="mt-8 h-11 w-full animate-pulse rounded-lg bg-slate-800/45" />
      </div>
    )
  }

  // 状态四：错误（数据源挂了，重试是正确下一步）
  if (status === DATA_STATUS.ERROR) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState message={errorMsg || '数据源暂时不可用'} onRetry={retry} />
      </div>
    )
  }

  const item = items.find((i) => i.id === id)

  // 状态三：空（数据是好的，但这条 id 不存在——已下榜或输错了）
  if (!item) {
    return (
      <div
        role="status"
        className="mx-auto max-w-2xl rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-8 py-16 text-center"
      >
        <h2 className="text-lg font-semibold text-slate-300">没有找到这条热搜</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          地址里的编号「{id}」不在当前数据里——它可能已经下榜，也可能是地址输错了。
        </p>
        <a
          href="#/"
          className="mt-6 inline-block rounded-lg border border-slate-600 bg-slate-800/50 px-5 py-2 text-sm text-slate-200 transition hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
        >
          ← 返回首页
        </a>
      </div>
    )
  }

  // 状态二：成功（完整字段）
  const platform = PLATFORMS.find((p) => p.id === item.platform)
  const cat = CATEGORY_MAP[item.category]
  const isFavorited = favorites.includes(item.id)
  const statusTags = getStatusTags(item, anchor)

  return (
    <article className="mx-auto max-w-2xl">
      {/* 返回入口（PRD V2 要求：有「返回列表」） */}
      <a
        href="#/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
      >
        ← 返回列表
      </a>

      <section className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-sm sm:p-8">
        {/* 徽章行：平台 + 状态标签（爆/沸/新）+ 分类 */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-slate-200"
            style={{ borderColor: `${platform.color}66`, backgroundColor: `${platform.color}1f` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: platform.color }} />
            {platform.name}
          </span>
          {statusTags.map((t) => (
            <span
              key={t.label}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${t.cls}`}
            >
              {t.label}
            </span>
          ))}
          <span className={`rounded-md border px-2 py-0.5 text-xs ${cat.bg} ${cat.text} ${cat.border}`}>
            {cat.name}
          </span>
        </div>

        {/* 完整标题（列表页是 line-clamp-2，这里一字不省） */}
        <h2 className="mt-4 text-xl font-bold leading-relaxed text-slate-100 sm:text-2xl">
          {item.title}
        </h2>

        {/* 信息四要素 */}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCell label="当前排名" value={`第 ${item.rank} 名`} />
          <InfoCell label="热度值" value={formatHeat(item.heat)} />
          <InfoCell label="发布时间" value={formatRelative(item.publishedAt, anchor)} />
          <InfoCell label="来源平台" value={platform.name} />
        </dl>

        {/* 动作区：收藏（与列表页同一套状态）+ 查看原文 */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleFavorite?.(item.id)}
            aria-pressed={isFavorited}
            aria-label={isFavorited ? `取消收藏：${item.title}` : `收藏：${item.title}`}
            title={isFavorited ? '取消收藏' : '收藏'}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
              isFavorited
                ? 'animate-pop border-orange-500/60 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
                : 'border-slate-600/80 bg-slate-800/30 text-slate-300 hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-300'
            }`}
          >
            <span className="text-base leading-none">{isFavorited ? '★' : '☆'}</span>
            {isFavorited ? '已收藏' : '收藏'}
          </button>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/80 bg-slate-800/30 px-4 py-2.5 text-sm text-slate-200 transition hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            查看原文 ↗
          </a>
        </div>
      </section>
    </article>
  )
}
