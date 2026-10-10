// App 主组件
// Day 7 第 3 步：F1 三列布局 + 接 mock 数据
// Day 8：接数据状态机，补齐「加载中 / 成功 / 空 / 错误」四种页面状态
// Day 10：修复三列互相拉伸的问题（items-start）+ 新增平台选择栏（PRD F2 提前）
// Day 13：hash 路由分发三个视图（V1 首页 / V2 详情 / V3 我的收藏）
// Day 20：mock → 真接口；收藏 localStorage → localStorage + 云函数双写
import { useCallback, useEffect, useMemo, useState } from 'react'
import BrandHeader from './components/BrandHeader'
import PlatformColumn from './components/PlatformColumn'
import PlatformSelector from './components/PlatformSelector'
import FilterBar from './components/FilterBar'
import DetailPage from './components/DetailPage'
import FavoritesPage from './components/FavoritesPage'
import ViewNav from './components/ViewNav'
import LoadingState from './components/LoadingState'
import EmptyState from './components/EmptyState'
import ErrorState from './components/ErrorState'
import { PLATFORMS, READY_PLATFORMS } from './lib/mockData'
import { useHotData, DATA_STATUS } from './hooks/useHotData'
import { useHashRoute } from './hooks/useHashRoute'
import { getFavorites, addFavorite, removeFavorite, getUserKey } from './lib/api'

// 默认展示前 3 个平台：微博 / 抖音 / B站（PRD F2）
// Day 21：原默认值是 ['weibo','zhihu','douyin']，但知乎的数据源需要登录态、暂未接入，
// 新用户一进首页就会看到一个空列。默认值改为三个有真实数据的平台。
const DEFAULT_PLATFORMS = ['weibo', 'douyin', 'bilibili']
// 平台选择上限（对应 F1 三列布局）
const MAX_PLATFORMS = 3
// localStorage 记忆键：收藏由云函数 + userKey 持有，本地不再存
const PLATFORM_STORAGE_KEY = 'trendwave:platforms'

// 读 localStorage 里记住的平台选择；没有 / 数据损坏 / 出现未知 id 时回退默认值
function loadActivePlatforms() {
  try {
    const raw = localStorage.getItem(PLATFORM_STORAGE_KEY)
    if (raw) {
      const ids = JSON.parse(raw)
      if (Array.isArray(ids) && ids.length >= 1) {
        const valid = ids.filter((id) => PLATFORMS.some((p) => p.id === id))
        // Day 21：存下来的选择里如果一个「已接入数据源」的平台都没有
        // （比如早先选了知乎 + 小红书 + 待接入平台），首屏三列会全空 → 回退默认值。
        // 用户仍可在平台选择栏手动选回来，只是不会一进来就撞上全空页面。
        const hasReady = valid.some((id) => PLATFORMS.find((p) => p.id === id).ready)
        if (valid.length >= 1 && hasReady) return valid.slice(0, MAX_PLATFORMS)
      }
    }
  } catch {
    /* localStorage 被禁用或 JSON 解析失败 → 用默认值 */
  }
  return DEFAULT_PLATFORMS
}

