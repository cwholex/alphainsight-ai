import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse } from '@/lib/api-helpers'

export async function GET() {
  try {
    // 简单数据库连接测试
    await prisma.$queryRaw`SELECT 1`
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
