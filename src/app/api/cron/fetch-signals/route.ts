import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  fetchYouTubeChannel,
  fetchRSSFeed,
  fetchNewsAPI,
  fetchBraveSearch,
  fetchOpenCollectionSources,
  identifyExpertInContent,
  fetchPageContent,
  isBlacklistedExpert,
  filterInvestmentRelevance,
} from '@/lib/content-fetcher'
import { successResponse, errorResponse } from '@/lib/api-helpers'

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-32k'

const HORIZON_DAYS: Record<string, number> = {
  immediate: 3, '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365, structural: 730
}

const STYLE_GUIDANCE: Record<string, string> = {
  principled_macro: 'reasons from macro first principles. Prioritize structural theses with data support.',
  emotional_momentum: 'is emotionally expressive and momentum-driven. Watch for overconfidence.',
  cryptic_contrarian: 'speaks obliquely and often implies the opposite of consensus.',
  quantitative: 'relies on models and precise data. Extract numerical claims.',
  fundamental_analyst: 'focuses on valuations, earnings, and fundamentals.',
  narrative_driven: 'builds narratives around central theses.',
  technical_chartist: 'reads price action and patterns. Extract specific price levels.',
}

const ASSET_ALIASES: Record<string, string[]> = {
  // 美股大盘
  SPY: ['美股', 's&p', '标普', 'sp500', 's&p 500'],
  QQQ: ['纳指', 'nasdaq', '科技股', 'qqq'],
  // 中国/香港
  EWH: ['港股', '恒生', 'hong kong', 'hsi', 'hang seng'],
  FXI: ['中国大盘', '沪深', 'a股', '大盘', 'ftse china', '富时中国'],
  MCHI: ['msci china', '中国市场', 'msci 中国'],
  KWEB: ['互联网', '腾讯', 'tencent', '阿里', 'alibaba', '百度', 'baidu', '中国互联网', '中概互联'],
  CQQQ: ['中国科技', 'china tech', '中概科技'],
  // 商品
  GLD: ['黄金', 'gold', '贵金属'],
  SLV: ['白银', 'silver'],
  COPX: ['铜', 'copper', '铜矿'],
  URA: ['铀', 'uranium', '核能'],
  // 债券
  TLT: ['美债', '国债', 'treasury', 'bond', '债券', '长期国债'],
  // 加密货币
  IBIT: ['比特币', 'bitcoin', 'btc', 'crypto'],
  // 科技
  SMH: ['半导体', '芯片', 'semiconductor', 'nvda', 'nvidia', 'tsmc', '台积电'],
  SOXX: ['半导体', '芯片', 'semiconductor', 'chip'],
  // 新兴市场
  EEM: ['新兴市场', 'emerging markets'],
  INDA: ['印度', 'india', 'sensex', 'nifty'],
  VNM: ['越南', 'vietnam'],
  KSA: ['沙特', 'saudi arabia', '沙特阿拉伯'],
  ASEA: ['东南亚', 'southeast asia', '东盟'],
  // 发达市场
  EWJ: ['日本', '日经', 'nikkei', 'japan'],
  VGK: ['欧洲', 'europe', 'eu', '斯托克'],
  EWY: ['韩国', '三星', 'samsung', 'kospi', 'korea'],
  // 能源
  XLE: ['石油', '原油', 'oil', 'energy', '能源'],
  UNG: ['天然气', 'natural gas'],
  // REITs
  VNQ: ['reits', '房地产', 'real estate', '地产'],
  // 外汇
  UUP: ['美元', 'us dollar', 'dxy', '美元指数'],
  // 其他
  TAN: ['光伏', '太阳能', 'solar'],
  ARKK: ['ark', '创新', 'innovation', '木头姐'],
  IWM: ['罗素', 'russell', '小盘', 'small cap'],
  EWZ: ['巴西', 'brazil', 'bovespa'],
  RSX: ['俄罗斯', 'russia'],
  EWT: ['台湾', 'taiwan', '台积电'],
}

