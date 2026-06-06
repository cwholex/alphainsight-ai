import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions'
const KIMI_MODEL = 'moonshot-v1-32k'

const HORIZON_DAYS: Record<string, number> = {
  immediate: 3, '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365, structural: 730
}

const ASSET_ALIASES: Record<string, string[]> = {
  EWH: ['港股', '恒生', 'hong kong', 'hsi', 'hang seng'],
  FXI: ['中国大盘', '沪深', 'a股', '大盘', 'ftse china'],
  MCHI: ['msci china', '中国市场'],
  KWEB: ['互联网', '腾讯', 'tencent', '阿里', 'alibaba', '百度', 'baidu', '中国互联网'],
  SOXX: ['半导体', '芯片', 'semiconductor', 'chip'],
  SMH: ['半导体', '芯片', 'semiconductor', 'nvda', 'nvidia', 'tsmc', '台积电'],
  GLD: ['黄金', 'gold', '贵金属'],
  IBIT: ['比特币', 'bitcoin', 'btc'],
  ETHA: ['以太坊', 'ethereum', 'eth'],
  TLT: ['美债', '国债', 'treasury', 'bond', '债券'],
  SPY: ['美股', 's&p', '标普'],
  QQQ: ['纳指', 'nasdaq', '科技股'],
  EWJ: ['日本', '日经', 'nikkei', 'japan'],
  EWY: ['韩国', '三星', 'samsung', 'kospi', 'korea'],
  INDA: ['印度', 'india', 'sensex', 'nifty'],
  TAN: ['光伏', '太阳能', 'solar'],
  XLE: ['石油', '原油', 'oil', 'energy'],
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

export async function POST(req: Request) {
  try {
    const KIMI_KEY = process.env.KIMI_API_KEY
    if (!KIMI_KEY) return errorResponse('KIMI_API_KEY not configured', 500)

    const body = await req.json()
    const { inputContent, injectionType, associatedExpertId } = body

    if (!inputContent?.trim()) {
      return errorResponse('请提供URL或文本内容')
    }

    // Fetch content if URL
    let contentText = inputContent
    let sourceUrl = null
    let publishedAt = null

    if (injectionType === 'url') {
      sourceUrl = inputContent.trim()
      try {
        const res = await fetch(sourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        const html = await res.text()
        contentText = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 20000)

        const dateMatch = html.match(/<meta[^>]+(?:property|name)="(?:article:published_time|og:updated_time)"[^>]+content="([^"]+)"/i)
        if (dateMatch) {
          const d = new Date(dateMatch[1])
          if (!isNaN(d.getTime())) publishedAt = d
        }
      } catch (err) {
        return errorResponse(`无法访问该链接: ${err}`)
      }
    }

    if (!contentText || contentText.length < 50) {
      return errorResponse('内容太短，无法提取有效观点')
    }

    // Identify expert
    const allExperts = await prisma.expert.findMany({ where: { isActive: true } })
    let expert = allExperts.find(e => e.id === associatedExpertId)

    if (!expert) {
      const expertNames = allExperts.map(e => e.name).join(', ')
      const identifyRes = await callKimi([{
        role: 'user',
        content: `Who is the author or main subject expert in this content? Match from this list: [${expertNames}].
Return JSON: {"expert_name": "exact name from list or null", "confidence": 0.0-1.0}.
Content (first 2000 chars): ${contentText.slice(0, 2000)}`
      }], KIMI_KEY)

      if (identifyRes?.expert_name && identifyRes.confidence >= 0.7) {
        expert = allExperts.find(e =>
          e.name.toLowerCase().includes(identifyRes.expert_name.toLowerCase()) ||
          identifyRes.expert_name.toLowerCase().includes(e.name.toLowerCase())
        )
      }
    }

    if (!expert) {
      return errorResponse('无法自动识别专家，请手动指定', 400, {
        availableExperts: allExperts.map(e => ({ id: e.id, name: e.name }))
      })
    }

    // Extract views
    const systemPrompt = `You are a precision financial signal extractor for ${expert.name}.
CORE RULES:
1. Extract ONLY views EXPLICITLY stated by ${expert.name}.
2. A valid signal REQUIRES: (a) named asset/ETF, (b) explicit direction, (c) stated reason.
3. If conviction < 5, exclude. If confidence_in_extraction < 0.6, exclude.
4. Purely educational content (explaining what ETF is, types of ETF, etc.) → return {"views": []}
5. Return ONLY valid JSON.

OUTPUT FORMAT:
{"views":[{"claim":"...","evidence":"...","target_assets":["ticker"],"direction":"bullish|bearish|neutral","conviction":7,"time_horizon":"immediate|1w|1m|3m|6m|1y|structural","thesis_type":"fundamental|macro|technical|flow_based|sentiment|geopolitical","hedging_level":3,"emotional_tone":"calm|urgent|panicked|greedy|sarcastic|dismissive|neutral","specificity":6,"themes":["theme"],"confidence_in_extraction":0.8}]}`

    const userMsg = `Manual injection for ${expert.name} — ${publishedAt ? 'published: ' + publishedAt.toISOString() : '[DATE_UNKNOWN]'}
Source: ${sourceUrl || 'direct text input'}

--- BEGIN CONTENT ---
${contentText.slice(0, 20000)}
--- END CONTENT ---

Extract the top 1-2 highest-conviction investment views. If content is educational (explaining ETF types, definitions, etc.), return empty views.`

    const parsed = await callKimi([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg }
    ], KIMI_KEY)

    if (!parsed?.views?.length) {
      return errorResponse('未检测到明确投资观点，或内容属于教育性介绍')
    }

    const createdSignals = []
    for (const view of parsed.views) {
      if ((view.confidence_in_extraction || 0) < 0.6) continue
      if (view.direction === 'neutral') continue
      if ((view.conviction || 0) < 5) continue

      // Check if educational content slipped through
      const claimLower = (view.claim || '').toLowerCase()
      if (claimLower.includes('etf') && (claimLower.includes('类型') || claimLower.includes('分为') || claimLower.includes('什么是'))) {
        console.log(`[Manual] Filtering educational claim: ${view.claim}`)
        continue
      }

      let etfTickers = (view.target_assets || []).filter((a: string) => /^[A-Z]{2,6}$/.test(a.trim().toUpperCase()))
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
      const rawSentiment = view.direction === 'bullish' ? conviction / 10 : view.direction === 'bearish' ? -conviction / 10 : 0

      const signal = await prisma.signal.create({
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
          sourcePlatform: 'manual_injection',
          sourceUrl: sourceUrl,
          sourceVerificationStatus: 'verified',
          rawSummary: (view.claim || '').slice(0, 300),
          isManualInjection: true,
          injectionType: injectionType,
          signalTimestamp: publishedAt || new Date(),
          expiresAt,
        }
      })

      createdSignals.push(signal.id)
    }

    if (!createdSignals.length) {
      return errorResponse('提取到观点但未通过质量门槛（可能是教育内容）')
    }

    // Log injection
    await prisma.manualInjection.create({
      data: {
        injectionType: injectionType || 'text',
        inputContent,
        extractedText: contentText.slice(0, 2000),
        associatedExpertId: expert.id,
        associatedExpertName: expert.name,
        processingStatus: 'completed',
        generatedSignalId: createdSignals[0],
      }
    })

    return successResponse({
      expertName: expert.name,
      signalsCreated: createdSignals.length,
      signalIds: createdSignals,
    })
  } catch (err) {
    return errorResponse('Failed to process manual injection', 500, err)
  }
}
