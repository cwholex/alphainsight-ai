import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'

/**
 * 修复数据库中的专家内容源配置
 * - 移除失效的 RSS feed（信报 404、明报 403、财新 404、新浪财经 404）
 * - 更新开放式收集源配置
 */
export async function GET(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return errorResponse('Unauthorized', 401)
  }

  try {
    const fixes: string[] = []

    // 1. 更新 SystemConfig 中的开放式收集源
    const openCollectionConfig = await prisma.systemConfig.findUnique({
      where: { key: 'open_collection_sources' }
    })

    if (openCollectionConfig) {
      const currentSources = (openCollectionConfig.value as any[]) || []
      const validSources = currentSources.filter((s: any) => {
        const url = s.identifier || ''
        // 移除已知失效的 RSS
        if (url.includes('hkej.com')) { fixes.push(`Removed broken: ${s.name} (${url})`); return false }
        if (url.includes('mingpao.com')) { fixes.push(`Removed broken: ${s.name} (${url})`); return false }
        if (url.includes('caixin.com')) { fixes.push(`Removed broken: ${s.name} (${url})`); return false }
        if (url.includes('sina.com.cn/stock/hkstock')) { fixes.push(`Removed broken: ${s.name} (${url})`); return false }
        return true
      })

      await prisma.systemConfig.update({
        where: { key: 'open_collection_sources' },
        data: { value: validSources }
      })
      fixes.push(`Updated open_collection_sources: ${validSources.length} sources remaining`)
    }

    // 2. 更新每个专家的内容源，移除失效的 RSS
    const experts = await prisma.expert.findMany()
    for (const expert of experts) {
      const sources = (expert.contentSources as any[]) || []
      const validExpertSources = sources.filter((s: any) => {
        const url = s.identifier || ''
        if (url.includes('hkej.com')) { fixes.push(`[${expert.name}] Removed broken RSS: ${url}`); return false }
        if (url.includes('mingpao.com')) { fixes.push(`[${expert.name}] Removed broken RSS: ${url}`); return false }
        return true
      })

      if (validExpertSources.length !== sources.length) {
        await prisma.expert.update({
          where: { id: expert.id },
          data: { contentSources: validExpertSources }
        })
      }
    }

    return successResponse({
      message: 'Database content sources fixed',
      fixes,
      expertsUpdated: experts.length,
    })
  } catch (err) {
    console.error('[FixSources] Error:', err)
    return errorResponse('Failed to fix sources', 500, err)
  }
}