function buildSystemPrompt(expert: any) {
  const style = expert.communicationStyle || 'fundamental_analyst'
  const guidance = STYLE_GUIDANCE[style] || ''
  const bias = expert.biasProfile as any || {}
  const bull = (bias.permabullSectors || []).join(', ') || 'none on record'
  const bear = (bias.permabearSectors || []).join(', ') || 'none on record'

  return `You are a precision financial signal extractor for ${expert.name}${expert.institution ? ' (' + expert.institution + ')' : ''}.
EXPERT PROFILE: style=${style}. This expert ${guidance}. Bullish on: ${bull}. Bearish on: ${bear}.

CORE RULES:
1. Extract ONLY views EXPLICITLY stated by ${expert.name}. Do NOT infer views not in the text.
2. A valid signal REQUIRES: (a) named asset/ETF, (b) explicit direction (bullish/bearish), (c) stated reason.
3. If conviction < 5, exclude. If confidence_in_extraction < 0.6, exclude.
4. For interviews: only extract interviewee's views, not the host's.
5. Return ONLY valid JSON, no prose.
6. 【CONTENT TYPE VALIDATION】Purely political/social news with NO investment stance → return {"views": []}
7. 【FRESHNESS】Only extract views about current market conditions. If content is clearly older than 14 days, return {"views": []}.
8. 【PRIORITY】Only extract the TOP 1-2 most important views with specific assets and clear direction.
9. 【EDUCATIONAL FILTER】If content explains what ETF is, types of ETF, or general investment education → return {"views": []}

OUTPUT FORMAT:
{"views":[{"claim":"...","evidence":"...","target_assets":["ticker or name"],"direction":"bullish|bearish|neutral","conviction":7,"time_horizon":"immediate|1w|1m|3m|6m|1y|structural","thesis_type":"fundamental|macro|technical|flow_based|sentiment|geopolitical","hedging_level":3,"emotional_tone":"calm|urgent|panicked|greedy|sarcastic|dismissive|neutral","specificity":6,"themes":["theme"],"confidence_in_extraction":0.8}]}`
}

function assetMentionedInText(asset: string, text: string): boolean {
  if (!asset || !text) return false
  const lower = text.toLowerCase()
  if (lower.includes(asset.toLowerCase())) return true
  const aliases = ASSET_ALIASES[asset.toUpperCase()] || []
  return aliases.some(a => lower.includes(a))
}

function directionToSentiment(direction: string, conviction: number): number {
  const norm = Math.min(10, Math.max(1, conviction || 5)) / 10
  if (direction === 'bullish') return norm
  if (direction === 'bearish') return -norm
  return 0
}

async function callKimi(messages: any[], kimiKey: string) {
  const res = await fetch(KIMI_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${kimiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: KIMI_MODEL, messages, temperature: 0.1, max_tokens: 3000 })
  })
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

/**
 * 处理单个内容项，提取信号并保存
 */
