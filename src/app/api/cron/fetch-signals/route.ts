import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  discoverViaBraveSearch,
  discoverViaYouTube,
  discoverViaNewsAPI,
  fetchPageContent,
  identifyExpertInContentSimple,
  contentFingerprint,
  titleSimilarity,
  isInvestmentRelated,
  isEducationalContent,
  isEducationalPage,
  isBlacklistedExpert,
} from '@/lib/content-fetcher'
import { successResponse, errorResponse } from '@/lib/api-helpers'

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-32k'

const HORIZON_DAYS: Record<string, number> = {
  immediate: 3, '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365, structural: 730
}

const ASSET_ALIASES: Record<string, string[]> = {
  SPY: ['美股', 's&p', '标普', 'sp500', 's&p 500'],
  QQQ: ['纳指', 'nasdaq', '科技股', 'qqq'],
  EWH: ['港股', '恒生', 'hong kong', 'hsi', 'hang seng'],
  FXI: ['中国大盘', '沪深', 'a股', '大盘', 'ftse china', '富时中国'],
  MCHI: ['msci china', '中国市场', 'msci 中国'],
  KWEB: ['互联网', '腾讯', 'tencent', '阿里', 'alibaba', '百度', 'baidu', '中国互联网', '中概互联'],
  CQQQ: ['中国科技', 'china tech', '中概科技'],
  GLD: ['黄金', 'gold', '贵金属'],
  SLV: ['白银', 'silver'],
  COPX: ['铜', 'copper', '铜矿'],
  URA: ['铀', 'uranium', '核能'],
  TLT: ['美债', '国债', 'treasury', 'bond', '债券', '长期国债'],
  IBIT: ['比特币', 'bitcoin', 'btc', 'crypto'],
  SMH: ['半导体', '芯片', 'semiconductor', 'nvda', 'nvidia', 'tsmc', '台积电'],
  SOXX: ['半导体', '芯片', 'semiconductor', 'chip'],
  EEM: ['新兴市场', 'emerging markets'],
  INDA: ['印度', 'india', 'sensex', 'nifty'],
  VNM: ['越南', 'vietnam'],
  KSA: ['沙特', 'saudi arabia', '沙特阿拉伯'],
  ASEA: ['东南亚', 'southeast asia', '东盟'],
  EWJ: ['日本', '日经', 'nikkei', 'japan'],
  VGK: ['欧洲', 'europe', 'eu', '斯托克'],
  EWY: ['韩国', '三星', 'samsung', 'kospi', 'korea'],
  XLE: ['石油', '原油', 'oil', 'energy', '能源'],
  UNG: ['天然气', 'natural gas'],
  VNQ: ['reits', '房地产', 'real estate', '地产'],
  UUP: ['美元', 'us dollar', 'dxy', '美元指数'],
  TAN: ['光伏', '太阳能', 'solar'],
  ARKK: ['ark', '创新', 'innovation', '木头姐'],
  IWM: ['罗素', 'russell', '小盘', 'small cap'],
  EWZ: ['巴西', 'brazil', 'bovespa'],
  RSX: ['俄罗斯', 'russia'],
  EWT: ['台湾', 'taiwan', '台积电'],
}

