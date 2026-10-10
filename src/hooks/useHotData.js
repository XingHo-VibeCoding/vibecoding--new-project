// Day 20｜数据状态机：fetch 真实接口 /api/hot，状态机四态保持不变
// Day 23｜错误分类：catch 时多存一份 errorKind（NETWORK/TIMEOUT/SERVER/API）
//
// 为什么要重写：Day 8 的 setTimeout + generateMockData 让页面只能显示假数据。
// 现在换成真实 fetch，useEffect 的"加载中 → 成功/空/错误"流程和原来完全一致，
// 调用方代码（App.jsx）不需要改任何东西 —— 这就是当初把状态机抽出来的回报。
//
// 缓存策略：app 启动拉一次全平台数据；activePlatforms 切换**不重新拉**，
// 由 App.jsx 在前端用 useMemo 筛选（详情页 / 收藏页要全量，全拉一次最省事）。

import { useCallback, useEffect, useState } from 'react'
import { getHotItems, errorKind } from '../lib/api'

export const DATA_STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  EMPTY: 'empty',
  ERROR: 'error',
}

export function useHotData() {
  const [status, setStatus] = useState(DATA_STATUS.LOADING)
  const [items, setItems] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  // Day 23：错误分类（NETWORK / TIMEOUT / SERVER / API），ErrorState 按它换文案
  const [errorKindState, setErrorKind] = useState('')
  // 真实抓取时间（来自后端 lastFetched），用于 BrandHeader「数据更新于」
  const [updatedAt, setUpdatedAt] = useState(null)
  // 重试用
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus(DATA_STATUS.LOADING)
    setErrorMsg('')
    setErrorKind('')

    getHotItems()
      .then(({ items, updatedAt }) => {
        if (cancelled) return
        setItems(items)
        setUpdatedAt(updatedAt)
        setStatus(items.length === 0 ? DATA_STATUS.EMPTY : DATA_STATUS.SUCCESS)
      })
      .catch((err) => {
        if (cancelled) return
        setItems([])
        setErrorMsg(err instanceof Error ? err.message : String(err))
        setErrorKind(errorKind(err))
        setStatus(DATA_STATUS.ERROR)
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setAttempt((n) => n + 1)
  }, [])

  return {
    status,
    items,
    errorMsg,
    errorKind: errorKindState, // Day 23：给 ErrorState 分文案
    updatedAt, // 成功态才非空，给 BrandHeader 显示
    retry,
  }
}
