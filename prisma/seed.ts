import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

const INITIAL_ETFS = [
  // 美股大盘
  { etfCode: 'SPY', etfName: 'SPDR S&P 500 ETF', sector: '美股大盘', subSector: '美股大盘', shares: 100, avgCostPerShare: 450 },
  { etfCode: 'QQQ', etfName: 'Invesco QQQ Trust', sector: '科技', subSector: '美股科技', shares: 80, avgCostPerShare: 380 },
  // 中国/香港
  { etfCode: 'EWH', etfName: 'iShares MSCI Hong Kong ETF', sector: '香港', subSector: '香港/恒生', shares: 500, avgCostPerShare: 25 },
  { etfCode: 'FXI', etfName: 'iShares China Large-Cap ETF', sector: '中国', subSector: '中国大盘', shares: 300, avgCostPerShare: 28 },
  { etfCode: 'KWEB', etfName: 'KraneShares CSI China Internet ETF', sector: '中国', subSector: '中国互联网', shares: 150, avgCostPerShare: 28 },
  { etfCode: 'MCHI', etfName: 'iShares MSCI China ETF', sector: '中国', subSector: 'MSCI中国', shares: 200, avgCostPerShare: 45 },
  { etfCode: 'CQQQ', etfName: 'Invesco China Technology ETF', sector: '中国', subSector: '中国科技', shares: 100, avgCostPerShare: 55 },
  // 商品
  { etfCode: 'GLD', etfName: 'SPDR Gold Shares', sector: '商品', subSector: '黄金', shares: 60, avgCostPerShare: 180 },
  { etfCode: 'SLV', etfName: 'iShares Silver Trust', sector: '商品', subSector: '白银', shares: 100, avgCostPerShare: 22 },
  { etfCode: 'COPX', etfName: 'Global X Copper Miners ETF', sector: '商品', subSector: '铜矿', shares: 80, avgCostPerShare: 35 },
  { etfCode: 'URA', etfName: 'Global X Uranium ETF', sector: '商品', subSector: '铀', shares: 50, avgCostPerShare: 28 },
  // 债券
  { etfCode: 'TLT', etfName: 'iShares 20+ Year Treasury Bond ETF', sector: '债券', subSector: '长期国债', shares: 40, avgCostPerShare: 95 },
  // 加密货币
  { etfCode: 'IBIT', etfName: 'iShares Bitcoin Trust', sector: '加密货币', subSector: '加密货币', shares: 200, avgCostPerShare: 35 },
  // 科技
  { etfCode: 'SMH', etfName: 'VanEck Semiconductor ETF', sector: '科技', subSector: '半导体', shares: 50, avgCostPerShare: 220 },
  { etfCode: 'SOXX', etfName: 'iShares Semiconductor ETF', sector: '科技', subSector: '半导体', shares: 40, avgCostPerShare: 180 },
  // 新兴市场
  { etfCode: 'EEM', etfName: 'iShares MSCI Emerging Markets ETF', sector: '新兴市场', subSector: '新兴市场', shares: 100, avgCostPerShare: 42 },
  { etfCode: 'INDA', etfName: 'iShares MSCI India ETF', sector: '印度', subSector: '印度', shares: 100, avgCostPerShare: 48 },
  { etfCode: 'VNM', etfName: 'VanEck Vietnam ETF', sector: '越南', subSector: '越南', shares: 80, avgCostPerShare: 15 },
  { etfCode: 'KSA', etfName: 'iShares MSCI Saudi Arabia ETF', sector: '沙特', subSector: '沙特', shares: 60, avgCostPerShare: 32 },
  { etfCode: 'ASEA', etfName: 'Global X FTSE Southeast Asia ETF', sector: '东南亚', subSector: '东南亚', shares: 70, avgCostPerShare: 18 },
  // 发达市场
  { etfCode: 'EWJ', etfName: 'iShares MSCI Japan ETF', sector: '日本', subSector: '日本大盘', shares: 120, avgCostPerShare: 58 },
  { etfCode: 'VGK', etfName: 'Vanguard FTSE Europe ETF', sector: '欧洲', subSector: '欧洲大盘', shares: 90, avgCostPerShare: 62 },
  { etfCode: 'EWY', etfName: 'iShares MSCI South Korea ETF', sector: '韩国', subSector: '韩国', shares: 80, avgCostPerShare: 65 },
  // 能源
  { etfCode: 'XLE', etfName: 'Energy Select Sector SPDR Fund', sector: '能源', subSector: '传统石油', shares: 80, avgCostPerShare: 88 },
  { etfCode: 'UNG', etfName: 'United States Natural Gas Fund', sector: '能源', subSector: '天然气', shares: 100, avgCostPerShare: 12 },
  // REITs
  { etfCode: 'VNQ', etfName: 'Vanguard Real Estate ETF', sector: 'REITs', subSector: '美国REITs', shares: 60, avgCostPerShare: 85 },
  // 外汇/美元
  { etfCode: 'UUP', etfName: 'Invesco DB US Dollar Index Bullish Fund', sector: '外汇', subSector: '美元指数', shares: 50, avgCostPerShare: 28 },
]

