// Day 8｜数据状态机：把「加载中 / 成功 / 空 / 错误」四种页面状态收进一个 hook
//
// 为什么要有它：Day 7 的页面只会「有数据」这一种情况。真实产品里页面有四种样子，
// 而最容易被漏掉的恰恰不是成功态（成功态是默认能看到的），是另外三种。
// 这里把状态和取数绑在一起，UI 只负责按 status 挑一个样子渲染。
//
// Day 17 会把 setTimeout 换成真实的 fetch 调用，status 逻辑一行都不用改。

import { useCallback, useEffect, useMemo, useState } from 'react'
import { generateMockData } from '../lib/mockData'

// 模拟数据加载耗时（Day 17 换成真实接口后删掉）
const MOCK_LOAD_DELAY = 600

export const DATA_STATUS = {
  LOADING: 'loading', // 数据还在路上
  SUCCESS: 'success', // 拿到了，有内容
  EMPTY: 'empty',     // 拿到了，但是空的
  ERROR: 'error',     // 没拿到，出错了
}

export function useHotData() {
  const [status, setStatus] = useState(DATA_STATUS.LOADING)
  const [items, setItems] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  // 时间锚点：决定「X 分钟前」的基准时刻
  const [anchor, setAnchor] = useState(() => Date.now())
  // 第几次尝试（用于「重试」时强制重新跑一遍加载流程）
  const [attempt, setAttempt] = useState(0)
  // 开发态演示：手动锁定某个状态（null = 走真实加载流程）
  // Day 13 做完正式状态处理、删掉 DevStateSwitcher 时一并移除
  const [override, setOverride] = useState(null)

  useEffect(() => {
    if (override) return // 被手动锁定了，不跑真实流程
    let cancelled = false
    setStatus(DATA_STATUS.LOADING)
    setErrorMsg('')

    const timer = setTimeout(() => {
      if (cancelled) return
      try {
        const data = generateMockData(anchor)
        if (!data || data.length === 0) {
          setItems([])
          setStatus(DATA_STATUS.EMPTY)
        } else {
          setItems(data)
          setStatus(DATA_STATUS.SUCCESS)
        }
      } catch (e) {
        setItems([])
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setStatus(DATA_STATUS.ERROR)
      }
    }, MOCK_LOAD_DELAY)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [anchor, attempt, override])

  // 「重试」：解锁状态 + 刷新时间锚点 + 加一次尝试
  const retry = useCallback(() => {
    setOverride(null)
    setAnchor(Date.now())
    setAttempt((n) => n + 1)
  }, [])

  // 开发态状态切换（仅供演示，Day 13 后随 DevStateSwitcher 一起删除）
  const devSetStatus = useCallback((next) => {
    if (next === DATA_STATUS.SUCCESS) {
      setOverride(null) // 回到真实流程
      setAnchor(Date.now())
      setAttempt((n) => n + 1)
      return
    }
    setOverride(next)
    if (next === DATA_STATUS.ERROR) {
      setErrorMsg('模拟演示：无法连接到数据源（network error）')
    }
    if (next === DATA_STATUS.EMPTY) {
      setItems([])
    }
  }, [])

  const effectiveStatus = override ?? status

  // 空态强制返回空数组，其余情况沿用已加载的数据
  const effectiveItems = useMemo(
    () => (effectiveStatus === DATA_STATUS.EMPTY ? [] : items),
    [effectiveStatus, items],
  )

  return {
    status: effectiveStatus,
    items: effectiveItems,
    errorMsg,
    anchor,
    retry,
    devSetStatus,
    isDevOverride: override !== null,
  }
}