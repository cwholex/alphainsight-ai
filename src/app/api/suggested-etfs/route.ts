import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET() {
  try {
    const suggested = await prisma.suggestedETF.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return successResponse(suggested)
  } catch (err) {
    return errorResponse('Failed to fetch suggested ETFs', 500, err)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, action, etfName, sector, subSector, shares, avgCostPerShare } = body

    if (action === 'approve') {
      const suggested = await prisma.suggestedETF.findUnique({ where: { id } })
      if (!suggested) return errorResponse('Suggested ETF not found', 404)

      // 创建正式 ETF 持仓
      const price = avgCostPerShare || 50
      const sharesCount = shares || 100
      await prisma.eTFHolding.upsert({
        where: { etfCode: suggested.ticker },
        update: {},
        create: {
          etfCode: suggested.ticker,
          etfName: etfName || suggested.ticker,
          sector: sector || '其他',
          subSector: subSector || '其他',
          shares: sharesCount,
          avgCostPerShare: price,
          lastPrice: price,
          marketValue: sharesCount * price,
          costBasis: sharesCount * price,
          currentWeight: 0,
        },
      })

      // 更新建议状态
      await prisma.suggestedETF.update({
        where: { id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
        },
      })

      // 重新计算权重
      const allHoldings = await prisma.eTFHolding.findMany()
      const totalValue = allHoldings.reduce((sum, h) => sum + h.marketValue, 0)
      for (const h of allHoldings) {
        await prisma.eTFHolding.update({
          where: { id: h.id },
          data: { currentWeight: totalValue > 0 ? h.marketValue / totalValue : 0 },
        })
      }

      return successResponse({ message: 'ETF approved and added to holdings' })
    }

    if (action === 'reject') {
      await prisma.suggestedETF.update({
        where: { id },
        data: { status: 'rejected' },
      })
      return successResponse({ message: 'ETF rejected' })
    }

    return errorResponse('Invalid action', 400)
  } catch (err) {
    return errorResponse('Failed to process suggested ETF', 500, err)
  }
}