async function processContentItem(
  item: any,
  expert: any,
  kimiKey: string,
  allIngested: any[],
  sourceVerificationStatus: string = 'unverified'
) {
  const systemPrompt = buildSystemPrompt(expert)
  const userMsg = `Content from ${expert.name} — ${item.publishedAt ? 'published: ' + item.publishedAt.toISOString() : '[DATE_UNKNOWN]'}
Source: ${item.sourceUrl || 'unknown'}
${item.openCollectionSource ? `Open Collection Source: ${item.openCollectionSource}` : ''}

--- BEGIN CONTENT ---
${item.contentText.slice(0, 15000)}
--- END CONTENT ---

Extract the top 1-2 highest-conviction investment views. If content is educational (explaining ETF types, definitions, etc.), return empty views.`

  const parsed = await callKimi([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMsg }
  ], kimiKey)

  if (!parsed?.views?.length) return

  for (const view of parsed.views) {
    if ((view.confidence_in_extraction || 0) < 0.6) continue
    if (view.direction === 'neutral') continue
    if ((view.conviction || 0) < 5) continue

    // Check if educational content slipped through
    const claimLower = (view.claim || '').toLowerCase()
    if (claimLower.includes('etf') && (claimLower.includes('类型') || claimLower.includes('分为') || claimLower.includes('什么是'))) {
      console.log(`[${expert.name}] Filtering educational claim: ${view.claim}`)
      continue
    }

    // Anti-hallucination check
    const validAssets = (view.target_assets || []).filter((a: string) => assetMentionedInText(a, item.contentText))
    if (!validAssets.length) continue

    // Resolve ETF tickers
    let etfTickers = validAssets.filter((a: string) => /^[A-Z]{2,6}$/.test(a.trim().toUpperCase()))
    const knownTickers = Object.keys(ASSET_ALIASES)
    const unknownAssets: string[] = []
    
    if (!etfTickers.length) {
      for (const [ticker, aliases] of Object.entries(ASSET_ALIASES)) {
        if (aliases.some(a => item.contentText.toLowerCase().includes(a))) {
          etfTickers.push(ticker)
        }
      }
    }
    
    // 记录专家提到但系统未覆盖的资产
    const allMentionedAssets = view.target_assets || []
    for (const asset of allMentionedAssets) {
      const upperAsset = asset.trim().toUpperCase()
      // 如果是有效的 ETF ticker 但不在我们的列表中
      if (/^[A-Z]{2,6}$/.test(upperAsset) && !knownTickers.includes(upperAsset)) {
        unknownAssets.push(upperAsset)
      }
      // 如果是中文资产名称，检查是否有别名匹配
      if (!/^[A-Z]{2,6}$/.test(asset) && !Object.values(ASSET_ALIASES).some(aliases => aliases.some(a => item.contentText.toLowerCase().includes(a.toLowerCase())))) {
        // 检查是否已经在 unknownAssets 中（避免重复记录中文名称）
        if (!unknownAssets.includes(asset)) {
          unknownAssets.push(asset)
        }
      }
    }
    
    // 保存到 SuggestedETF（去重，避免同一专家同一资产重复记录）
    for (const unknown of unknownAssets.slice(0, 3)) { // 最多记录3个
      try {
        const existing = await prisma.suggestedETF.findFirst({
          where: {
            ticker: unknown,
            mentionedBy: expert.name,
            status: 'pending',
          }
        })
        if (!existing) {
          await prisma.suggestedETF.create({
            data: {
              ticker: unknown,
              mentionedBy: expert.name,
              expertId: expert.id,
              reason: view.claim?.slice(0, 500),
              sourceUrl: item.sourceUrl,
              status: 'pending',
            }
          })
          console.log(`[SuggestedETF] New asset mentioned by ${expert.name}: ${unknown}`)
        }
      } catch (err) {
        console.error(`[SuggestedETF] Error recording ${unknown}:`, err)
      }
    }

    const conviction = Math.min(10, Math.max(1, Math.round(view.conviction || 5)))
    const horizon = HORIZON_DAYS[view.time_horizon] !== undefined ? view.time_horizon : '1m'
    const expiresAt = new Date(Date.now() + HORIZON_DAYS[horizon] * 86400000)
    const rawSentiment = directionToSentiment(view.direction, conviction)

    await prisma.signal.create({
      data: {
        expertId: expert.id,
        etfCode: etfTickers[0] || null,
        etfTickers,
        sentimentDirection: view.direction,
        rawSentiment,
        isCalibrated: false,
        confidenceScore: view.confidence_in_extraction || 0.7,
        convictionScore: conviction,
        timeHorizon: horizon,
        thesisType: view.thesis_type || 'macro',
        hedgingLevel: Math.min(10, Math.max(0, view.hedging_level ?? 3)),
        emotionalTone: view.emotional_tone || 'neutral',
        specificity: Math.min(10, Math.max(0, view.specificity ?? 5)),
        themes: view.themes || [],
        extractedClaims: [view.claim].filter(Boolean),
        supportingEvidence: view.evidence ? [view.evidence] : [],
        sourcePlatform: item.sourceType,
        sourceUrl: item.sourceUrl,
        sourceVerificationStatus: sourceVerificationStatus,
        rawSummary: (view.claim || '').slice(0, 300),
        isManualInjection: false,
        signalTimestamp: item.publishedAt || new Date(),
        expiresAt,
      }
    })

    allIngested.push({
      expert: expert.name,
      claim: view.claim,
      direction: view.direction,
      etfTickers,
      source: item.sourceType,
      openCollection: item.openCollectionSource || null,
    })
  }
}

