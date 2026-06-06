import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchETFPrice } from '@/lib/market-data'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET() {
  try {
    const holdings = await prisma.eTFHolding.findMany({
      orderBy: { marketValue: 'desc' },
    })
    return successResponse(holdings)
  } catch (err) {
    return errorResponse('Failed to fetch holdings', 500, err)
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { etfCode, shares, avgCostPerShare } = body

    const price = await fetchETFPrice(etfCode)
    const lastPrice = price || avgCostPerShare

    const holding = await prisma.eTFHolding.upsert({
      where: { etfCode },
      update: {
        shares,
        avgCostPerShare,
        costBasis: shares * avgCostPerShare,
        marketValue: shares * lastPrice,
        lastPrice,
        priceSnapshotTimestamp: new Date(),
      },
      create: {
        etfCode,
        etfName: body.etfName || etfCode,
        sector: body.sector || null,
        subSector: body.subSector || null,
        shares,
        avgCostPerShare,
        costBasis: shares * avgCostPerShare,
        marketValue: shares * lastPrice,
        lastPrice,
        priceSnapshotTimestamp: new Date(),
      },
    })

    // Recalculate weights
    const allHoldings = await prisma.eTFHolding.findMany()
    const totalValue = allHoldings.reduce((sum, h) => sum + h.marketValue, 0)
    for (const h of allHoldings) {
      await prisma.eTFHolding.update({
        where: { id: h.id },
        data: { currentWeight: totalValue > 0 ? h.marketValue / totalValue : 0 },
      })
    }

    return successResponse(holding)
  } catch (err) {
    return errorResponse('Failed to update holding', 500, err)
  }
}
