// Day 8｜状态四：错误（没拿到数据）
// 错误态的三条底线（PRD 八、验收标准）：
//   1. 不许白屏 —— 必须有一块东西告诉用户出事了
//   2. 不许裸报错 —— 错误码要包在「人话说明 + 下一步动作」里
//   3. 必须能重试 —— 用户自己有一个自救按钮
export default function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/5 px-8 py-16 text-center"
    >
      {/* 警示图标 */}
      <svg
        viewBox="0 0 24 24"
        className="mx-auto h-12 w-12 text-red-400/80"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3.5 21 19H3z" />
        <path d="M12 9.5v4.5" />
        <circle cx="12" cy="16.8" r="0.6" fill="currentColor" stroke="none" />
      </svg>

      <h3 className="mt-4 text-lg font-semibold text-red-300">热搜数据没能加载出来</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        这不是你的问题，是数据源那边没回应。页面没有白屏，你可以再试一次。
      </p>

      {message && (
        <p className="mx-auto mt-3 max-w-lg overflow-x-auto rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-left font-mono text-xs text-slate-500">
          {message}
        </p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-2 text-sm text-red-200 transition hover:border-red-400 hover:bg-red-500/20"
        >
          ↻ 重试
        </button>
      )}
    </div>
  )
}