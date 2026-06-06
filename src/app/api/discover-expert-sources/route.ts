import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

/**
 * 自动发现专家的 YouTube 频道
 * 通过搜索专家名字 + 关键词来找到频道
 * POST /api/discover-expert-sources
 * Body: { expertId: string }
 */
export async function POST(req: Request) {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ success: false, error: 'YOUTUBE_API_KEY not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { expertId } = body

    if (!expertId) {
      return NextResponse.json({ success: false, error: 'Missing expertId' }, { status: 400 })
    }

    const expert = await prisma.expert.findUnique({ where: { id: expertId } })
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 })
    }

    // 构建搜索查询
    const searchQueries = [
      `${expert.name} 股评 YouTube`,
      `${expert.name} 财经 频道`,
      `${expert.nameEn || expert.name} finance market analysis`,
    ].filter(Boolean)

    const discoveredChannels: any[] = []

    for (const query of searchQueries.slice(0, 2)) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=5&key=${YOUTUBE_API_KEY}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const data = await res.json()

        for (const item of (data.items || [])) {
          const channelId = item.snippet?.channelId || item.id?.channelId
          const title = item.snippet?.title || ''
          const description = item.snippet?.description || ''

          if (!channelId) continue

          // 检查是否可能是该专家的频道
          const expertNames = [expert.name, expert.nameEn, ...(expert.aliases || [])].filter(Boolean)
          const isMatch = expertNames.some(name => 
            title.toLowerCase().includes(name.toLowerCase()) ||
            description.toLowerCase().includes(name.toLowerCase())
          )

          // 或者检查频道名是否包含相关关键词
          const hasKeywords = /股评|财经|投资|分析|market|finance|investing/i.test(title + description)

          if (isMatch || hasKeywords) {
            discoveredChannels.push({
              channelId,
              title,
              description: description.slice(0, 200),
              confidence: isMatch ? 'high' : 'medium',
            })
          }
        }
      } catch (err) {
        console.error(`[Discover] Search failed for "${query}":`, err)
      }
    }

    // 去重
    const uniqueChannels = discoveredChannels.filter((c, i, arr) => 
      arr.findIndex(x => x.channelId === c.channelId) === i
    )

    return NextResponse.json({
      success: true,
      data: {
        expert: expert.name,
        searchQueries,
        discoveredChannels: uniqueChannels.slice(0, 5),
        message: `Found ${uniqueChannels.length} potential channels`,
      }
    })
  } catch (err) {
    console.error('[DiscoverExpertSources] Error:', err)
    return NextResponse.json({ success: false, error: 'Discovery failed' }, { status: 500 })
  }
}

/**
 * 批量发现所有专家的 YouTube 频道
 * GET /api/discover-expert-sources
 */
export async function GET() {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ success: false, error: 'YOUTUBE_API_KEY not configured' }, { status: 500 })
  }

  try {
    const experts = await prisma.expert.findMany({ where: { isActive: true } })
    const results: any[] = []

    for (const expert of experts) {
      // 跳过已有真实频道ID的专家
      const sources = (expert.contentSources as any[]) || []
      const hasRealYoutube = sources.some((s: any) => 
        s.type === 'youtube_channel' && !s.identifier?.startsWith('PLACEHOLDER_')
      )

      if (hasRealYoutube) {
        results.push({ expert: expert.name, status: 'already_configured' })
        continue
      }

      // 简单搜索
      const query = `${expert.name} ${expert.nameEn || ''} 股评 财经`.trim()
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=3&key=${YOUTUBE_API_KEY}`,
          { signal: AbortSignal.timeout(8000) }
        )
        const data = await res.json()
        const channels = (data.items || []).map((item: any) => ({
          channelId: item.snippet?.channelId || item.id?.channelId,
          title: item.snippet?.title,
        })).filter((c: any) => c.channelId)

        results.push({
          expert: expert.name,
          status: 'discovered',
          query,
          channels: channels.slice(0, 3),
        })
      } catch (err) {
        results.push({ expert: expert.name, status: 'error', error: (err as Error).message })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalExperts: experts.length,
        results,
      }
    })
  } catch (err) {
    console.error('[DiscoverAll] Error:', err)
    return NextResponse.json({ success: false, error: 'Batch discovery failed' }, { status: 500 })
  }
}
