---
name: frontend-guidelines
description: 本项目的前端页面设计规则，改任何界面前后都按它检查一次：信息层级、颜色对比度、可交互元素三态、中文排版、间距节奏、移动端布局与验证流程
---

# 前端设计规则

> 本 Skill 是项目「热浪 TREND WAVE」已确认的前端规则（Day 9 在 DESIGN_RULES.md 制定，Day 12 固化为 Skill）。
> 用法：**改界面前**过一遍「修改前」清单，**改完后**过一遍「修改后」验证。规则编号 R1–R5 是硬规则，违反即返工。

## 页面层级
- 每个页面只有一个主标题（h1），区块标题用 h2/h3 递进，不跳级
- 区块之间靠间距分组，不靠加边框；不新增装饰性分割线，除非已有设计里有对应物
- 状态与内容分离：加载 / 成功 / 空 / 错误的切换不改变页面骨架（大标题和品牌区永远在）

## 颜色与字体（R1 对比度 / R3 中文排版）
- 小字（<18px）与背景对比度 ≥ 4.5:1（WCAG AA）
- 本项目暗色底 `#0a0e1a` 上：正文用 `slate-100`，辅助文字最低 `slate-400`（≈7.5:1）；
  `slate-500` 只能用于 ≥18px 粗体或装饰；**`slate-600` 及更深禁止用于文字**
- 强调色体系：橙色 `orange-400/500` 为主，分类色板见 `src/lib/mockData.js` 的 CATEGORIES，不要新造颜色
- 中文标签不用 `uppercase`（无效）也不用 `tracking-wider`（拉松难看）；中文小标签用 `text-xs font-medium text-slate-400`
- 正文行高 `leading-relaxed` 以上；12px（text-xs）是中文最小字号；`tracking-*` 只允许用在纯英文

## 卡片与按钮（R2 三态）
- 所有按钮和链接必须有可见的 `focus-visible` 样式，统一用：
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60`
- hover 必须有反馈（变色 / 变边框 / 轻微位移任一）
- disabled 按钮加 `cursor-not-allowed opacity-60`，不能看起来还能点
- 卡片内边距、间距全部走 Tailwind 4px 网格，同一容器内相邻区块的纵向 padding 来自同一节奏（4/8 的倍数递进）

## 移动端（R5）
- <768px：无横向滚动条；固定定位浮层不得超出视口宽度
- 大标题降级写法 `text-2xl sm:text-3xl`；多列布局必须有单列回退（`grid-cols-1 lg:grid-cols-*`）

## 修改前（先想后改）
- 先列出要改的具体问题 / 需求点，再逐个动手，一次只改一个
- 动手前确认：这个改动会不会影响四种页面状态（loading/success/empty/error）里的其他状态

## 修改后（必须验证）
1. `npm run dev` 打开页面，桌面宽度肉眼过一遍上面五类规则
2. 缩窄到 <768px 再过一遍移动端规则
3. 用 Tab 键走一圈，确认每个可交互元素都有可见焦点框
4. 检查已做的交互（收藏星、平台选择、展开按钮）没有因为样式改动失效
5. 截图留证：改前 / 改后各一张，同一位置对比
