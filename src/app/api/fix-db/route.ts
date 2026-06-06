import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 公开端点：修复数据库中的失效 RSS 源配置
 * GET /api/fix-db
 */
export async function GET() {
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
        if (url.includes('hkej.com')) { fixes.push(`Removed broken: ${s.name}`); return false }
        if (url.includes('mingpao.com')) { fixes.push(`Removed broken: ${s.name}`); return false }
        if (url.includes('caixin.com')) { fixes.push(`Removed broken: ${s.name}`); return false }
        if (url.includes('sina.com.cn/stock/hkstock')) { fixes.push(`Removed broken: ${s.name}`); return false }
        return true
      })

      await prisma.systemConfig.update({
        where: { key: 'open_collection_sources' },
        data: { value: validSources }
      })
      fixes.push(`Updated open_collection_sources: ${validSources.length} sources remaining`)
    }

    // 2. 更新每个专家的内容源
    const experts = await prisma.expert.findMany()
    for (const expert of experts) {
      const sources = (expert.contentSources as any[]) || []
      const validExpertSources = sources.filter((s: any) => {
        const url = s.identifier || ''
        if (url.includes('hkej.com')) { fixes.push(`[${expert.name}] Removed broken RSS`); return false }
        if (url.includes('mingpao.com')) { fixes.push(`[${expert.name}] Removed broken RSS`); return false }
        return true
      })

      if (validExpertSources.length !== sources.length) {
        await prisma.expert.update({
          where: { id: expert.id },
          data: { contentSources: validExpertSources }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Database content sources fixed',
        fixes,
        expertsUpdated: experts.length,
      }
    })
  } catch (err) {
    console.error('[FixDB] Error:', err)
    return NextResponse.json({
      success: false,
      error: 'Failed to fix sources'
    }, { status: 500 })
  }
}