// 专家列表（用户指定）
// 内容源分为两类：
// 1. 专属源 (youtube_channel, rss_feed) - 专家自己发布的内容
// 2. 搜索源 (news_api, brave_search) - 用专家名字搜索第三方报道
// 3. 开放式收集由系统级配置处理，不绑定到单个专家
const INITIAL_EXPERTS = [
  {
    name: '洪灝',
    nameEn: 'Hong Hao',
    institution: '思睿集团 GROW Investment',
    title: '首席经济学家',
    communicationStyle: 'principled_macro',
    credibilityScore: 0.90,
    specialtySectors: ['中国大盘', '宏观', '港股', '美股'],
    biasProfile: { baseSentiment: 0, permabullSectors: [], permabearSectors: [] },
    contentSources: [
      // 专属源 - 需用户补充真实频道ID
      { type: 'youtube_channel', identifier: 'PLACEHOLDER_HONGHAO_YT', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: '洪灝 YouTube 频道，需补充真实ID' },
      // 搜索源 - 自动搜索
      { type: 'news_api', identifier: '"Hong Hao" OR "洪灝" (macro OR market OR 宏观 OR 市场)', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'NewsAPI 搜索' },
      { type: 'brave_search', identifier: '"Hong Hao" 洪灝 观点 市场', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'Brave Search 搜索' },
    ],
    aliases: ['Hong Hao', '洪浩', '洪灝'],
  },
  {
    name: 'Jurrien Timmer',
    nameEn: 'Jurrien Timmer',
    institution: 'Fidelity Investments',
    title: '全球宏观总监',
    communicationStyle: 'principled_macro',
    credibilityScore: 0.88,
    specialtySectors: ['美股', '宏观', '美联储', '比特币'],
    biasProfile: { baseSentiment: 0.05, permabullSectors: ['美股'], permabearSectors: [] },
    contentSources: [
      { type: 'youtube_channel', identifier: 'PLACEHOLDER_FIDELITY_YT', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'Fidelity YouTube 频道，需补充真实ID' },
      { type: 'news_api', identifier: '"Jurrien Timmer" (Fed OR bitcoin OR macro OR market)', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'NewsAPI 搜索' },
      { type: 'brave_search', identifier: '"Jurrien Timmer" Fidelity view market', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'Brave Search 搜索' },
    ],
    aliases: ['Jurrien Timmer', 'Timmer'],
  },
  {
    name: '蔡金強',
    nameEn: 'Choi Kin Keung',
    institution: '独立分析师',
    title: '财经评论员',
    communicationStyle: 'fundamental_analyst',
    credibilityScore: 0.82,
    specialtySectors: ['港股', 'A股', '中国大盘'],
    biasProfile: { baseSentiment: 0.1, permabullSectors: ['港股'], permabearSectors: [] },
    contentSources: [
      { type: 'youtube_channel', identifier: 'PLACEHOLDER_CHOI_YT', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: '蔡金強 YouTube 频道，需补充真实ID' },
      { type: 'news_api', identifier: '"蔡金強" OR "Choi Kin Keung" (港股 OR 恒指 OR 市场)', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'NewsAPI 搜索' },
      { type: 'brave_search', identifier: '"蔡金強" 港股 观点 分析', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'Brave Search 搜索' },
    ],
    aliases: ['蔡金强', 'Choi Kin Keung', '蔡金強'],
  },
  {
    name: '谭新強',
    nameEn: 'Tam San Keung',
    institution: '独立股评人',
    title: '股评人',
    communicationStyle: 'narrative_driven',
    credibilityScore: 0.75,
    specialtySectors: ['港股', '中国大盘'],
    biasProfile: { baseSentiment: 0, permabullSectors: [], permabearSectors: [] },
    contentSources: [
      { type: 'youtube_channel', identifier: 'PLACEHOLDER_TAM_YT', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: '谭新強 YouTube 频道，需补充真实ID' },
      { type: 'news_api', identifier: '"谭新強" OR "谭新强" (港股 OR 股市 OR 分析)', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'NewsAPI 搜索' },
      { type: 'brave_search', identifier: '"谭新強" 港股 观点', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'Brave Search 搜索' },
    ],
    aliases: ['谭新强', 'Tam San Keung'],
  },
  {
    name: '區偉志',
    nameEn: 'Au Wai Chi',
    institution: '独立股评人',
    title: '股评人',
    communicationStyle: 'technical_chartist',
    credibilityScore: 0.72,
    specialtySectors: ['港股', '美股'],
    biasProfile: { baseSentiment: -0.05, permabullSectors: [], permabearSectors: ['A股'] },
    contentSources: [
      { type: 'youtube_channel', identifier: 'PLACEHOLDER_AU_YT', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: '區偉志 YouTube 频道，需补充真实ID' },
      { type: 'news_api', identifier: '"區偉志" OR "区伟志" (港股 OR 技术分析 OR 股市)', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'NewsAPI 搜索' },
      { type: 'brave_search', identifier: '"區偉志" 港股 技术分析', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'Brave Search 搜索' },
    ],
    aliases: ['区伟志', 'Au Wai Chi', '區偉志'],
  },
  {
    name: '林本利',
    nameEn: 'Lam Ben Lee',
    institution: '独立财经评论员',
    title: '财经评论员',
    communicationStyle: 'fundamental_analyst',
    credibilityScore: 0.78,
    specialtySectors: ['港股', 'A股', '宏观'],
    biasProfile: { baseSentiment: 0.05, permabullSectors: ['港股'], permabearSectors: [] },
    contentSources: [
      { type: 'youtube_channel', identifier: 'PLACEHOLDER_LAMBL_YT', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: '林本利 YouTube 频道，需补充真实ID' },
      { type: 'news_api', identifier: '"林本利" (港股 OR 财经 OR 分析 OR 楼市)', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'NewsAPI 搜索' },
      { type: 'brave_search', identifier: '"林本利" 港股 财经 观点', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'Brave Search 搜索' },
    ],
    aliases: ['林本利', 'Lam Ben Lee'],
  },
  {
    name: '林一鳴',
    nameEn: 'Lam Yat Ming',
    institution: '独立股评人',
    title: '股评人',
    communicationStyle: 'emotional_momentum',
    credibilityScore: 0.70,
    specialtySectors: ['港股', '美股'],
    biasProfile: { baseSentiment: 0.1, permabullSectors: ['港股'], permabearSectors: [] },
    contentSources: [
      { type: 'youtube_channel', identifier: 'PLACEHOLDER_LAMYM_YT', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: '林一鳴 YouTube 频道，需补充真实ID' },
      { type: 'news_api', identifier: '"林一鳴" OR "林一鸣" (港股 OR 股市 OR 分析)', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'NewsAPI 搜索' },
      { type: 'brave_search', identifier: '"林一鳴" 港股 股评', fetchFrequency: '0 8 * * *', lastFetchedAt: null, note: 'Brave Search 搜索' },
    ],
    aliases: ['林一鸣', 'Lam Yat Ming', '林一鳴'],
  },
]

