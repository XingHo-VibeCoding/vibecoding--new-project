// Day 13｜V3 我的收藏（PRD V3）：已收藏条目列表，按收藏时间倒序
// Day 20：favorites 已是 HotItem[]（来自云函数 /api/favorite），不再用 items 拼接
// 头插法天然倒序，无需额外排序
import HotItem from './HotItem'
import { DATA_STATUS } from '../hooks/useHotData'

export default function FavoritesPage({ status, favorites = [], onToggleFavorite, now }) {
  // 收藏列表：favorites 本身就是头插法排列，新收藏在前
  const favItems = favorites

  return (
    <section className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">我的收藏</h2>
        <p className="mt-2 text-sm text-slate-400">
          {favItems.length > 0
            ? `共 ${favItems.length} 条，按收藏时间倒序。保存在云端，跨设备同步。`
            : '收藏保存在云端，跨设备同步。'}
        </p>
      </div>

      {/* 加载中：云端数据没到之前不能直接判空 */}
      {status === DATA_STATUS.LOADING && favorites.length === 0 && (
        <div
          role="status"
          aria-busy="true"
          aria-label="收藏列表加载中"
          className="space-y-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-1">
              <div className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-slate-800/70" />
              <div className="flex-1 space-y-2">
                <div
                  className="h-3.5 animate-pulse rounded bg-slate-800/70"
                  style={{ width: `${70 + (i % 3) * 8}%` }}
                />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-800/45" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空态：一条收藏都没有，给出下一步动作 */}
      {status !== DATA_STATUS.LOADING && favItems.length === 0 && (
        <div
          role="status"
          className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-8 py-16 text-center"
        >
          <p className="text-4xl" aria-hidden="true">
            ☆
          </p>
          <h3 className="mt-3 text-lg font-semibold text-slate-300">还没有收藏</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            回首页，点任意一条热搜右边的 ☆ 就会出现在这里。
          </p>
          <a
            href="#/"
            className="mt-6 inline-block rounded-lg border border-slate-600 bg-slate-800/50 px-5 py-2 text-sm text-slate-200 transition hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            去首页逛逛 →
          </a>
        </div>
      )}

      {/* 成功态：复用 HotItem（点击进详情 / 星号取消收藏） */}
      {favItems.length > 0 && (
        <ol className="divide-y divide-slate-800/40 rounded-xl border border-slate-800/80 bg-slate-900/40 px-2 py-2 backdrop-blur-sm">
          {favItems.map((item) => (
            <li key={item.id}>
              <HotItem
                item={item}
                now={now}
                isFavorited
                onToggleFavorite={onToggleFavorite}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
