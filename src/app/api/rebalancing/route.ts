import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET() {
  try {
    const events = await prisma.rebalancingEvent.findMany({
      orderBy: { eventDate: 'desc' },
      take: 50,
    })
    return successResponse(events)
  } catch (err) {
    return errorResponse('Failed to fetch rebalancing events', 500, err)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { status, managerNotes } = body

    if (!body.id) {
      return errorResponse('Rebalancing event ID required')
    }

    const event = await prisma.rebalancingEvent.update({
      where: { id: body.id },
      data: {
        status: status || 'confirmed',
        managerNotes: managerNotes || null,
      },
    })

    return successResponse(event)
  } catch (err) {
    return errorResponse('Failed to update rebalancing event', 500, err)
  }
}