export default function App() {
  // 路由（Day 13）：#hash → 当前视图，切视图时自动回顶部
  const route = useHashRoute()

  // 数据与状态：loading / success / empty / error 由 hook 统一管理
  // Day 20：mock → fetch /api/hot，useEffect 一行不用改
  // Day 23：多取一份 errorKind（NETWORK / TIMEOUT / SERVER / API），ErrorState 分文案
  const { status, items, errorMsg, errorKind, updatedAt, retry } = useHotData()

  // F2 平台选择：初始值从 localStorage 读（Day 10 上线）
  const [activePlatforms, setActivePlatforms] = useState(loadActivePlatforms)

  // F5 收藏（Day 20）：已收藏的 item 完整对象列表（来自云函数），不仅存 id
  //   首次进入：从云函数拉（userKey 来自 src/lib/userKey.js，浏览器内稳定）
  //   写操作：toggleFavorite 走云函数 + 本地同步
  const [favorites, setFavorites] = useState([]) // HotItem[]
  const [toast, setToast] = useState(null) // { type: 'saved' | 'removed' | 'error', text }

  // F3 筛选（Day 12 上线）：关键词 + 分类多选，临时状态不进 localStorage
  const [keyword, setKeyword] = useState('')
  const [activeCategories, setActiveCategories] = useState([])

  // 提示条 2.5 秒后自动消失（toast 变化才重新计时）
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  // 首次进入：从云函数拉一次真收藏（页内所有展示都走这份本地 state）
  // Day 23：拉取失败不再静默当「无收藏」——那是误导（拿不到 ≠ 没有），
  // 标记 favoritesLoadFailed，收藏页顶部给一条可感知的降级提示；不打断首页。
  const [favoritesLoadFailed, setFavoritesLoadFailed] = useState(false)
  useEffect(() => {
    const userKey = getUserKey()
    getFavorites(userKey)
      .then(({ items }) => {
        setFavorites(items)
        setFavoritesLoadFailed(false)
      })
      .catch(() => {
        // 首页继续可用；收藏页会显示「云端收藏暂时没拉到」而不是「还没有收藏」
        setFavorites([])
        setFavoritesLoadFailed(true)
      })
  }, [])

  // 收藏 / 取消收藏：
  //   1. 先调云函数（失败就不动本地 state，避免乐观更新后回滚难处理）
  //   2. 成功才动本地 state
  //   Day 22：取消收藏调 DELETE /api/favorite，后端幂等（未收藏返 0 行仍 200）
  const toggleFavorite = useCallback(async (id) => {
    const userKey = getUserKey()
    const isFav = favorites.some((it) => it.id === id)
    if (isFav) {
      // 取消收藏：先打 DELETE；失败时本地 state 保持不变
      try {
        await removeFavorite({ userKey, itemId: id })
        setFavorites(favorites.filter((it) => it.id !== id))
        setToast({ type: 'removed', text: '已取消收藏' })
      } catch (err) {
        setToast({ type: 'error', text: '取消失败：' + (err.message || '请稍后重试') })
      }
      return
    }
    // 收藏：先调云函数（成功才动本地 state，避免乐观更新后回滚难处理）
    try {
      await addFavorite({ userKey, itemId: id })
      // 收藏成功：从首页 items 里取出完整条目插到列表头（保持头插法 / 倒序）
      const item = items.find((i) => i.id === id)
      if (item) {
        setFavorites([item, ...favorites])
      } else {
        // 列表里没这条（罕见，比如收藏后立刻从首页平台里切走）—— 再拉一次
        const { items: serverFavs } = await getFavorites(userKey)
        setFavorites(serverFavs)
      }
      setToast({ type: 'saved', text: '已收藏 ★' })
    } catch (err) {
      setToast({ type: 'error', text: '收藏失败：' + (err.message || '请稍后重试') })
    }
  }, [favorites, items])

  // 选择变化时写回 localStorage（放副作用到这里，不在渲染过程里写）
  useEffect(() => {
    try {
      localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(activePlatforms))
    } catch {
      /* 存不进去就算了，本次会话内选择仍然有效 */
    }
  }, [activePlatforms])

  // 选中 / 取消一个平台：
  //   取消 → 至少保留 1 个，最后一个点不动
  //   选中 → 已满 3 个时，把最早选中的挤下去（先进先出）
  function togglePlatform(id) {
    setActivePlatforms((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id].slice(-MAX_PLATFORMS)
    })
  }

  // 顶部指标：只在成功态算真值，其它状态给占位
  const stats = useMemo(() => {
    if (!items.length) {
      return { total: 0, platformCount: READY_PLATFORMS.length, topHeat: 0, topTitle: '' }
    }
    const top = items.reduce((m, i) => (i.heat > m.heat ? i : m), items[0])
    return {
      total: items.length,
      platformCount: READY_PLATFORMS.length,
      topHeat: top.heat,
      topTitle: top.title,
    }
  }, [items])

  const activePlatformObjs = activePlatforms.map((id) => PLATFORMS.find((p) => p.id === id))

  // F3 筛选逻辑：关键词（标题包含，不区分大小写）+ 分类（多选，不选=全部），
  // 两个条件同时存在时取交集（且的关系）。只筛「当前展示的平台」以外的全部条目也一起筛，口径一致。
  const kw = keyword.trim().toLowerCase()
  const hasFilter = kw !== '' || activeCategories.length > 0
  const filteredItems = useMemo(() => {
    if (!hasFilter) return items
    return items.filter(
      (i) =>
        (kw === '' || i.title.toLowerCase().includes(kw)) &&
        (activeCategories.length === 0 || activeCategories.includes(i.category)),
    )
  }, [items, kw, activeCategories, hasFilter])

  // 下游要的是「id 是否被收藏」——派生一份 Set/数组，下游继续用 .includes(id)
  const favoriteIds = useMemo(() => favorites.map((it) => it.id), [favorites])

  function toggleCategory(id) {
    setActiveCategories((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function clearFilter() {
    setKeyword('')
    setActiveCategories([])
  }

  return (
    <div className="min-h-screen pb-20">
      <BrandHeader
        stats={stats}
        status={status}
        updatedAt={status === DATA_STATUS.SUCCESS ? updatedAt : null}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 视图导航（Day 13）：三个视图共享，当前视图高亮 */}
        <ViewNav current={route.view} />

        {/* ===== V1 首页：三列聚合 + 筛选 + 平台选择 ===== */}
        {route.view === 'home' && (
          <>
            {/* 大标题：四种状态下都在，让页面永远有一句"这是什么" */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">今天，全网在聊什么？</h2>
              <p className="mt-2 text-sm text-slate-400">
                聚合微博、抖音、百度、B站四个平台的热搜，每 5 分钟从源头拉一次最新榜单。
              </p>
            </div>

            {/* F2 平台选择栏：任意状态下都可以换平台 */}
            <PlatformSelector active={activePlatforms} onToggle={togglePlatform} max={MAX_PLATFORMS} />

            {/* ===== 四种页面状态：同一块位置，四种样子 ===== */}

            {status === DATA_STATUS.LOADING && <LoadingState platformIds={activePlatforms} />}

            {status === DATA_STATUS.SUCCESS && (
              <>
                {/* F3 筛选栏（Day 12 上线）：只在有数据时出现——没数据时筛选没有意义 */}
                <FilterBar
                  keyword={keyword}
                  onKeywordChange={setKeyword}
                  activeCategories={activeCategories}
                  onToggleCategory={toggleCategory}
                  onClear={clearFilter}
                  matchCount={filteredItems.filter((i) => activePlatforms.includes(i.platform)).length}
                  totalCount={items.filter((i) => activePlatforms.includes(i.platform)).length}
                />

                {/* items-start：三列各自按内容高度排布，互不拉伸。
                   Day 10 修复——原先默认 stretch 会让「一列展开」把另外两列拉到同高，
                   配合列内 flex-1，另外两列的「展开剩余」按钮被顶到卡片最底部。 */}
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                  {activePlatformObjs.map((platform) => (
                    <PlatformColumn
                      key={platform.id}
                      platform={platform}
                      items={filteredItems.filter((i) => i.platform === platform.id)}
                      now={updatedAt}
                      favorites={favoriteIds}
                      onToggleFavorite={toggleFavorite}
                      isFiltering={hasFilter}
                    />
                  ))}
                </div>
              </>
            )}

            {status === DATA_STATUS.EMPTY && <EmptyState onRetry={retry} />}

            {status === DATA_STATUS.ERROR && (
              <ErrorState message={errorMsg} kind={errorKind} onRetry={retry} />
            )}

            {/* 后续步骤待办（Day 20：Day 17 这条已闭环，划掉） */}
            <div className="mt-10 rounded-xl border border-dashed border-slate-700/80 bg-slate-900/20 p-5">
              <p className="text-xs font-medium text-slate-400">后续步骤待办</p>
              <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-400 sm:grid-cols-2">
                <li><span className="text-emerald-400">Day 10 已完成</span> · F2 平台选择栏（提前上线）</li>
                <li><span className="text-emerald-400">Day 11 已完成</span> · F5 收藏交互</li>
                <li><span className="text-emerald-400">Day 12 已完成</span> · F3 关键词 / 分类筛选（frontend-guidelines Skill）</li>
                <li><span className="text-emerald-400">Day 13 已完成</span> · F4 详情页 + 三视图路由（我的收藏上线）</li>
                <li><span className="text-emerald-400">Day 20 已完成</span> · 前端从 mock 切到真接口（/api/hot + /api/favorite）</li>
                <li><span className="text-emerald-400">Day 21 已完成</span> · 补百度数据源 + 平台「筹备中」标注 + 空态三分</li>
                <li><span className="text-emerald-400">Day 22 已完成</span> · DELETE /api/favorite 上线：取消收藏走真接口（幂等），toggleFavorite 同步</li>
                <li><span className="text-emerald-400">Day 23 已完成</span> · 错误处理：请求超时防死锁 + 错误分类文案 + 收藏拉取失败可感知</li>
              </ul>
            </div>
          </>
        )}

        {/* ===== V2 详情页：PRD F4，四种状态由 DetailPage 内部处理 ===== */}
        {route.view === 'detail' && (
          <DetailPage
            id={route.id}
            status={status}
            items={items}
            errorMsg={errorMsg}
            errorKind={errorKind}
            anchor={updatedAt}
            favorites={favoriteIds}
            onToggleFavorite={toggleFavorite}
            retry={retry}
          />
        )}

        {/* ===== V3 我的收藏：PRD V3，favorites 已是 HotItem[] 直接渲染 ===== */}
        {route.view === 'favorites' && (
          <FavoritesPage
            status={status}
            favorites={favorites}
            loadFailed={favoritesLoadFailed}
            onToggleFavorite={toggleFavorite}
            now={updatedAt}
          />
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
        热浪 TREND WAVE · 28 天 Vibe Coding 计划 · Day 23 错误处理与安全边界：超时 + 错误分类
      </footer>

      {/* Day 11：收藏反馈提示条（成功 / 取消 / 失败三态，2.5 秒自动消失） */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`animate-toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-5 py-2 text-sm font-medium shadow-lg backdrop-blur-md ${
            toast.type === 'error'
              ? 'border-red-500/50 bg-red-950/80 text-red-300'
              : toast.type === 'removed'
                ? 'border-slate-600/60 bg-slate-800/85 text-slate-300'
                : 'border-orange-500/50 bg-orange-950/80 text-orange-300'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}