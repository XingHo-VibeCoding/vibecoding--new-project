// App 主组件
// Day 7 第 3 步：F1 三列布局 + 接 mock 数据
// Day 8：接数据状态机，补齐「加载中 / 成功 / 空 / 错误」四种页面状态
import { useMemo, useState } from 'react'
import BrandHeader from './components/BrandHeader'
import PlatformColumn from './components/PlatformColumn'
import LoadingState from './components/LoadingState'
import EmptyState from './components/EmptyState'
import ErrorState from './components/ErrorState'
import DevStateSwitcher from './components/DevStateSwitcher'
import { PLATFORMS } from './lib/mockData'
import { useHotData, DATA_STATUS } from './hooks/useHotData'

// 默认展示前 3 个平台：微博 / 知乎 / 抖音（PRD F2）
const DEFAULT_PLATFORMS = ['weibo', 'zhihu', 'douyin']

export default function App() {
  // 数据与状态：loading / success / empty / error 由 hook 统一管理
  // Day 17 把 hook 内部的 setTimeout 换成真实 fetch，这里的代码不用动
  const { status, items, errorMsg, anchor, retry, devSetStatus } = useHotData()

  // F2 平台选择暂存默认值（平台切换 UI 是第 12–13 天的活）
  const [activePlatforms] = useState(DEFAULT_PLATFORMS)

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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-100">今天，全网在聊什么？</h2>
          <p className="mt-2 text-sm text-slate-500">
            3 个平台的热搜并排展示，每个分类用不同颜色标记。
          </p>
        </div>

        {/* ===== 四种页面状态：同一块位置，四种样子 ===== */}

        {status === DATA_STATUS.LOADING && <LoadingState platformIds={activePlatforms} />}

        {status === DATA_STATUS.SUCCESS && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
          <p className="text-xs uppercase tracking-wider text-slate-500">后续步骤待办</p>
          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-400 sm:grid-cols-2">
            <li><span className="text-orange-400">Day 9</span> · 用设计规则统一页面风格</li>
            <li><span className="text-orange-400">Day 12</span> · F3 关键字 / 标签筛选（Skill）</li>
            <li><span className="text-orange-400">Day 13</span> · F4 详情页 + 四种状态正式化</li>
            <li><span className="text-slate-500">Day 17</span> · 接真实 API 替换 mock 数据</li>
          </ul>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-600">
        热浪 TREND WAVE · 28 天 Vibe Coding 计划 · Day 8 四种页面状态已接入
      </footer>

      {/* 开发态四状态切换器（演示用，Day 13 后删） */}
      <DevStateSwitcher current={status} onChange={devSetStatus} />
    </div>
  )
}