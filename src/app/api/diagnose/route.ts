import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  discoverViaBingNews,
  discoverViaGoogleNews,
  fetchPageContent,
  identifyExpertInContentSimple,
  isInvestmentRelated,
} from '@/lib/content-fetcher'

/**
 * 公开诊断端点 - 测试内容抓取系统
 * GET /api/diagnose
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasKimiKey: !!process.env.KIMI_API_KEY,
      hasYoutubeKey: !!process.env.YOUTUBE_API_KEY,
      hasBraveKey: !!process.env.BRAVE_SEARCH_KEY,
      hasNewsApiKey: !!process.env.NEWSAPI_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
      cronSecretLength: process.env.CRON_SECRET?.length || 0,
    },
    database: {},
    tests: {},
  }

  try {
    // 1. 数据库统计
    const expertCount = await prisma.expert.count()
    const signalCount = await prisma.signal.count()
    const etfCount = await prisma.eTFHolding.count()
    
    results.database = {
      experts: expertCount,
      signals: signalCount,
      etfs: etfCount,
    }

    // 2. 测试 Bing News 发现
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
    try {
      const bingResults = await discoverViaBingNews('洪灝 股评', since)
      results.tests.bingNews = {
        status: 'ok',
        count: bingResults.length,
        sample: bingResults[0] ? {
          title: bingResults[0].title.slice(0, 80),
          url: bingResults[0].url.slice(0, 80),
        } : null,
      }
    } catch (err) {
      results.tests.bingNews = { status: 'error', error: (err as Error).message }
    }

    // 3. 测试 Google News 发现
    try {
      const googleResults = await discoverViaGoogleNews('洪灝 股评', since)
      results.tests.googleNews = {
        status: 'ok',
        count: googleResults.length,
        sample: googleResults[0] ? {
          title: googleResults[0].title.slice(0, 80),
          url: googleResults[0].url.slice(0, 80),
        } : null,
      }
    } catch (err) {
      results.tests.googleNews = { status: 'error', error: (err as Error).message }
    }

    // 4. 测试网页抓取
    if (results.tests.bingNews?.status === 'ok' && results.tests.bingNews.count > 0) {
      try {
        const bingRes = await discoverViaBingNews('洪灝 股评', since)
        const testUrl = bingRes[0]?.url
        if (testUrl) {
          const pageContent = await fetchPageContent(testUrl)
          if (pageContent) {
            results.tests.pageFetch = {
              status: 'ok',
              url: testUrl.slice(0, 80),
              title: pageContent.title?.slice(0, 80),
              contentLength: pageContent.content.length,
              isInvestmentRelated: isInvestmentRelated(pageContent.content),
            }
            
            const identification = identifyExpertInContentSimple(
              pageContent.content,
              { name: '洪灝', nameEn: 'Hong Hao', aliases: ['洪浩', '洪灝'] }
            )
            results.tests.expertIdentification = {
              status: identification.isMatch ? 'ok' : 'not_found',
              confidence: identification.confidence,
              matchedName: identification.matchedName,
            }
          } else {
            results.tests.pageFetch = { status: 'failed', url: testUrl.slice(0, 80) }
          }
        }
      } catch (err) {
        results.tests.pageFetch = { status: 'error', error: (err as Error).message }
      }
    }

    // 5. 检查专家内容源配置
    const experts = await prisma.expert.findMany({
      select: { name: true, contentSources: true }
    })
    results.experts = experts.map(e => ({
      name: e.name,
      sourceCount: (e.contentSources as any[])?.length || 0,
      hasYoutube: (e.contentSources as any[])?.some((s: any) => s.type === 'youtube_channel' && !s.identifier?.startsWith('PLACEHOLDER_')) || false,
    }))

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error('[Diagnose] Error:', err)
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
      partial: results,
    }, { status: 500 })
  }
}
