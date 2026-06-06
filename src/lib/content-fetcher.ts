const FETCH_TIMEOUT_MS = 12000
const EXPERT_BLACKLIST = ['許佳龍', '许佳龙']

const EDUCATIONAL_DOMAIN_BLACKLIST = [
  'hkex.com.hk', 'hangseng.com', 'hsbc.com.hk', 'boc.hk', 'dbs.com.hk',
  'sc.com.hk', 'bankofchina.com', 'icbc.com.cn', 'ccb.com', 'abchina.com',
]

const EDUCATIONAL_PATH_PATTERNS = [
  '/personal/investment/', '/wealth-management/', '/investment-guide/',
  '/etf-guide/', '/market-data/', '/securities-prices/', '/trading-guide/',
  '/investor-education/', '/learning-center/', '/faq/', '/help/',
  '/us-stock-etf-guide/',
]

const EDUCATIONAL_CONTENT_PATTERNS = [
  'ETF 的两种类型', '被动型 ETF', '主动型 ETF', 'ETF 基础知识',
  '交易所买卖基金', '追踪指数', '跑赢大市', '主动管理基金',
  '被动管理基金', 'ETF 费用比率', 'ETF 管理费', '证监会认可',
  '集体投资计划', '全方位财富管理', '财富管理服务',
  '证券及期货事务监察委员会',
]

const INVEST_ACTION_KW = [
  '買入', '賣出', '看好', '看淡', '增持', '減持', '沽出', '目標價', '估值', '股息',
  'pe', 'pb', '收益率', '牛市', '熊市', '反彈', '回調', '支撑', '阻力', '建倉', '清倉',
  'buy', 'sell', 'bullish', 'bearish', 'long', 'short', 'overweight', 'underweight',
  'target price', 'price target', 'valuation', 'dividend', 'yield', 'rally', 'pullback',
  '看多', '看空', '做多', '做空', '加倉', '減倉',
]

const INVEST_ASSET_KW = [
  '港股', 'a股', '美股', '納指', '恒指', '上證', '標普', '納斯達克', '道瓊斯',
  '黃金', '原油', '比特幣', '以太坊', '國債', '美債', '中概股', 'etf', '基金',
  'hang seng', 'hsi', 'nasdaq', 's&p', 'dow jones', 'nikkei', 'kospi', 'gold', 'oil',
  'bitcoin', 'ethereum', 'treasury', 'bond', 'equity', 'stock market',
]

// 开放式收集源 - 通用财经媒体，不绑定特定专家
// 从这些源抓取的内容会经过 Kimi 专家识别，自动关联到对应专家
export const OPEN_COLLECTION_SOURCES = [
  // Bloomberg
  { type: 'rss_feed' as const, identifier: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Markets', region: 'global' },
  { type: 'rss_feed' as const, identifier: 'https://feeds.bloomberg.com/news/economy.rss', name: 'Bloomberg Economy', region: 'global' },
  // SCMP
  { type: 'rss_feed' as const, identifier: 'https://www.scmp.com/rss/318198/feed', name: 'SCMP Business', region: 'hk' },
  { type: 'rss_feed' as const, identifier: 'https://www.scmp.com/rss/318200/feed', name: 'SCMP Markets', region: 'hk' },
  // 财新
  { type: 'rss_feed' as const, identifier: 'https://weekly.caixin.com/rss.xml', name: '财新周刊', region: 'cn' },
  // 新浪财经
  { type: 'rss_feed' as const, identifier: 'https://finance.sina.com.cn/stock/hkstock/ggscyd/rss.xml', name: '新浪财经港股', region: 'hk' },
  // Podcast
  { type: 'podcast_rss' as const, identifier: 'https://feeds.megaphone.fm/BLM1726920077', name: 'Moving Markets (Bloomberg)', region: 'global', note: 'Bloomberg Moving Markets podcast - 可能包含多位专家观点' },
  { type: 'podcast_rss' as const, identifier: 'https://feeds.megaphone.fm/BLM2074447575', name: 'Odd Lots (Bloomberg)', region: 'global', note: 'Bloomberg Odd Lots podcast' },
  // 其他国际源
  { type: 'rss_feed' as const, identifier: 'https://feeds.afr.com/feed', name: 'Australian Financial Review', region: 'global' },
  { type: 'rss_feed' as const, identifier: 'https://www.ft.com/?format=rss', name: 'Financial Times', region: 'global' },
]

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms))
  ])
}

export function isEducationalPage(url: string): boolean {
  if (!url) return false
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '')
    const lowerUrl = url.toLowerCase()
    if (EDUCATIONAL_DOMAIN_BLACKLIST.some(d => domain.includes(d))) return true
    if (EDUCATIONAL_PATH_PATTERNS.some(p => lowerUrl.includes(p))) return true
  } catch { /* ignore */ }
  return false
}

export function isEducationalContent(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return EDUCATIONAL_CONTENT_PATTERNS.some(pattern =>
    lower.includes(pattern.toLowerCase())
  )
}

