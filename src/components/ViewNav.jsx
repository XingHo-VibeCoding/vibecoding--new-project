// Day 13｜视图导航：首页 / 我的收藏
// 用 <a href="#/..."> 做导航——hash 路由下原生锚点就是切换视图，浏览器后退键天然可用
const LINKS = [
  { href: '#/', view: 'home', label: '首页' },
  { href: '#/favorites', view: 'favorites', label: '我的收藏' },
]

export default function ViewNav({ current }) {
  return (
    <nav aria-label="页面导航" className="mb-6 flex flex-wrap items-center gap-2">
      {LINKS.map((l) => {
        // 详情页从首页进，也归在「首页」导航项下（面包屑的简化版）
        const active = current === l.view || (l.view === 'home' && current === 'detail')
        return (
          <a
            key={l.view}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
              active
                ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                : 'border-transparent bg-slate-900/40 text-slate-400 hover:border-slate-500/80 hover:text-slate-200'
            }`}
          >
            {l.label}
          </a>
        )
      })}
    </nav>
  )
}
