import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchETFPrice } from '@/lib/market-data'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return errorResponse('Unauthorized', 401)
  }

  try {
    const holdings = await prisma.eTFHolding.findMany()
    const updated = []

    for (const holding of holdings) {
      const price = await fetchETFPrice(holding.etfCode)
      if (price !== null) {
        const updatedHolding = await prisma.eTFHolding.update({
          where: { id: holding.id },
          data: {
            lastPrice: price,
            marketValue: holding.shares * price,
            priceSnapshotTimestamp: new Date(),
          },
        })
        updated.push(updatedHolding)
      }
    }

    // Recalculate weights
    const allHoldings = await prisma.eTFHolding.findMany()
    const totalValue = allHoldings.reduce((sum, h) => sum + h.marketValue, 0)
    for (const h of allHoldings) {
      await prisma.eTFHolding.update({
        where: { id: h.id },
        data: { currentWeight: totalValue > 0 ? h.marketValue / totalValue : 0 },
      })
    }

    return successResponse({
      updatedCount: updated.length,
      totalValue,
    })
  } catch (err) {
    return errorResponse('Failed to update prices', 500, err)
  }
}
