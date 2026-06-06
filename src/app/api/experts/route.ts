import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET() {
  try {
    const experts = await prisma.expert.findMany({
      orderBy: { credibilityScore: 'desc' },
    })
    return successResponse(experts)
  } catch (err) {
    return errorResponse('Failed to fetch experts', 500, err)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const expert = await prisma.expert.create({ data: body })
    return successResponse(expert, 201)
  } catch (err) {
    return errorResponse('Failed to create expert', 500, err)
  }
}
