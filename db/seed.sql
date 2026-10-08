-- ============================================================
-- 热浪 TREND WAVE · 种子数据（Day 16）
-- 执行环境：CloudBase PostgreSQL
--
-- ⚠️ 重要警告：本脚本「先删后建」，会把两张表清空重来！
--   仅限开发阶段使用（Day 16–19 联调用）。
--   Day 20 部署上线后【禁止再执行】，否则会清空真实数据；
--   上线后的数据变更一律改用增量 SQL。
--
-- 特性：自身完整可重复执行（DROP → CREATE → INSERT），
--       连跑两遍不报错 = 合格。
-- 数据量：trends 12 行（6 平台 × 各 2 条），favorites 5 行。
-- ============================================================

-- ---------- 第 1 步：先删（子表在前，父表在后） ----------
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS trends;

-- ---------- 第 2 步：再建（与 db/schema.sql 完全一致） ----------
CREATE TABLE trends (
    id            TEXT PRIMARY KEY,
    platform      TEXT NOT NULL
                  CHECK (platform IN ('weibo','zhihu','douyin','baidu','xiaohongshu','bilibili')),
    title         TEXT NOT NULL,
    rank          SMALLINT NOT NULL CHECK (rank >= 1),
    heat          BIGINT NOT NULL DEFAULT 0,
    category      TEXT NOT NULL
                  CHECK (category IN ('entertainment','society','tech','finance','sports','gaming','general')),
    url           TEXT,
    published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    trend_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT uq_trends_platform_title_date UNIQUE (platform, title, trend_date)
);

CREATE INDEX idx_trends_platform_date ON trends (trend_date, platform, rank);

CREATE TABLE favorites (
    id          BIGSERIAL PRIMARY KEY,
    user_key    TEXT NOT NULL,
    item_id     TEXT NOT NULL
                REFERENCES trends(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_favorites_user_item UNIQUE (user_key, item_id)
);

CREATE INDEX idx_favorites_user_time ON favorites (user_key, created_at DESC);

-- ---------- 第 3 步：插入种子数据 ----------
-- 时间口径：trend_date 用固定日期 '2026-10-04'（不随执行日变化，保证可复现）；
-- published_at 用带时区字面量（+08，北京时间）。
INSERT INTO trends (id, platform, title, rank, heat, category, url, published_at, trend_date) VALUES
  -- 微博（偏娱乐社会）
  ('weibo-1',         'weibo',        '周杰伦演唱会现场万人合唱',     1, 120000000, 'entertainment', 'https://www.weibo.com/search?q=周杰伦演唱会现场万人合唱',     '2026-10-04 12:05:00+08', '2026-10-04'),
  ('weibo-2',         'weibo',        '人口老龄化数据再创新高',       2,  66500000, 'society',       'https://www.weibo.com/search?q=人口老龄化数据再创新高',       '2026-10-04 12:10:00+08', '2026-10-04'),
  -- 知乎（偏科技社会）
  ('zhihu-1',         'zhihu',        'GPT-6发布：上下文窗口突破100万', 1,  98000000, 'tech',          'https://www.zhihu.com/search?q=GPT-6发布',                    '2026-10-04 12:00:00+08', '2026-10-04'),
  ('zhihu-2',         'zhihu',        '985毕业生送外卖引热议',        2,  54000000, 'society',       'https://www.zhihu.com/search?q=985毕业生送外卖',             '2026-10-04 12:15:00+08', '2026-10-04'),
  -- 抖音（偏娱乐游戏）
  ('douyin-1',        'douyin',       '顶流网红直播间翻车',           1, 110000000, 'entertainment', 'https://www.douyin.com/search?q=顶流网红直播间翻车',         '2026-10-04 12:03:00+08', '2026-10-04'),
  ('douyin-2',        'douyin',       '《王者荣耀》新英雄发布',       2,  61000000, 'gaming',       'https://www.douyin.com/search?q=王者荣耀新英雄',               '2026-10-04 12:12:00+08', '2026-10-04'),
  -- 百度（偏社会财经）
  ('baidu-1',         'baidu',        '多地高温预警持续发布',         1,  87000000, 'society',       'https://www.baidu.com/s?wd=多地高温预警',                      '2026-10-04 12:08:00+08', '2026-10-04'),
  ('baidu-2',         'baidu',        '央行降准0.5个百分点',          2,  48000000, 'finance',       'https://www.baidu.com/s?wd=央行降准',                          '2026-10-04 12:18:00+08', '2026-10-04'),
  -- 小红书（偏娱乐）
  ('xiaohongshu-1',   'xiaohongshu',  '某顶流明星官宣恋情，粉丝集体破防', 1, 95000000, 'entertainment', 'https://www.xiaohongshu.com/search?keyword=明星官宣恋情',     '2026-10-04 12:02:00+08', '2026-10-04'),
  ('xiaohongshu-2',   'xiaohongshu',  '某小区加装电梯遭一楼反对',     2,  42000000, 'society',       'https://www.xiaohongshu.com/search?keyword=加装电梯',         '2026-10-04 12:20:00+08', '2026-10-04'),
  -- B站（偏游戏科技）
  ('bilibili-1',      'bilibili',     '《黑神话：钟馗》实机演示曝光', 1,  76000000, 'gaming',       'https://www.bilibili.com/search?keyword=黑神话钟馗',          '2026-10-04 12:06:00+08', '2026-10-04'),
  ('bilibili-2',      'bilibili',     '英伟达新显卡性能翻倍',         2,  40000000, 'tech',          'https://www.bilibili.com/search?keyword=英伟达新显卡',        '2026-10-04 12:16:00+08', '2026-10-04');

-- 收藏：2 个匿名 user_key 共 5 条，created_at 递增（验证倒序查询）
INSERT INTO favorites (user_key, item_id, created_at) VALUES
  ('seed-user-yolo',    'weibo-1',       '2026-10-04 20:31:00+08'),
  ('seed-user-yolo',    'zhihu-1',       '2026-10-04 20:33:00+08'),
  ('seed-user-yolo',    'bilibili-1',    '2026-10-04 20:35:00+08'),
  ('seed-user-yolo',    'douyin-1',      '2026-10-04 20:37:00+08'),
  ('seed-user-visitor', 'baidu-1',       '2026-10-04 21:02:00+08');

-- ---------- 第 4 步：select 验证（执行后应各返回上述行数） ----------
-- select count(*) from trends;      -- 预期 12
-- select count(*) from favorites;    -- 预期 5