export function filterInvestmentRelevance(text: string): { pass: boolean; reason: string } {
  if (!text) return { pass: false, reason: 'empty' }
  if (text.length < 100) return { pass: false, reason: 'too_short' }

  const lower = text.toLowerCase()

  if (isEducationalContent(text)) {
    return { pass: false, reason: 'educational_content' }
  }

  const catA = INVEST_ACTION_KW.some(kw => lower.includes(kw.toLowerCase()))
  const catB = INVEST_ASSET_KW.some(kw => lower.includes(kw.toLowerCase()))
  const catC = /\b[A-Z]{2,5}\b/.test(text) || /\b\d{4}\.HK\b/i.test(text)

  const score = (catA ? 1 : 0) + (catB ? 1 : 0) + (catC ? 1 : 0)
  if (score < 2) return { pass: false, reason: `low_relevance_score_${score}` }

  return { pass: true, reason: 'ok' }
}

export async function fetchYouTubeChannel(channelId: string, apiKey: string, since: Date) {
  const results: any[] = []
  if (channelId.startsWith('PLACEHOLDER_')) {
    console.log(`[YouTube] Skipping placeholder channel: ${channelId}`)
    return results
  }
  try {
    const publishedAfter = encodeURIComponent(since.toISOString())
    const res = await withTimeout(fetch(
      `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&type=video&order=date&maxResults=5&publishedAfter=${publishedAfter}&key=${apiKey}`
    ), FETCH_TIMEOUT_MS)
    const data = await res.json()

    for (const item of (data.items || [])) {
      const videoId = item.id?.videoId
      if (!videoId) continue
      const title = item.snippet?.title || ''
      const description = item.snippet?.description || ''
      const publishedAt = item.snippet?.publishedAt

      const content = [title, description].filter(Boolean).join('\n\n')
      const relevance = filterInvestmentRelevance(content)
      if (!relevance.pass) continue

      results.push({
        sourceType: 'youtube',
        sourceUrl: `https://youtube.com/watch?v=${videoId}`,
        contentText: content,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        title,
        verificationStatus: 'verified',
      })
    }
  } catch (err) {
    console.error('[YouTube] Error:', err)
  }
  return results
}

export async function fetchRSSFeed(feedUrl: string, expertName: string, since: Date) {
  const results: any[] = []
  if (isEducationalPage(feedUrl)) {
    console.log(`[RSS] Skipping educational domain: ${feedUrl}`)
    return results
  }

  try {
    const res = await withTimeout(fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 AlphaInsight/2.0', 'Accept': 'application/rss+xml, application/atom+xml' }
    }), FETCH_TIMEOUT_MS)
    const text = await res.text()

    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    const items = [...Array.from(text.matchAll(itemRegex)), ...Array.from(text.matchAll(entryRegex))]

    for (const match of items.slice(0, 8)) {
      const itemXml = match[1]

      const getTag = (tag: string) => {
        const m1 = itemXml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`, 'i'))
        if (m1) return m1[1].trim()
        if (tag === 'link') {
          const m2 = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i)
          if (m2) return m2[1].trim()
        }
        return ''
      }

      const title = getTag('title')
      const description = getTag('description') || getTag('content') || getTag('summary')
      const link = getTag('link') || getTag('guid') || getTag('id')
      const pubDateStr = getTag('pubDate') || getTag('published') || getTag('updated')
      const author = getTag('author') || getTag('dc:creator')

      if (isEducationalPage(link)) {
        console.log(`[RSS] Skipping educational item: ${link}`)
        continue
      }

      let publishedAt: Date | null = null
      if (pubDateStr) {
        const d = new Date(pubDateStr)
        if (!isNaN(d.getTime())) {
          if (d < since) continue
          publishedAt = d
        }
      }

      if (!description && !title) continue
      const content = [title, description].filter(Boolean).join('\n\n')

      if (isEducationalContent(content)) {
        console.log(`[RSS] Filtered educational content: ${title.slice(0, 80)}`)
        continue
      }

      const relevance = filterInvestmentRelevance(content)
      if (!relevance.pass) continue

      let verificationStatus = 'unverified'
      if (author && expertName) {
        const authorLower = author.toLowerCase()
        const expertLower = expertName.toLowerCase()
        if (authorLower.includes(expertLower) || expertLower.includes(authorLower)) {
          verificationStatus = 'verified'
        }
      }

      results.push({
        sourceType: 'rss',
        sourceUrl: link || feedUrl,
        contentText: content,
        publishedAt,
        title,
        verificationStatus,
      })
    }
  } catch (err) {
    console.error(`[RSS] Error fetching ${feedUrl}:`, err)
  }
  return results
}

export async function fetchBraveSearch(query: string, braveKey: string) {
  try {
    const res = await withTimeout(fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&freshness=pw`,
      { headers: { 'Accept': 'application/json', 'X-Subscription-Token': braveKey } }
    ), FETCH_TIMEOUT_MS)
    const data = await res.json()
    return (data.web?.results || []).map((item: any) => ({
      title: item.title,
      url: item.url,
      description: item.description,
    }))
  } catch {
    return []
  }
}

