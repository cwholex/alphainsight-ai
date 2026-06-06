import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse } from '@/lib/api-helpers'

export async function GET(req: Request) {
  try {
    // 简单数据库连接测试
    await prisma.$queryRaw`SELECT 1`
    
    // 检查是否需要修复数据库
    const url = new URL(req.url)
    const shouldFix = url.searchParams.get('fix') === 'true'
    
    if (shouldFix) {
      const fixes: string[] = []
      
      // 修复开放式收集源
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
      
      // 修复专家内容源
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
      
      return successResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        fixApplied: true,
        fixes,
      })
    }
    
    return successResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: 'Database connection failed' },
      { status: 503 }
    )
  }
}
