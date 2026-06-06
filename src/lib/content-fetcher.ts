const FETCH_TIMEOUT_MS = 15000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

// User-Agent 轮换 - 参考 finnews 反爬虫策略
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// 指数退避重试 - 参考 finnews
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Connection': 'keep-alive',
          ...options.headers,
        },
      })
      
      clearTimeout(timeoutId)
      
      if (res.status === 429 || res.status === 403) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt)
        console.log(`[Retry] ${url} status ${res.status}, waiting ${delay}ms (attempt ${attempt + 1}/${retries + 1})`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      
      return res
    } catch (err) {
      lastError = err as Error
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt)
        console.log(`[Retry] ${url} error: ${lastError.message}, waiting ${delay}ms (attempt ${attempt + 1}/${retries + 1})`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  
  throw lastError || new Error(`Failed to fetch ${url} after ${retries + 1} attempts`)
}

// ==================== 内容发现层 (Discovery) ====================

/**
 * 通过 Brave Search API 搜索内容 - 主要发现源
 * 返回直接可访问的网页 URL
 */
export async function discoverViaBraveSearch(query: string, braveKey: string, since: Date): Promise<Array<{url: string; title: string; source: string; publishedAt: Date | null; description: string}>> {
  const results: Array<{url: string; title: string; source: string; publishedAt: Date | null; description: string}> = []
  
  try {
    const res = await fetchWithRetry(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&freshness=pw`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveKey,
        },
      },
      1
    )
    
    const data = await res.json()
    
    for (const item of (data.web?.results || [])) {
      if (!item.url || !item.title) continue
      
      // 过滤掉社交媒体、视频平台（这些用专门 API）
      const url = item.url
      if (url.includes('youtube.com') || url.includes('youtu.be') || 
          url.includes('facebook.com') || url.includes('twitter.com') ||
          url.includes('x.com') || url.includes('instagram.com')) {
        continue
      }
      
      results.push({
        url: item.url,
        title: item.title,
        description: item.description || '',
        source: 'BraveSearch',
        publishedAt: new Date(), // Brave 不提供日期，用当前时间
      })
    }
    
    console.log(`[BraveSearch] "${query}": ${results.length} results`)
  } catch (err) {
    console.error(`[BraveSearch] Error for "${query}":`, (err as Error).message)
  }
  
  return results
}

/**
 * 通过 YouTube Data API 搜索专家视频
 */
export async function discoverViaYouTube(query: string, youtubeKey: string, since: Date): Promise<Array<{url: string; title: string; source: string; publishedAt: Date | null; description: string}>> {
  const results: Array<{url: string; title: string; source: string; publishedAt: Date | null; description: string}> = []
  
  try {
    const publishedAfter = since.toISOString()
    const res = await fetchWithRetry(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=date&maxResults=10&publishedAfter=${publishedAfter}&key=${youtubeKey}`,
      {},
      1
    )
    
    const data = await res.json()
    
    for (const item of (data.items || [])) {
      const videoId = item.id?.videoId
      if (!videoId) continue
      
      const snippet = item.snippet || {}
      const title = snippet.title || ''
      const description = snippet.description || ''
      const publishedAt = snippet.publishedAt ? new Date(snippet.publishedAt) : null
      
      if (!title) continue
      
      results.push({
        url: `https://youtube.com/watch?v=${videoId}`,
        title,
        description,
        source: 'YouTube',
        publishedAt,
      })
    }
    
    console.log(`[YouTube] "${query}": ${results.length} results`)
  } catch (err) {
    console.error(`[YouTube] Error for "${query}":`, (err as Error).message)
  }
  
  return results
}

/**
 * 通过 NewsAPI 搜索内容
 */