export async function fetchNewsAPI(query: string, newsApiKey: string, since: Date, language: string = 'en') {
  const results: any[] = []
  try {
    const fromDate = since.toISOString().split('T')[0]
    const langParam = language ? `&language=${language}` : ''
    const res = await withTimeout(fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&sortBy=publishedAt&pageSize=10${langParam}&apiKey=${newsApiKey}`
    ), FETCH_TIMEOUT_MS)
    const data = await res.json()

    for (const article of (data.articles || [])) {
      const content = [article.title, article.description].filter(Boolean).join('\n\n')
      const relevance = filterInvestmentRelevance(content)
      if (!relevance.pass) continue

      results.push({
        sourceType: 'news',
        sourceUrl: article.url,
        contentText: content,
        publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
        title: article.title,
        verificationStatus: 'unverified',
      })
    }
  } catch (err) {
    console.error('[NewsAPI] Error:', err)
  }
  return results
}

export function isBlacklistedExpert(name: string): boolean {
  return EXPERT_BLACKLIST.some(b => name.includes(b) || b.includes(name))
}

// ==================== 开放式收集 (Open Collection) ====================

/**
 * 从通用财经源抓取内容，不预设专家归属
 * 返回的内容会经过后续的专家识别步骤
 */
export async function fetchOpenCollectionSources(since: Date): Promise<any[]> {
  const allItems: any[] = []

  for (const source of OPEN_COLLECTION_SOURCES) {
    try {
      let items: any[] = []
      switch (source.type) {
        case 'rss_feed':
        case 'podcast_rss':
          // 对于开放式收集，expertName 传空字符串，不做作者匹配验证
          items = await fetchRSSFeed(source.identifier, '', since)
          break
      }
      // 标记为开放式收集来源
      for (const item of items) {
        item.openCollectionSource = source.name
        item.openCollectionRegion = source.region
        item.verificationStatus = 'open_collection' // 需要后续专家识别
      }
      allItems.push(...items)
      console.log(`[OpenCollection] ${source.name}: ${items.length} items`)
    } catch (err) {
      console.error(`[OpenCollection] Error fetching ${source.name}:`, err)
    }
  }

  return allItems
}

/**
 * 使用 Kimi 识别内容中是否包含目标专家的观点
 * @param contentText 内容文本
 * @param experts 专家列表，包含 name, nameEn, aliases
 * @param kimiKey Kimi API Key
 * @returns 识别到的专家列表及置信度
 */
export async function identifyExpertInContent(
  contentText: string,
  experts: Array<{ name: string; nameEn?: string | null; aliases: string[] }>,
  kimiKey: string
): Promise<Array<{ name: string; confidence: number; quotedText: string; reasoning: string }>> {
  const expertList = experts.map(e => {
    const allNames = [e.name, e.nameEn, ...e.aliases].filter(Boolean)
    return `- ${e.name}${e.nameEn ? ` (${e.nameEn})` : ''} [别名: ${allNames.join(', ')}]`
  }).join('\n')

  const prompt = `你是一位财经内容分析专家。请仔细阅读以下财经文章/播客内容，识别其中是否明确引用了以下任何一位专家的观点、评论或预测。

目标专家列表：
${expertList}

识别规则：
1. 必须是在内容中**明确被引用**的观点，不能是文章作者自己的分析
2. 专家名字可能以中文、英文或别名出现
3. 如果内容是关于某位专家的**报道**（如"洪灝表示..."、"据 Jurrien Timmer 分析..."），也算引用
4. 如果专家只是被提及名字但没有表达观点（如"洪灝出席了会议"），不算引用
5. 对于播客/访谈内容，要识别出被采访的专家

请返回 JSON 格式：
{
  "identified_experts": [
    {
      "name": "专家中文名",
      "confidence": 0.95,
      "quoted_text": "内容中引用该专家观点的具体段落（50-200字）",
      "reasoning": "为什么认为这段内容引用了该专家的观点"
    }
  ]
}

如果没有识别到任何专家观点，返回 {"identified_experts": []}

--- 内容开始 ---
${contentText.slice(0, 8000)}
--- 内容结束 ---`

  try {
    const res = await withTimeout(fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${kimiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'moonshot-v1-32k',
        messages: [
          { role: 'system', content: '你是一个精准的财经内容分析助手，擅长识别文章中引用的专家观点。只返回 JSON，不要添加任何解释。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    }), FETCH_TIMEOUT_MS)

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return []

    const parsed = JSON.parse(match[0])
    return (parsed.identified_experts || []).filter((e: any) => e.confidence >= 0.6)
  } catch (err) {
    console.error('[identifyExpertInContent] Error:', err)
    return []
  }
}

/**
 * 从 Brave Search 结果中获取页面全文内容
 * 用于补充 RSS/NewsAPI 只抓到摘要的情况
 */
export async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const res = await withTimeout(fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 AlphaInsight/2.0' }
    }), FETCH_TIMEOUT_MS)
    const html = await res.text()

    // 简单的 HTML 到文本提取
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text.slice(0, 15000)
  } catch (err) {
    console.error(`[fetchPageContent] Error fetching ${url}:`, err)
    return null
  }
}
