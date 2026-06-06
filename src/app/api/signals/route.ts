import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET() {
  try {
    const signals = await prisma.signal.findMany({
      orderBy: { signalTimestamp: 'desc' },
      take: 200,
      include: { expert: true },
    })
    return successResponse(signals)
  } catch (err) {
    return errorResponse('Failed to fetch signals', 500, err)
  }
}
