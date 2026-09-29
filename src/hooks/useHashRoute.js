// Day 13｜hash 路由：把「地址栏 hash → 当前视图」收进一个 hook
// 选 hash 而不是 history 路由 / react-router 的原因：
//   1. Day 15 要部署到静态托管——hash 路由刷新 #/detail/xx 不会 404，
//      history 路由需要服务端配 rewrite，静态托管做不到
//   2. 只有 3 个视图，30 行够了，不为此引入一个路由库
//   3. 浏览器前进 / 后退 / 分享链接，hash 路由全部天然可用
import { useEffect, useState } from 'react'

// 解析 hash → 视图描述
//   #/                → { view: 'home' }
//   #/detail/weibo-1  → { view: 'detail', id: 'weibo-1' }
//   #/favorites       → { view: 'favorites' }
//   其它任何值        → 一律回首页（宁可降级到可用页面，不白屏）
function parse(hash) {
  const path = (hash || '').replace(/^#/, '')
  if (path === '/favorites') return { view: 'favorites' }
  const m = path.match(/^\/detail\/([^/]+)$/)
  if (m) return { view: 'detail', id: decodeURIComponent(m[1]) }
  return { view: 'home' }
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo(0, 0) // 切视图回到顶部，别停在上一页的滚动位置
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

// 各视图的地址（组件里跳转统一从这里拿，不手拼字符串）
export const ROUTES = {
  home: '#/',
  favorites: '#/favorites',
  detail: (id) => `#/detail/${encodeURIComponent(id)}`,
}