export async function discoverViaNewsAPI(query: string, newsApiKey: string, since: Date, language: string = 'en'): Promise<Array<{url: string; title: string; source: string; publishedAt: Date | null; description: string}>> {
  const results: Array<{url: string; title: string; source: string; publishedAt: Date | null; description: string}> = []
  
  try {
    const fromDate = since.toISOString().split('T')[0]
    const langParam = language ? `&language=${language}` : ''
    const res = await fetchWithRetry(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&sortBy=publishedAt&pageSize=10${langParam}&apiKey=${newsApiKey}`,
      {},
      1
    )
    
    const data = await res.json()
    
    for (const article of (data.articles || [])) {
      if (!article.url || !article.title) continue
      
      results.push({
        url: article.url,
        title: article.title,
        description: article.description || '',
        source: `NewsAPI:${article.source?.name || 'unknown'}`,
        publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
      })
    }
    
    console.log(`[NewsAPI] "${query}" (lang=${language}): ${results.length} results`)
  } catch (err) {
    console.error(`[NewsAPI] Error for "${query}":`, (err as Error).message)
  }
  
  return results
}

// ==================== 内容抓取层 (Fetch) ====================

/**
 * 从 URL 抓取网页全文
 */
export async function fetchPageContent(url: string): Promise<{title: string; content: string; url: string} | null> {
  try {
    const res = await fetchWithRetry(url, {}, 2)
    
    if (!res.ok) {
      console.log(`[FetchPage] ${url} returned ${res.status}`)
      return null
    }
    
    const html = await res.text()
    
    // 提取标题
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''
    
    // 提取正文 - 多策略
    let content = ''
    
    // 策略 1: 找 article 标签
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    if (articleMatch) {
      content = htmlToText(articleMatch[1])
    }
    
    // 策略 2: 找 main 标签
    if (!content || content.length < 500) {
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
      if (mainMatch) {
        content = htmlToText(mainMatch[1])
      }
    }
    
    // 策略 3: 找常见内容容器
    if (!content || content.length < 500) {
      const contentPatterns = [
        /class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /class=["'][^"']*article[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /class=["'][^"']*post[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,
        /id=["']main-content["'][^>]*>([\s\S]*?)<\/div>/i,
        /class=["'][^"']*story[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
        /class=["'][^"']*entry[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      ]
      
      for (const pattern of contentPatterns) {
        const match = html.match(pattern)
        if (match) {
          const text = htmlToText(match[1])
          if (text.length > content.length) {
            content = text
          }
        }
      }
    }
    
    // 策略 4: 提取 body 中所有段落和 div 文本块
    if (!content || content.length < 500) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyMatch) {
        const body = bodyMatch[1]
        // 提取 p 标签
        const pMatches = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        const pText = pMatches.map(m => htmlToText(m[1])).filter(t => t.length > 20).join('\n\n')
        
        // 提取 div 中的文本块
        const divMatches = [...body.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi)]
        const divText = divMatches
          .map(m => htmlToText(m[1]))
          .filter(t => t.length > 50 && t.length < 2000)
          .join('\n\n')
        
        content = pText.length > divText.length ? pText : divText
        
        if (content.length < 500) {
          content = htmlToText(body)
        }
      }
    }
    
    // 策略 5: 提取 section 标签
    if (!content || content.length < 500) {
      const sectionMatches = [...html.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)]
      const sectionText = sectionMatches
        .map(m => htmlToText(m[1]))
        .filter(t => t.length > 100)
        .join('\n\n')
      if (sectionText.length > content.length) {
        content = sectionText
      }
    }
    
    // 清理
    content = content
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim()
    
    if (content.length < 200) {
      console.log(`[FetchPage] ${url} content too short (${content.length} chars)`)
      return null
    }
    
    console.log(`[FetchPage] ${url} -> ${content.length} chars`)
    return { title, content, url }
  } catch (err) {
    console.error(`[FetchPage] ${url}:`, (err as Error).message)
    return null
  }
}

/**
 * 简单 HTML 到文本转换
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, (match) => {
      try {
        return String.fromCharCode(parseInt(match.slice(2, -1), 10))
      } catch {
        return match
      }
    })
    .replace(/\s+/g, ' ')
    .trim()
}

// ==================== 专家识别层 (Identify) ====================

/**
 * 检查内容是否包含专家名字
 */
export function identifyExpertInContentSimple(
  content: string,
  expert: { name: string; nameEn?: string | null; aliases: string[] }
): { isMatch: boolean; confidence: number; matchedName: string } {
  const text = content.toLowerCase()
  const allNames = [expert.name, expert.nameEn, ...expert.aliases].filter(Boolean) as string[]
  
  for (const name of allNames) {
    if (!name) continue
    const lowerName = name.toLowerCase()
    
    if (text.includes(lowerName)) {
      const regex = new RegExp(`(?:^|[^a-zA-Z0-9\u4e00-\u9fff])${escapeRegex(lowerName)}(?:[^a-zA-Z0-9\u4e00-\u9fff]|$)`, 'i')
      if (regex.test(text)) {
        return { isMatch: true, confidence: 0.9, matchedName: name }
      }
      return { isMatch: true, confidence: 0.6, matchedName: name }
    }
  }
  
  return { isMatch: false, confidence: 0, matchedName: '' }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ==================== 去重层 (Deduplicate) ====================

/**
 * 内容指纹
 */
export function contentFingerprint(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\u4e00-\u9fff\w]/g, '')
    .slice(0, 200)
  
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

/**
 * 标题相似度
 */
export function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '')
  const na = normalize(a)
  const nb = normalize(b)
  
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.8
  
  const setA = new Set(na)
  const setB = new Set(nb)
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  
  return intersection.size / union.size
}

// ==================== 投资相关性过滤 ====================

const INVEST_KEYWORDS = [
  '買入', '賣出', '看好', '看淡', '增持', '減持', '沽出', '目標價', '估值', '股息',
  '牛市', '熊市', '反彈', '回調', '支撑', '阻力', '建倉', '清倉',
  'buy', 'sell', 'bullish', 'bearish', 'long', 'short', 'overweight', 'underweight',
  'target price', 'valuation', 'dividend', 'yield', 'rally', 'pullback',
  '看多', '看空', '做多', '做空', '加倉', '減倉',
  '港股', 'a股', '美股', '納指', '恒指', '上證', '標普', '納斯達克',
  '黃金', '原油', '比特幣', '國債', '美債', '中概股', 'etf',
  'hang seng', 'nasdaq', 's&p', 'dow jones', 'gold', 'oil', 'bitcoin',
  'stock', 'market', 'index', 'fund', 'portfolio', 'invest',
]

export function isInvestmentRelated(text: string): boolean {
  const lower = text.toLowerCase()
  const matches = INVEST_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()))
  return matches.length >= 2
}

// ==================== 旧函数兼容 ====================

export async function fetchYouTubeChannel(channelId: string, apiKey: string, since: Date) {
  if (channelId.startsWith('PLACEHOLDER_')) {
    return []
  }
  return discoverViaYouTube(`channel:${channelId}`, apiKey, since)
}

export async function fetchRSSFeed(feedUrl: string, expertName: string, since: Date) {
  console.log(`[Deprecated] fetchRSSFeed called for ${feedUrl}, using discovery instead`)
  return []
}

export async function fetchNewsAPI(query: string, newsApiKey: string, since: Date, language?: string) {
  return discoverViaNewsAPI(query, newsApiKey, since, language)
}

export async function fetchBraveSearch(query: string, braveKey: string) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const results = await discoverViaBraveSearch(query, braveKey, since)
  return results.map(r => ({ title: r.title, url: r.url, description: r.description }))
}

export async function fetchOpenCollectionSources(since: Date): Promise<any[]> {
  return []
}

export async function identifyExpertInContent(contentText: string, experts: any[], kimiKey: string) {
  const results: Array<{ name: string; confidence: number; quotedText: string; reasoning: string }> = []
  
  for (const expert of experts) {
    const { isMatch, confidence, matchedName } = identifyExpertInContentSimple(contentText, expert)
    if (isMatch) {
      const idx = contentText.toLowerCase().indexOf(matchedName.toLowerCase())
      const start = Math.max(0, idx - 200)
      const end = Math.min(contentText.length, idx + 200)
      const quotedText = contentText.slice(start, end)
      
      results.push({
        name: expert.name,
        confidence,
        quotedText,
        reasoning: `Content contains expert name "${matchedName}"`,
      })
    }
  }
  
  return results
}

export function isBlacklistedExpert(name: string): boolean {
  const blacklist = ['許佳龍', '许佳龙']
  return blacklist.some(b => name.includes(b) || b.includes(name))
}

export function filterInvestmentRelevance(text: string): { pass: boolean; reason: string } {
  if (!text || text.length < 100) return { pass: false, reason: 'too_short' }
  if (!isInvestmentRelated(text)) return { pass: false, reason: 'not_investment_related' }
  return { pass: true, reason: 'ok' }
}

export function isEducationalPage(url: string): boolean {
  if (!url) return false
  const educationalDomains = [
    'hkex.com.hk', 'hangseng.com', 'hsbc.com.hk', 'boc.hk', 'dbs.com.hk',
    'sc.com.hk', 'bankofchina.com', 'icbc.com.cn', 'ccb.com', 'abchina.com',
  ]
  const educationalPaths = [
    '/personal/investment/', '/wealth-management/', '/investment-guide/',
    '/etf-guide/', '/market-data/', '/securities-prices/', '/trading-guide/',
    '/investor-education/', '/learning-center/', '/faq/', '/help/',
    '/us-stock-etf-guide/',
  ]
  
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '')
    const lowerUrl = url.toLowerCase()
    if (educationalDomains.some(d => domain.includes(d))) return true
    if (educationalPaths.some(p => lowerUrl.includes(p))) return true
  } catch { /* ignore */ }
  return false
}

export function isEducationalContent(text: string): boolean {
  if (!text) return false
  const patterns = [
    'ETF 的两种类型', '被动型 ETF', '主动型 ETF', 'ETF 基础知识',
    '交易所买卖基金', '追踪指数', '跑赢大市', '主动管理基金',
    '被动管理基金', 'ETF 费用比率', 'ETF 管理费', '证监会认可',
    '集体投资计划', '全方位财富管理', '财富管理服务',
    '证券及期货事务监察委员会',
  ]
  const lower = text.toLowerCase()
  return patterns.some(pattern => lower.includes(pattern.toLowerCase()))
}
