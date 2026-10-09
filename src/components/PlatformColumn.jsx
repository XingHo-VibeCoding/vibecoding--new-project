// 单平台榜单列（Day 7 第 3 步 F1：TOP 10 + 展开剩余 40 条）
// Day 12：适配 F3 筛选——筛选生效时直接显示全部匹配（搜索场景下折叠反而碍事）；
//         无匹配时列内给出提示而不是渲染空列表（用户需要知道"是没匹配"而不是"页面坏了"）
import { useState } from 'react'
import HotItem from './HotItem'

const VISIBLE_COUNT = 10

export default function PlatformColumn({
  platform,
  items,
  now,
  favorites = [],
  onToggleFavorite,
  isFiltering = false,
}) {
  const [expanded, setExpanded] = useState(false)
  // 筛选生效 = 相当于自动展开：全部匹配直接可见
  const showAll = expanded || isFiltering
  const visible = showAll ? items : items.slice(0, VISIBLE_COUNT)
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
          {/* Day 21：空列的列头原先会算出「TOP 1–10 / 0」和「-10 条待展开」（负数是 0-10 得来的），
              看着像算错了。无数据时直接说「暂无数据」。 */}
          <p className="text-xs text-slate-400">
            {items.length === 0
              ? '暂无数据'
              : `TOP ${showAll ? `1–${items.length}` : `1–${VISIBLE_COUNT}`} / ${items.length}`}
          </p>
          {items.length > 0 && (
            <p className="mt-0.5 text-xs text-orange-400/80">
              {showAll ? (isFiltering ? `筛选出 ${items.length} 条` : '已展开全部') : `${hiddenCount} 条待展开`}
            </p>
          )}
        </div>
      </header>

      {/* 榜单列表：空列分三种情况说明（Day 21 拆开——原先一律说「没有匹配筛选条件」，
          但用户在没开筛选时看到这句，会以为是自己的筛选把内容筛没了） */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          {platform.ready === false ? (
            <>
              <p className="text-sm text-slate-300">{platform.name}的数据源正在筹备中</p>
              <p className="mt-1 text-xs text-slate-400">
                {platform.pending}，暂未接入真实榜单内容
              </p>
            </>
          ) : isFiltering ? (
            <>
              <p className="text-sm text-slate-400">
                {platform.name}没有匹配当前筛选条件的热搜
              </p>
              <p className="mt-1 text-xs text-slate-400">清空筛选即可恢复全部 {platform.name}内容</p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400">{platform.name}今天暂时没有榜单数据</p>
              <p className="mt-1 text-xs text-slate-400">同步任务会定期重新拉取，稍后再来看看</p>
            </>
          )}
        </div>
      ) : (
        <ol className="flex-1 divide-y divide-slate-800/40 px-2 py-2">
          {visible.map((item) => (
            <li key={item.id}>
              <HotItem
                item={item}
                now={now}
                isFavorited={favorites.includes(item.id)}
                onToggleFavorite={onToggleFavorite}
              />
            </li>
          ))}
        </ol>
      )}

      {/* 展开 / 收起（筛选态不显示——筛选本来就是全部显示）
          Day 14 最小修复：原先展开 50 条后没有任何收起入口，列一直占满整屏。
          收起用中性色 hover（橙留给「展开」这个主动作），键盘焦点两颗都保留。 */}
      {!isFiltering && hiddenCount > 0 && (
        <div className="border-t border-slate-800/60 p-3">
          {expanded ? (
            <button
              onClick={() => setExpanded(false)}
              className="w-full rounded-lg border border-slate-700/80 bg-slate-800/30 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-500/80 hover:bg-slate-700/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
            >
              ↑ 收起，只看 TOP {VISIBLE_COUNT}
            </button>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="w-full rounded-lg border border-slate-700/80 bg-slate-800/30 px-4 py-2.5 text-sm text-slate-300 transition hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
            >
              展开剩余 {hiddenCount} 条 →
            </button>
          )}
        </div>
      )}
    </section>
  )
}