export async function GET(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return errorResponse('Unauthorized', 401)
  }

  try {
    const KIMI_KEY = process.env.KIMI_API_KEY
    const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY
    const BRAVE_KEY = process.env.BRAVE_SEARCH_KEY
    const NEWSAPI_KEY = process.env.NEWSAPI_KEY
    if (!KIMI_KEY) return errorResponse('KIMI_API_KEY not configured', 500)

    const experts = await prisma.expert.findMany({ where: { isActive: true } })
    const allIngested: any[] = []
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)

    // ==================== Phase 1: 专家专属源抓取 ====================
    console.log(`[FetchSignals] Phase 1: Expert-specific sources (${experts.length} experts)`)

    for (const expert of experts) {
      if (isBlacklistedExpert(expert.name)) {
        console.log(`[${expert.name}] Skipped (blacklisted)`)
        continue
      }

      const sources = (expert.contentSources as any[]) || []
      if (!sources.length) {
        console.log(`[${expert.name}] No content sources configured`)
        continue
      }

      const expertContent: any[] = []

      for (const source of sources) {
        // 跳过占位符
        if (source.identifier && source.identifier.startsWith('PLACEHOLDER_')) {
          console.log(`[${expert.name}] Skipping placeholder source: ${source.identifier}`)
          continue
        }

        let items: any[] = []
        try {
          switch (source.type) {
            case 'youtube_channel':
              if (YOUTUBE_KEY) {
                items = await fetchYouTubeChannel(source.identifier, YOUTUBE_KEY, since)
                console.log(`[${expert.name}] YouTube: ${items.length} items`)
              }
              break
            case 'rss_feed':
            case 'podcast_rss':
              items = await fetchRSSFeed(source.identifier, expert.name, since)
              console.log(`[${expert.name}] RSS (${source.identifier}): ${items.length} items`)
              break
            case 'news_api':
              if (NEWSAPI_KEY) {
                // 根据专家名字判断语言：中文专家用中文搜索
                const isChineseExpert = /[\u4e00-\u9fff]/.test(expert.name)
                const lang = isChineseExpert ? 'zh' : 'en'
                items = await fetchNewsAPI(source.identifier, NEWSAPI_KEY, since, lang)
                console.log(`[${expert.name}] NewsAPI (lang=${lang}): ${items.length} items`)
              }
              break
            case 'brave_search':
              if (BRAVE_KEY) {
                const searchResults = await fetchBraveSearch(source.identifier, BRAVE_KEY)
                // Brave Search 返回的是搜索结果，需要获取页面内容
                for (const result of searchResults.slice(0, 3)) { // 限制前3个结果
                  try {
                    const pageContent = await fetchPageContent(result.url)
                    if (pageContent) {
                      const relevance = filterInvestmentRelevance(pageContent)
                      if (relevance.pass) {
                        items.push({
                          sourceType: 'brave_search',
                          sourceUrl: result.url,
                          contentText: pageContent,
                          publishedAt: new Date(),
                          title: result.title,
                          verificationStatus: 'unverified',
                        })
                      }
                    }
                  } catch (err) {
                    console.log(`[${expert.name}] Brave page fetch failed: ${result.url}`)
                  }
                }
                console.log(`[${expert.name}] Brave Search: ${items.length} items`)
              }
              break
          }
        } catch (err) {
          console.error(`[${expert.name}] Error fetching ${source.type}:`, err)
        }
        expertContent.push(...items)
      }

      // 提取信号
      for (const item of expertContent) {
        await processContentItem(item, expert, KIMI_KEY, allIngested, item.verificationStatus || 'unverified')
      }
    }

    // ==================== Phase 2: 开放式收集 (Open Collection) ====================
    console.log('[FetchSignals] Phase 2: Open Collection from general financial media')

    const openCollectionItems = await fetchOpenCollectionSources(since)
    console.log(`[OpenCollection] Total items to process: ${openCollectionItems.length}`)

    // 批量处理，每批 5 个内容项进行专家识别（避免 Kimi API 过载）
    const batchSize = 5
    for (let i = 0; i < openCollectionItems.length; i += batchSize) {
      const batch = openCollectionItems.slice(i, i + batchSize)
      console.log(`[OpenCollection] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(openCollectionItems.length / batchSize)}`)

      for (const item of batch) {
        try {
          // 用 Kimi 识别内容中是否包含目标专家的观点
          const identifiedExperts = await identifyExpertInContent(
            item.contentText,
            experts.map(e => ({ name: e.name, nameEn: e.nameEn, aliases: e.aliases })),
            KIMI_KEY
          )

          if (!identifiedExperts.length) {
            console.log(`[OpenCollection] No expert identified in: ${item.title?.slice(0, 60)}...`)
            continue
          }

          for (const identified of identifiedExperts) {
            // 找到对应的专家
            const matchedExpert = experts.find(e =>
              e.name === identified.name ||
              e.nameEn === identified.name ||
              e.aliases.includes(identified.name)
            )

            if (!matchedExpert) {
              console.log(`[OpenCollection] Identified expert "${identified.name}" not in active list`)
              continue
            }

            console.log(`[OpenCollection] ✓ ${matchedExpert.name} identified in "${item.title?.slice(0, 60)}..." (confidence: ${identified.confidence})`)

            // 用识别到的专家观点段落替换原始内容，提高提取精度
            const enrichedItem = {
              ...item,
              contentText: `${identified.quotedText}\n\n[上下文]\n${item.contentText.slice(0, 5000)}`,
            }

            await processContentItem(
              enrichedItem,
              matchedExpert,
              KIMI_KEY,
              allIngested,
              'open_collection_verified' // 开放式收集 + Kimi 验证
            )
          }
        } catch (err) {
          console.error('[OpenCollection] Error processing item:', err)
        }
      }
    }

    // ==================== 统计报告 ====================
    const breakdown = allIngested.reduce((acc: any, item) => {
      const key = item.expert
      if (!acc[key]) acc[key] = { count: 0, sources: {} }
      acc[key].count++
      const src = item.openCollection ? `open:${item.openCollection}` : item.source
      acc[key].sources[src] = (acc[key].sources[src] || 0) + 1
      return acc
    }, {})

    const openCollectionCount = allIngested.filter(i => i.openCollection).length
    const directSourceCount = allIngested.filter(i => !i.openCollection).length

    return successResponse({
      expertsProcessed: experts.length,
      signalsCreated: allIngested.length,
      fromDirectSources: directSourceCount,
      fromOpenCollection: openCollectionCount,
      breakdown,
    })
  } catch (err) {
    console.error('[FetchSignals] Fatal error:', err)
    return errorResponse('Failed to fetch signals', 500, err)
  }
}
