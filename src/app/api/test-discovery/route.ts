import { NextResponse } from 'next/server'
import {
  discoverViaBingNews,
  discoverViaGoogleNews,
  discoverViaBraveSearch,
  discoverViaYouTube,
  fetchPageContent,
  identifyExpertInContentSimple,
  isInvestmentRelated,
} from '@/lib/content-fetcher'

/**
 * 测试新的内容发现系统
 * GET /api/test-discovery?expert=洪灝&fetch=true
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const expertName = url.searchParams.get('expert') || '洪灝'
  const testFetch = url.searchParams.get('fetch') === 'true'
  
  const BRAVE_KEY = process.env.BRAVE_SEARCH_KEY
  const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY
  
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  
  try {
    const results: any = {
      expert: expertName,
      since: since.toISOString(),
      discovery: {},
      fetch: {},
    }
    
    // 1. Bing News
    console.log(`[Test] Bing News search: ${expertName}`)
    const bingResults = await discoverViaBingNews(`${expertName} 股评 港股`, since)
    results.discovery.bing = {
      count: bingResults.length,
      samples: bingResults.slice(0, 3).map(r => ({ title: r.title.slice(0, 80), url: r.url.slice(0, 80), source: r.source })),
    }
    
    // 2. Google News
    console.log(`[Test] Google News search: ${expertName}`)
    const googleResults = await discoverViaGoogleNews(`${expertName} 股评`, since)
    results.discovery.google = {
      count: googleResults.length,
      samples: googleResults.slice(0, 3).map(r => ({ title: r.title.slice(0, 80), url: r.url.slice(0, 80), source: r.source })),
    }
    
    // 3. Brave Search
    if (BRAVE_KEY) {
      console.log(`[Test] Brave Search: ${expertName}`)
      const braveResults = await discoverViaBraveSearch(`${expertName} 港股 分析`, BRAVE_KEY, since)
      results.discovery.brave = {
        count: braveResults.length,
        samples: braveResults.slice(0, 3).map(r => ({ title: r.title.slice(0, 80), url: r.url.slice(0, 80) })),
      }
    }
    
    // 4. YouTube
    if (YOUTUBE_KEY) {
      console.log(`[Test] YouTube search: ${expertName}`)
      const ytResults = await discoverViaYouTube(`${expertName} 股评`, YOUTUBE_KEY, since)
      results.discovery.youtube = {
        count: ytResults.length,
        samples: ytResults.slice(0, 3).map(r => ({ title: r.title.slice(0, 80), url: r.url.slice(0, 80) })),
      }
    }
    
    // 5. 测试网页抓取
    if (testFetch && bingResults.length > 0) {
      const testUrl = bingResults[0].url
      console.log(`[Test] Fetching page: ${testUrl}`)
      const pageContent = await fetchPageContent(testUrl)
      if (pageContent) {
        results.fetch.testUrl = testUrl.slice(0, 80)
        results.fetch.title = pageContent.title?.slice(0, 100)
        results.fetch.contentLength = pageContent.content.length
        results.fetch.contentPreview = pageContent.content.slice(0, 500)
        results.fetch.isInvestmentRelated = isInvestmentRelated(pageContent.content)
        
        // 测试专家识别
        const identification = identifyExpertInContentSimple(
          pageContent.content,
          { name: expertName, nameEn: 'Hong Hao', aliases: ['洪浩', '洪灝'] }
        )
        results.fetch.expertIdentified = identification.isMatch
        results.fetch.expertConfidence = identification.confidence
        results.fetch.expertMatchedName = identification.matchedName
      } else {
        results.fetch.error = 'Failed to fetch page'
      }
    }
    
    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error('[TestDiscovery] Error:', err)
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
