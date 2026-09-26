// App 主组件
// Day 7 第 3 步：F1 三列布局 + 接 mock 数据
// Day 8：接数据状态机，补齐「加载中 / 成功 / 空 / 错误」四种页面状态
// Day 10：修复三列互相拉伸的问题（items-start）+ 新增平台选择栏（PRD F2 提前）
import { useEffect, useMemo, useState } from 'react'
import BrandHeader from './components/BrandHeader'
import PlatformColumn from './components/PlatformColumn'
import PlatformSelector from './components/PlatformSelector'
import LoadingState from './components/LoadingState'
import EmptyState from './components/EmptyState'
import ErrorState from './components/ErrorState'
import DevStateSwitcher from './components/DevStateSwitcher'
import { PLATFORMS } from './lib/mockData'
import { useHotData, DATA_STATUS } from './hooks/useHotData'

// 默认展示前 3 个平台：微博 / 知乎 / 抖音（PRD F2）
const DEFAULT_PLATFORMS = ['weibo', 'zhihu', 'douyin']
// 平台选择上限（对应 F1 三列布局）
const MAX_PLATFORMS = 3
// localStorage 记忆键：Day 19 登录后改成同步到数据库
const PLATFORM_STORAGE_KEY = 'trendwave:platforms'

// 读 localStorage 里记住的平台选择；没有 / 数据损坏 / 出现未知 id 时回退默认值
function loadActivePlatforms() {
  try {
    const raw = localStorage.getItem(PLATFORM_STORAGE_KEY)
    if (raw) {
      const ids = JSON.parse(raw)
      if (Array.isArray(ids) && ids.length >= 1) {
        const valid = ids.filter((id) => PLATFORMS.some((p) => p.id === id))
        if (valid.length >= 1) return valid.slice(0, MAX_PLATFORMS)
      }
    }
  } catch {
    /* localStorage 被禁用或 JSON 解析失败 → 用默认值 */
  }
  return DEFAULT_PLATFORMS
}

export default function App() {
  // 数据与状态：loading / success / empty / error 由 hook 统一管理
  // Day 17 把 hook 内部的 setTimeout 换成真实 fetch，这里的代码不用动
  const { status, items, errorMsg, anchor, retry, devSetStatus } = useHotData()

  // F2 平台选择：初始值从 localStorage 读（Day 10 上线）
  const [activePlatforms, setActivePlatforms] = useState(loadActivePlatforms)

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
      return { total: 0, platformCount: PLATFORMS.length, topHeat: 0, topTitle: '' }
    }
    const top = items.reduce((m, i) => (i.heat > m.heat ? i : m), items[0])
    return {
      total: items.length,
      platformCount: PLATFORMS.length,
      topHeat: top.heat,
      topTitle: top.title,
    }
  }, [items])

  const activePlatformObjs = activePlatforms.map((id) => PLATFORMS.find((p) => p.id === id))

  return (
    <div className="min-h-screen pb-20">
      <BrandHeader
        stats={stats}
        status={status}
        updatedAt={status === DATA_STATUS.SUCCESS ? anchor : null}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 大标题：四种状态下都在，让页面永远有一句"这是什么" */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">今天，全网在聊什么？</h2>
          <p className="mt-2 text-sm text-slate-400">
            {PLATFORMS.length} 个平台的热搜聚合，下面自选 {MAX_PLATFORMS} 个并排展示，每个分类用不同颜色标记。
          </p>
        </div>

        {/* F2 平台选择栏：任意状态下都可以换平台 */}
        <PlatformSelector active={activePlatforms} onToggle={togglePlatform} max={MAX_PLATFORMS} />

        {/* ===== 四种页面状态：同一块位置，四种样子 ===== */}

        {status === DATA_STATUS.LOADING && <LoadingState platformIds={activePlatforms} />}

        {status === DATA_STATUS.SUCCESS && (
          /* items-start：三列各自按内容高度排布，互不拉伸。
             Day 10 修复——原先默认 stretch 会让「一列展开」把另外两列拉到同高，
             配合列内 flex-1，另外两列的「展开剩余」按钮被顶到卡片最底部。 */
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            {activePlatformObjs.map((platform) => (
              <PlatformColumn
                key={platform.id}
                platform={platform}
                items={items.filter((i) => i.platform === platform.id)}
                now={anchor}
              />
            ))}
          </div>
        )}

        {status === DATA_STATUS.EMPTY && <EmptyState onRetry={retry} />}

        {status === DATA_STATUS.ERROR && <ErrorState message={errorMsg} onRetry={retry} />}

        {/* 后续步骤待办 */}
        <div className="mt-10 rounded-xl border border-dashed border-slate-700/80 bg-slate-900/20 p-5">
          <p className="text-xs font-medium text-slate-400">后续步骤待办</p>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-400 sm:grid-cols-2">
            <li><span className="text-emerald-400">Day 10 已完成</span> · F2 平台选择栏（提前上线）</li>
            <li><span className="text-orange-400">Day 12</span> · F3 关键字 / 标签筛选（Skill）</li>
            <li><span className="text-orange-400">Day 13</span> · F4 详情页 + 四种状态正式化</li>
            <li><span className="text-slate-400">Day 17</span> · 接真实 API 替换 mock 数据</li>
          </ul>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
        热浪 TREND WAVE · 28 天 Vibe Coding 计划 · Day 10 平台选择与三列布局修复
      </footer>

      {/* 开发态四状态切换器（演示用，Day 13 后删） */}
      <DevStateSwitcher current={status} onChange={devSetStatus} />
    </div>
  )
}