function buildSystemPrompt(expert: any) {
  return `You are a precision financial signal extractor for ${expert.name}.

CORE RULES:
1. Extract ONLY views EXPLICITLY stated by ${expert.name} in the content.
2. A valid signal REQUIRES: (a) named asset/ETF, (b) explicit direction (bullish/bearish), (c) stated reason.
3. If conviction < 5, exclude. If confidence_in_extraction < 0.6, exclude.
4. Return ONLY valid JSON, no prose.
5. If no valid investment views found, return {"views": []}.
6. 【EDUCATIONAL FILTER】If content explains what ETF is, types of ETF, or general investment education → return {"views": []}

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
 * 主抓取流程 - 新架构
 * 1. 发现内容 (Brave Search + NewsAPI + YouTube)
 * 2. 去重
 * 3. 抓取网页全文
 * 4. 识别专家
 * 5. 提取信号
 * 6. 保存
 */
export async function GET(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret')
  const envCronSecret = process.env.CRON_SECRET || ''
  
  // 诊断日志
  console.log('[Auth] Header secret length:', cronSecret?.length || 0)
  console.log('[Auth] Env secret length:', envCronSecret.length)
  console.log('[Auth] Header first 10:', cronSecret?.slice(0, 10))
  console.log('[Auth] Env first 10:', envCronSecret.slice(0, 10))
  console.log('[Auth] Match:', cronSecret === envCronSecret)
  
  if (cronSecret !== envCronSecret) {
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
    
    // 已处理的 URL 和内容指纹集合（去重用）
    const processedUrls = new Set<string>()
    const processedFingerprints = new Set<string>()

    console.log(`[FetchSignals] Starting fetch for ${experts.length} experts, since ${since.toISOString()}`)

    for (const expert of experts) {
      if (isBlacklistedExpert(expert.name)) {
        console.log(`[${expert.name}] Skipped (blacklisted)`)
        continue
      }

      console.log(`\n========== ${expert.name} ==========`)

      // ========== Phase 1: 内容发现 ==========
      const discoveredItems: Array<{
        url: string
        title: string
        source: string
        publishedAt: Date | null
        description?: string
      }> = []

      // 构建搜索查询
      const isChinese = /[\u4e00-\u9fff]/.test(expert.name)
      const searchQueries = isChinese
        ? [
            `${expert.name} 股评 港股`,
            `${expert.name} 财经 分析`,
            `${expert.name} 市场 观点`,
          ]
        : [
            `${expert.name} market analysis`,
            `${expert.name} investment view`,
            `${expert.name} stock market`,
          ]

      // 1a. Brave Search - 主要发现源（返回直接 URL）
      if (BRAVE_KEY) {
        for (const query of searchQueries.slice(0, 2)) {
          try {
            const items = await discoverViaBraveSearch(query, BRAVE_KEY, since)
            discoveredItems.push(...items)
            console.log(`[${expert.name}] Brave Search "${query}": ${items.length} items`)
          } catch (err) {
            console.error(`[${expert.name}] Brave Search error:`, (err as Error).message)
          }
        }
      }

      // 1b. NewsAPI
      if (NEWSAPI_KEY) {
        const lang = isChinese ? 'zh' : 'en'
        for (const query of searchQueries.slice(0, 1)) {
          try {
            const items = await discoverViaNewsAPI(query, NEWSAPI_KEY, since, lang)
            discoveredItems.push(...items)
            console.log(`[${expert.name}] NewsAPI "${query}" (lang=${lang}): ${items.length} items`)
          } catch (err) {
            console.error(`[${expert.name}] NewsAPI error:`, (err as Error).message)
          }
        }
      }

      // 1c. YouTube 搜索
      if (YOUTUBE_KEY) {
        for (const query of searchQueries.slice(0, 1)) {
          try {
            const items = await discoverViaYouTube(query, YOUTUBE_KEY, since)
            discoveredItems.push(...items)
            console.log(`[${expert.name}] YouTube "${query}": ${items.length} items`)
          } catch (err) {
            console.error(`[${expert.name}] YouTube error:`, (err as Error).message)
          }
        }
      }

      console.log(`[${expert.name}] Total discovered: ${discoveredItems.length} items`)

      // ========== Phase 2: 去重 ==========
      const uniqueItems = discoveredItems.filter(item => {
        // URL 去重
        const normalizedUrl = item.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
        if (processedUrls.has(normalizedUrl)) return false
        processedUrls.add(normalizedUrl)
        return true
      })

      // 标题相似度去重
      const finalItems: typeof uniqueItems = []
      for (const item of uniqueItems) {
        let isDuplicate = false
        for (const existing of finalItems) {
          if (titleSimilarity(item.title, existing.title) > 0.7) {
            isDuplicate = true
            break
          }
        }
        if (!isDuplicate) {
          finalItems.push(item)
        }
      }

      console.log(`[${expert.name}] After dedup: ${finalItems.length} items`)

      // ========== Phase 3: 抓取内容 + 识别专家 + 提取信号 ==========
      let expertContentCount = 0
      let signalCount = 0

      for (const item of finalItems.slice(0, 15)) { // 每个专家最多处理 15 条
        try {
          // 跳过教育页面
          if (isEducationalPage(item.url)) {
            console.log(`[${expert.name}] Skip educational page: ${item.url.slice(0, 60)}`)
            continue
          }

          // 抓取内容
          let contentText = item.description || ''
          let pageTitle = item.title

          // 如果是 YouTube，用标题+描述作为内容
          if (!item.url.includes('youtube.com') && !item.url.includes('youtu.be')) {
            const pageContent = await fetchPageContent(item.url)
            if (pageContent) {
              pageTitle = pageContent.title || item.title
              contentText = pageContent.content
            }
          }

          if (!contentText || contentText.length < 200) {
            console.log(`[${expert.name}] Content too short: ${item.url.slice(0, 60)}`)
            continue
          }

          // 内容指纹去重
          const fingerprint = contentFingerprint(contentText)
          if (processedFingerprints.has(fingerprint)) {
            console.log(`[${expert.name}] Content fingerprint duplicate`)
            continue
          }
          processedFingerprints.add(fingerprint)

          // 检查是否投资相关
          if (!isInvestmentRelated(contentText)) {
            console.log(`[${expert.name}] Not investment related: ${pageTitle.slice(0, 60)}`)
            continue
          }

          // 检查是否教育内容
          if (isEducationalContent(contentText)) {
            console.log(`[${expert.name}] Educational content: ${pageTitle.slice(0, 60)}`)
            continue
          }

          // ========== Phase 4: 专家识别（简化）==========
          const { isMatch, confidence, matchedName } = identifyExpertInContentSimple(
            contentText,
            { name: expert.name, nameEn: expert.nameEn, aliases: expert.aliases }
          )

          if (!isMatch) {
            console.log(`[${expert.name}] Expert not found in content: ${pageTitle.slice(0, 60)}`)
            continue
          }

          expertContentCount++
          console.log(`[${expert.name}] ✓ Content matched (confidence: ${confidence}): ${pageTitle.slice(0, 60)}`)

          // ========== Phase 5: 信号提取 ==========
          const systemPrompt = buildSystemPrompt(expert)
          const userMsg = `Content about ${expert.name} — published: ${item.publishedAt ? item.publishedAt.toISOString() : 'unknown'}
Source: ${item.url}
Title: ${pageTitle}

--- BEGIN CONTENT ---
${contentText.slice(0, 12000)}
--- END CONTENT ---

Extract the top 1-2 highest-conviction investment views from ${expert.name}. If content is educational (explaining ETF types, definitions, etc.), return empty views.`

          const parsed = await callKimi([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg }
          ], KIMI_KEY)

          if (!parsed?.views?.length) {
            console.log(`[${expert.name}] No signals extracted from: ${pageTitle.slice(0, 60)}`)
            continue
          }

          for (const view of parsed.views) {
            if ((view.confidence_in_extraction || 0) < 0.6) continue
            if (view.direction === 'neutral') continue
            if ((view.conviction || 0) < 5) continue

            // 反幻觉检查
            const validAssets = (view.target_assets || []).filter((a: string) => assetMentionedInText(a, contentText))
            if (!validAssets.length) continue

            // 解析 ETF
            let etfTickers = validAssets.filter((a: string) => /^[A-Z]{2,6}$/.test(a.trim().toUpperCase()))
            if (!etfTickers.length) {
              for (const [ticker, aliases] of Object.entries(ASSET_ALIASES)) {
                if (aliases.some(a => contentText.toLowerCase().includes(a))) {
                  etfTickers.push(ticker)
                }
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
                sourcePlatform: item.source.includes('YouTube') ? 'youtube' : 'web',
                sourceUrl: item.url,
                sourceVerificationStatus: confidence >= 0.8 ? 'verified' : 'unverified',
                rawSummary: (view.claim || '').slice(0, 300),
                isManualInjection: false,
                signalTimestamp: item.publishedAt || new Date(),
                expiresAt,
              }
            })

            signalCount++
            allIngested.push({
              expert: expert.name,
              claim: view.claim,
              direction: view.direction,
              etfTickers,
              source: item.source,
              title: pageTitle.slice(0, 80),
            })

            console.log(`[${expert.name}] ✓ Signal: ${view.direction} ${etfTickers.join(',')} | ${view.claim?.slice(0, 60)}`)
          }
        } catch (err) {
          console.error(`[${expert.name}] Error processing ${item.url.slice(0, 60)}:`, (err as Error).message)
        }
      }

      console.log(`[${expert.name}] Summary: ${expertContentCount} matched content, ${signalCount} signals extracted`)
    }

    // ========== 统计报告 ==========
    const breakdown = allIngested.reduce((acc: any, item) => {
      const key = item.expert
      if (!acc[key]) acc[key] = { count: 0, sources: {} }
      acc[key].count++
      const src = item.source || 'unknown'
      acc[key].sources[src] = (acc[key].sources[src] || 0) + 1
      return acc
    }, {})

    return successResponse({
      expertsProcessed: experts.length,
      signalsCreated: allIngested.length,
      breakdown,
      processedUrls: processedUrls.size,
      processedFingerprints: processedFingerprints.size,
    })
  } catch (err) {
    console.error('[FetchSignals] Fatal error:', err)
    return errorResponse('Failed to fetch signals', 500, err)
  }
}
