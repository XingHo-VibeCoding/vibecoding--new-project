// Day 8｜状态三：空（请求成功，但一条数据都没有）
// 空态是最容易被漏掉的一种：开发时数据总是满的，上线后某天接口返回 []，页面就白了
export default function EmptyState({
  title = '这个组合下没有热搜',
  desc = '数据源返回了 0 条结果，不是出错，是此刻真的没有内容。',
  hint = '换个平台或标签试试，或者点下面刷新一次。',
  onRetry,
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-8 py-16 text-center"
    >
      {/* 空盒子图标 */}
      <svg
        viewBox="0 0 24 24"
        className="mx-auto h-12 w-12 text-slate-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" />
        <path d="M3 8.5 12 13l9-4.5" />
        <path d="M12 13v7" opacity="0.5" />
      </svg>

      <h3 className="mt-4 text-lg font-semibold text-slate-300">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{desc}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-xs text-slate-600">{hint}</p>}

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-lg border border-slate-600 bg-slate-800/50 px-5 py-2 text-sm text-slate-200 transition hover:border-orange-500/60 hover:bg-orange-500/10 hover:text-orange-300"
        >
          刷新试试
        </button>
      )}
    </div>
  )
}