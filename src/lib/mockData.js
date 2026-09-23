// src/lib/mockData.js
// Day 7 第 2 步：mock 数据
// 6 平台 × TOP50 = 300 条热搜
// 字段严格对齐 PRD 三.6 数据模型 + TECH_DESIGN 三 数据模型

export const PLATFORMS = [
  { id: 'weibo',    name: '微博',   color: '#ef4444', dot: 'bg-red-500' },
  { id: 'zhihu',    name: '知乎',   color: '#3b82f6', dot: 'bg-blue-500' },
  { id: 'douyin',   name: '抖音',   color: '#f97316', dot: 'bg-orange-500' },
  { id: 'baidu',    name: '百度',   color: '#22c55e', dot: 'bg-green-500' },
  { id: 'xiaohongshu', name: '小红书', color: '#ec4899', dot: 'bg-pink-500' },
  { id: 'bilibili', name: 'B站',   color: '#a855f7', dot: 'bg-purple-500' },
]

export const CATEGORIES = [
  { id: 'entertainment', name: '娱乐', color: '#f59e0b', bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/40' },
  { id: 'society',       name: '社会', color: '#3b82f6', bg: 'bg-blue-500/15',    text: 'text-blue-300',    border: 'border-blue-500/40' },
  { id: 'tech',          name: '科技', color: '#10b981', bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  { id: 'finance',       name: '财经', color: '#eab308', bg: 'bg-yellow-500/15',  text: 'text-yellow-300',  border: 'border-yellow-500/40' },
  { id: 'sports',        name: '体育', color: '#a855f7', bg: 'bg-purple-500/15',  text: 'text-purple-300',  border: 'border-purple-500/40' },
  { id: 'gaming',        name: '游戏', color: '#14b8a6', bg: 'bg-teal-500/15',    text: 'text-teal-300',    border: 'border-teal-500/40' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

// 各平台的分类分布权重（数字越大，该分类越密集）
// 反映各平台调性：微博偏娱乐社会、抖音偏娱乐游戏、知乎偏科技社会、百度偏社会财经、B站偏游戏科技、小红书偏娱乐
const PLATFORM_CATEGORY_WEIGHTS = {
  weibo:        { entertainment: 5, society: 4, tech: 1, finance: 1, sports: 2, gaming: 1 },
  zhihu:        { entertainment: 1, society: 3, tech: 5, finance: 2, sports: 1, gaming: 2 },
  douyin:       { entertainment: 5, society: 1, tech: 1, finance: 1, sports: 2, gaming: 4 },
  baidu:        { entertainment: 2, society: 4, tech: 2, finance: 4, sports: 2, gaming: 1 },
  xiaohongshu:  { entertainment: 5, society: 2, tech: 1, finance: 2, sports: 1, gaming: 1 },
  bilibili:     { entertainment: 2, society: 1, tech: 4, finance: 1, sports: 2, gaming: 5 },
}

// 各分类的标题库（精选一批中文热搜风格标题，按平台调性挑）
const TITLES = {
  entertainment: [
    '某顶流明星官宣恋情，粉丝集体破防', '综艺节目名场面：嘉宾当场吵架', '金鸡奖获奖名单公布',
    '古装剧《长安赋》收视破3', '周杰伦演唱会现场万人合唱', '某演员偷税漏税被罚12亿',
    '选秀节目决赛夜投票通道崩了', '韩国女团新歌MV涉嫌AI换脸', '顶流网红直播间翻车',
    '某导演新片口碑两极分化', '影视飓风Tim测评百万播放', '爆款短剧《我在八零年代当后妈》第二季',
    '某男星被曝与经纪人秘密结婚', '演唱会黄牛票炒到两万八', '影视后期特效师猝死引行业反思',
    '年度十大金曲榜单出炉', '某歌手假唱被现场观众识破', '网红二驴账号永久封禁',
    '脱口秀大会李雪琴再爆梗', '陈奕迅澳门演唱会因病延期', '某顶流小花与已婚导演同进酒店',
    '明星律师声明：未代言任何理财产品', '抖音千万粉丝主播被举报', '某电影首映礼红毯生图',
    '年度最受欢迎男/女演员票选', 'AI生成明星视频泛滥引发争议',
  ],
  society: [
    '某地暴雨致地铁站被淹', '外卖小哥救人后公司奖励10万', '985毕业生送外卖引热议',
    '官方通报某工厂爆炸事故', '某小区加装电梯遭一楼反对', '全国油价将迎来新一轮调整',
    '社区团购再爆质量问题', '多地高温预警持续发布', '幼儿园老师殴打儿童事件',
    '某高校教授学术造假被撤稿', '罕见病特效药纳入医保', '人口老龄化数据再创新高',
    '某地铁猥亵事件警方通报', '外卖平台佣金比例引骑手抗议', '校园食品安全专项检查启动',
    '某地试行四天工作制反响热烈', '宠物咖啡馆虐待动物被端', '女子高铁上掌掴乘务员被拘留',
    '网约车司机绕路被平台封禁', '官方发布防溺水安全提示', '春节假期延长至除夕',
    '某医院回应住院难问题', '公安部门公布反诈最新数据',
  ],
  tech: [
    'GPT-6发布：上下文窗口突破100万', '英伟达新显卡性能翻倍', '国产光刻机取得重大突破',
    '苹果发布会邀请函泄露', '华为Mate 80跑分曝光', 'SpaceX星舰第十次试飞成功',
    '量子计算机首次商业化落地', '某手机厂商自研系统全网公测', '小米SU8谍照流出',
    '比亚迪推出全新刀片电池', 'OpenAI开源新模型权重', 'GitHub Copilot Agent正式版上线',
    '苹果Vision Pro国行版定价公布', '某国产大模型登顶全球榜单', 'Meta AR眼镜原型曝光',
    '特斯拉Robotaxi试运营', '微软Copilot接入Office全家桶', '索尼PS6爆料：性能超PS5三倍',
    'AMD发布新处理器对标苹果M4', '国产开源数据库登顶TPC-C', '鸿蒙原生应用突破10万款',
    'Linux 6.18 LTS正式发布', '某AI公司估值破千亿美元',
  ],
  finance: [
    'A股沪指突破3800点', '比特币突破10万美元', '人民币汇率创年内新高',
    '某券商研报：牛市才刚起步', '黄金价格再创历史新高', '央行降准0.5个百分点',
    '某新能源车企市值破万亿', '房贷利率下调至3.0%', '证监会发布退市新规',
    '公募基金发行规模回暖', '某上市公司股东套现百亿', '美联储12月降息预期升温',
    '国债逆回购年化突破4%', '比特币现货ETF获批', '港股恒指单日暴涨5%',
    '某AI芯片公司启动IPO', '存款利率告别2时代', '某保险公司被接管',
    '黄金ETF单周流入超百亿', '数字人民币试点扩围', '纳斯达克指数刷新历史新高',
  ],
  sports: [
    '国足世预赛1比0战胜韩国', 'NBA总决赛湖人vs凯尔特人', '梅西第八次获金球奖',
    '欧冠决赛皇马绝杀曼城', '全红婵10米台再夺冠军', '某中超球员被曝赌球',
    'CBA辽宁vs广东总决赛G7', 'WTT世界杯孙颖莎夺冠', '世界杯预选赛亚洲区18强',
    '奥运冠军退役引网友不舍', '某马拉松赛官方回应补给不足', '电竞英雄联盟S14全球总决赛',
    '樊振东退出世界排名', '羽生结弦宣布结婚', '张伟丽卫冕UFC草量级金腰带',
    '世界杯亚洲区出线规则', '某国脚涉嫌假球被禁赛', '网球大满贯德约科维奇夺冠',
    '苏炳添宣布复出', '电竞DOTA2中国队首夺TI冠军',
  ],
  gaming: [
    '《黑神话：钟馗》实机演示曝光', '《原神》5.4版本更新内容', '《王者荣耀》新英雄发布',
    '《黑神话悟空》DLC公布', '《艾尔登法环》Steam史低促销', '腾讯宣布代理《彩虹六号》国服',
    '某主播直播通关《只狼》受苦2000次', '《赛博朋克2077》续作公布', 'Steam年度最佳游戏出炉',
    '《绝区零》公测登顶免费榜', '《幻塔》新版本角色引发争议', '《永劫无间》手游上线',
    '某玩家开箱开出绝版皮肤', '《空洞骑士：丝之歌》发售日确认', '网易《燕云十六声》公测定档',
    '米哈游新游戏《星布谷地》曝光', '《植物大战僵尸3》国服上线', '《英雄联盟》新赛季主题',
    '《CS2》Major上海站中国战队夺冠', '《原神》玩家集体抗议角色强度',
  ],
}

// 固定时间锚点（页面渲染时基于它生成"几分钟前"）
// 注意：这个锚点要在页面打开瞬间生成一次，而不是每次渲染都变
// 所以它由调用方传入，mock 模块只做"过去几分钟"的数据
export function generateMockData(anchorTime = Date.now()) {
  const items = []

  PLATFORMS.forEach(platform => {
    const weights = PLATFORM_CATEGORY_WEIGHTS[platform.id]
    // 构造权重桶
    const bucket = []
    Object.entries(weights).forEach(([cat, w]) => {
      for (let i = 0; i < w; i++) bucket.push(cat)
    })

    // 50 条
    for (let rank = 1; rank <= 50; rank++) {
      // 分类：用「4 倍扩展桶 + rank×5 + 平台哈希」做确定性均匀抽样
      // 这样 TOP3 不会聚在同一类，且各平台调性仍由权重分布保证
      const megaBucket = [...bucket, ...bucket, ...bucket, ...bucket]
      const platformHash = platform.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const cat = megaBucket[(rank * 5 + platformHash) % megaBucket.length]
      // 标题池：取模取一条
      const pool = TITLES[cat]
      const title = pool[(rank * 7 + platform.id.charCodeAt(0)) % pool.length]
      // 热度：rank 1 最高（1.2 亿），rank 50 最低（150 万），按幂律衰减
      const heat = Math.round(120_000_000 / Math.pow(rank, 0.85))
      // 时间：rank 1 最新（5 分钟内），rank 50 较早（2 小时内）
      const minutesAgo = 5 + Math.round(rank * 2.5)
      const publishedAt = anchorTime - minutesAgo * 60 * 1000

      items.push({
        id: `${platform.id}-${rank}`,
        platform: platform.id,
        rank,
        title,
        heat,
        category: cat,
        publishedAt,
        // 外链：MVP 阶段点开跳原文（PRD F4 简化方案，Day 13 再做详情页）
        url: `https://www.${platform.id}.com/search?q=${encodeURIComponent(title)}`,
      })
    }
  })

  return items
}

// 工具：把数字格式化成"1.2亿"/"856万"
export function formatHeat(n) {
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(1).replace(/\.0$/, '') + '亿'
  if (n >= 10_000) return (n / 10_000).toFixed(0) + '万'
  return String(n)
}

// 工具：把时间戳格式化成"X 分钟前"
export function formatRelative(ts, now = Date.now()) {
  const diff = Math.max(0, Math.floor((now - ts) / 60000))
  if (diff < 1) return '刚刚'
  if (diff < 60) return diff + ' 分钟前'
  const h = Math.floor(diff / 60)
  if (h < 24) return h + ' 小时前'
  return Math.floor(h / 24) + ' 天前'
}

// 工具：把时间戳格式化成"HH:MM:SS"（Day 8：品牌区显示数据更新时间）
export function formatClock(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}