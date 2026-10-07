-- ============================================================
-- 热浪 TREND WAVE · 数据库结构（Day 16）
-- 执行环境：CloudBase PostgreSQL
-- 说明：
--   * 本文件只建表、不灌数据（数据在 seed.sql）
--   * 自身可重复执行（先 DROP 再 CREATE）
--   * 表结构来源：api-contract.md「三、待实现接口」的返回形状，
--     与前端 mockData.js 的 HotItem 一字不差，不另造字段
-- ============================================================

-- 顺序：先删子表 favorites，再删父表 trends（否则外键依赖会挡住 DROP）
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS trends;

-- ------------------------------------------------------------
-- 表 1：trends —— 热搜条目（核心表，Day 17 读接口的数据源）
-- ------------------------------------------------------------
CREATE TABLE trends (
    -- id：TEXT。seed 数据沿用 HotItem 的 'weibo-1' 格式；
    -- Day 17 真实同步用 '{platform}-{trend_date}-{md5(title)[:8]}'——
    -- 排名会实时变动，id 不能含 rank，标题 hash 保证同一天同标题幂等。
    id            TEXT PRIMARY KEY,

    -- platform：TEXT + CHECK 枚举。固定 6 平台，
    -- 枚举值与前端 PLATFORMS 的 id 完全一致。
    platform      TEXT NOT NULL
                  CHECK (platform IN ('weibo','zhihu','douyin','baidu','xiaohongshu','bilibili')),

    -- title：热搜标题。参与唯一索引，同一平台同一天不重录。
    title         TEXT NOT NULL,

    -- rank：SMALLINT（2 字节，上限 32767）。热搜 TOP50 用不到更大的数。
    rank          SMALLINT NOT NULL CHECK (rank >= 1),

    -- heat：BIGINT。热度是原始整数（可达上亿），INT 上限 21 亿勉强够
    -- 但留余量更稳，且 JSON 返回时仍是数字、无需转换。
    heat          BIGINT NOT NULL DEFAULT 0,

    -- category：TEXT + CHECK 枚举。与前端 CATEGORIES 一致的 6 个分类，
    -- 另加 'general'（Day 17 真实同步专用）：微博/B站/抖音的公开接口
    -- 不提供分类字段，同步数据统一标 general，前端配色 Day 18 跟上。
    category      TEXT NOT NULL
                  CHECK (category IN ('entertainment','society','tech','finance','sports','gaming','general')),

    -- url：跳原文的外链，MVP 阶段允许为空。
    url           TEXT,

    -- published_at：TIMESTAMPTZ。带时区时间戳，API 层转 ISO 8601 UTC
    -- 直接对齐契约的时间格式。
    published_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- trend_date：DATE。条目所属的「哪一天的热搜」，与抓取时刻分开存，
    -- 唯一索引用它而不是 published_at（同一榜单一天只录一行）。
    trend_date    DATE NOT NULL DEFAULT CURRENT_DATE,

    -- 唯一约束：来源平台 + 标题 + 日期。
    -- Day 17 重复抓取同一天榜单时，靠它识别「已存在的行」。
    CONSTRAINT uq_trends_platform_title_date UNIQUE (platform, title, trend_date)
);

-- 常用查询的辅助索引：按平台+日期拉榜单（GET /api/hot 的主查询路径）
CREATE INDEX idx_trends_platform_date ON trends (trend_date, platform, rank);

-- ------------------------------------------------------------
-- 表 2：favorites —— 收藏（Day 19 收藏接口的数据源）
-- 本课程不登录、不建用户表（Day 23+ 才有账号体系），
-- 用 user_key（浏览器本地生成的匿名标识）挂收藏。
-- ------------------------------------------------------------
CREATE TABLE favorites (
    -- id：BIGSERIAL 自增。收藏是纯关联记录，无业务含义，自增即可。
    id          BIGSERIAL PRIMARY KEY,

    -- user_key：匿名用户标识（前端 localStorage 生成的一次性 ID）。
    user_key    TEXT NOT NULL,

    -- item_id：指向 trends.id 的外键。热搜条目被删时收藏级联清理。
    item_id     TEXT NOT NULL
                REFERENCES trends(id) ON DELETE CASCADE,

    -- created_at：收藏时间。GET /api/favorite 按它倒序，
    -- 与前端 localStorage 头插法的行为保持一致。
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 唯一约束：同一用户对同一条目只存一行（幂等收藏的实现基础）。
    CONSTRAINT uq_favorites_user_item UNIQUE (user_key, item_id)
);

-- 按用户取收藏列表的查询路径（user_key + 时间倒序）
CREATE INDEX idx_favorites_user_time ON favorites (user_key, created_at DESC);