// 开放式收集源 - 通用财经媒体，不绑定特定专家
// 从这些源抓取的内容会经过 Kimi 专家识别，自动关联到对应专家
const OPEN_COLLECTION_SOURCES = [
  // Bloomberg
  { type: 'rss_feed', identifier: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Markets', region: 'global' },
  { type: 'rss_feed', identifier: 'https://feeds.bloomberg.com/news/economy.rss', name: 'Bloomberg Economy', region: 'global' },
  // SCMP
  { type: 'rss_feed', identifier: 'https://www.scmp.com/rss/318198/feed', name: 'SCMP Business', region: 'hk' },
  { type: 'rss_feed', identifier: 'https://www.scmp.com/rss/318200/feed', name: 'SCMP Markets', region: 'hk' },
  // 香港报章
  { type: 'rss_feed', identifier: 'https://www.hkej.com/rss/feed.xml', name: '信报财经', region: 'hk' },
  { type: 'rss_feed', identifier: 'https://news.mingpao.com/rss/pns/section/0003/feed.xml', name: '明报财经', region: 'hk' },
  { type: 'rss_feed', identifier: 'https://www.etnet.com.hk/www/tc/news/rss.php', name: '经济日报', region: 'hk' },
  // Podcast
  { type: 'podcast_rss', identifier: 'https://feeds.megaphone.fm/BLM1726920077', name: 'Moving Markets (Bloomberg)', region: 'global', note: 'Bloomberg Moving Markets podcast - 可能包含多位专家观点' },
  { type: 'podcast_rss', identifier: 'https://feeds.megaphone.fm/BLM2074447575', name: 'Odd Lots (Bloomberg)', region: 'global', note: 'Bloomberg Odd Lots podcast' },
  // 其他国际源
  { type: 'rss_feed', identifier: 'https://feeds.afr.com/feed', name: 'Australian Financial Review', region: 'global' },
  { type: 'rss_feed', identifier: 'https://www.ft.com/?format=rss', name: 'Financial Times', region: 'global' },
]

const INITIAL_THEMES = [
  {
    themeName: 'AI Infrastructure',
    themeDescription: '人工智能基础设施建设',
    keywords: ['AI', 'artificial intelligence', 'chatgpt', 'nvidia', 'semiconductor', '芯片', '人工智能'],
    etfMappings: [
      { ticker: 'SMH', mappingType: 'primary', semanticScore: 0.95, overlapBasis: '半导体ETF，包含NVIDIA等AI芯片股' },
      { ticker: 'QQQ', mappingType: 'secondary', semanticScore: 0.75, overlapBasis: '纳斯达克100包含大量AI相关科技股' },
    ],
  },
  {
    themeName: 'China Reopening',
    themeDescription: '中国重新开放/经济复苏',
    keywords: ['china', 'reopening', '中国', '复苏', 'reopen', 'covid', '疫情', '消费'],
    etfMappings: [
      { ticker: 'FXI', mappingType: 'primary', semanticScore: 0.9, overlapBasis: '中国大盘ETF' },
      { ticker: 'KWEB', mappingType: 'primary', semanticScore: 0.85, overlapBasis: '中国互联网ETF' },
      { ticker: 'EWH', mappingType: 'secondary', semanticScore: 0.6, overlapBasis: '香港市场受中国政策影响' },
    ],
  },
  {
    themeName: 'Fed Pivot',
    themeDescription: '美联储转向降息',
    keywords: ['fed', 'federal reserve', 'interest rate', 'rate cut', '降息', '美联储', '利率'],
    etfMappings: [
      { ticker: 'TLT', mappingType: 'primary', semanticScore: 0.95, overlapBasis: '长期国债ETF，降息时价格上涨' },
      { ticker: 'QQQ', mappingType: 'secondary', semanticScore: 0.7, overlapBasis: '成长股受益于低利率环境' },
    ],
  },
  {
    themeName: 'Gold Safe Haven',
    themeDescription: '黄金避险',
    keywords: ['gold', 'safe haven', 'inflation', 'hedge', '黄金', '避险', '通胀', '对冲'],
    etfMappings: [
      { ticker: 'GLD', mappingType: 'primary', semanticScore: 0.98, overlapBasis: '黄金ETF' },
    ],
  },
  {
    themeName: 'Crypto Adoption',
    themeDescription: '加密货币采用',
    keywords: ['bitcoin', 'crypto', 'cryptocurrency', 'btc', 'eth', '比特币', '加密货币', '区块链'],
    etfMappings: [
      { ticker: 'IBIT', mappingType: 'primary', semanticScore: 0.98, overlapBasis: '比特币现货ETF' },
    ],
  },
  {
    themeName: 'Japan Recovery',
    themeDescription: '日本经济复苏',
    keywords: ['japan', 'nikkei', 'yen', '日本', '日经', '日元', '东证'],
    etfMappings: [
      { ticker: 'EWJ', mappingType: 'primary', semanticScore: 0.95, overlapBasis: '日本大盘ETF' },
    ],
  },
  {
    themeName: 'Emerging Markets Growth',
    themeDescription: '新兴市场增长',
    keywords: ['emerging markets', 'india', 'brazil', '新兴市场', '印度', '巴西', '东南亚'],
    etfMappings: [
      { ticker: 'EEM', mappingType: 'primary', semanticScore: 0.9, overlapBasis: '新兴市场ETF' },
      { ticker: 'INDA', mappingType: 'primary', semanticScore: 0.85, overlapBasis: '印度ETF' },
    ],
  },
  {
    themeName: 'Energy Transition',
    themeDescription: '能源转型',
    keywords: ['oil', 'energy', 'crude', '石油', '能源', '原油', '天然气'],
    etfMappings: [
      { ticker: 'XLE', mappingType: 'primary', semanticScore: 0.95, overlapBasis: '能源板块ETF' },
    ],
  },
]

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await hashPassword('admin123')
  await prisma.user.upsert({
    where: { email: 'admin@alphainsight.ai' },
    update: {},
    create: {
      email: 'admin@alphainsight.ai',
      name: 'Admin',
      role: 'admin',
      password: adminPassword,
    },
  })

  // Create ETF holdings
  for (const etf of INITIAL_ETFS) {
    const price = etf.avgCostPerShare * (1 + (Math.random() * 0.4 - 0.1))
    await prisma.eTFHolding.upsert({
      where: { etfCode: etf.etfCode },
      update: {},
      create: {
        ...etf,
        lastPrice: price,
        marketValue: etf.shares * price,
        costBasis: etf.shares * etf.avgCostPerShare,
        currentWeight: 0,
      },
    })
  }

  // Recalculate weights
  const allHoldings = await prisma.eTFHolding.findMany()
  const totalValue = allHoldings.reduce((sum, h) => sum + h.marketValue, 0)
  for (const h of allHoldings) {
    await prisma.eTFHolding.update({
      where: { id: h.id },
      data: { currentWeight: totalValue > 0 ? h.marketValue / totalValue : 0 },
    })
  }

  // Create experts
  for (const expert of INITIAL_EXPERTS) {
    await prisma.expert.upsert({
      where: { name: expert.name },
      update: {},
      create: {
        name: expert.name,
        nameEn: expert.nameEn || null,
        institution: expert.institution,
        title: expert.title || null,
        communicationStyle: expert.communicationStyle,
        credibilityScore: expert.credibilityScore,
        specialtySectors: expert.specialtySectors,
        biasProfile: expert.biasProfile as any,
        contentSources: expert.contentSources as any,
        aliases: expert.aliases || [],
      },
    })
  }

  // Create theme mappings
  for (const theme of INITIAL_THEMES) {
    await prisma.themeMapping.upsert({
      where: { themeName: theme.themeName },
      update: {},
      create: {
        ...theme,
        etfMappings: theme.etfMappings as any,
      },
    })
  }

  // Store open collection sources in SystemConfig
  await prisma.systemConfig.upsert({
    where: { key: 'open_collection_sources' },
    update: { value: OPEN_COLLECTION_SOURCES as any },
    create: {
      key: 'open_collection_sources',
      value: OPEN_COLLECTION_SOURCES as any,
      description: '开放式收集源配置 - 通用财经媒体RSS和Podcast',
    },
  })

  console.log('Seed completed!')
  console.log(`Experts: ${INITIAL_EXPERTS.length}`)
  console.log(`ETFs: ${INITIAL_ETFS.length}`)
  console.log(`Themes: ${INITIAL_THEMES.length}`)
  console.log(`Open Collection Sources: ${OPEN_COLLECTION_SOURCES.length}`)
  console.log('\n⚠️  IMPORTANT: Please update PLACEHOLDER_* YouTube channel IDs with real IDs')
  console.log('   Use the admin dashboard or API to update expert content sources.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
