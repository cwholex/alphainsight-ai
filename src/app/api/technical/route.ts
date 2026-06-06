import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchETFPrice, fetchETFHistory, calculateRSI, fetchVIX } from '@/lib/market-data'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET() {
  try {
    const indicators = await prisma.technicalIndicator.findMany({
      orderBy: { calculatedAt: 'desc' },
      distinct: ['indicatorType', 'targetEtf'],
    })
    return successResponse(indicators)
  } catch (err) {
    return errorResponse('Failed to fetch technical indicators', 500, err)
  }
}

export async function POST(req: Request) {
  try {
    const holdings = await prisma.eTFHolding.findMany()
    const vix = await fetchVIX()

    const results = []

    // VIX
    if (vix !== null) {
      let signal = 'neutral'
      let strength = 5
      if (vix > 30) { signal = 'extreme_fear'; strength = 8 }
      else if (vix < 15) { signal = 'extreme_greed'; strength = 7 }
      else if (vix > 25) { signal = 'extreme_fear'; strength = 6 }

      const vixIndicator = await prisma.technicalIndicator.create({
        data: {
          indicatorType: 'VIX',
          targetEtf: 'SPY',
          value: vix,
          signal,
          timeframe: 'daily',
          strength,
          description: `VIX = ${vix.toFixed(2)} — ${signal === 'extreme_fear' ? '市场恐慌' : signal === 'extreme_greed' ? '市场过热' : '中性'}`,
        },
      })
      results.push(vixIndicator)
    }

    // RSI for each holding
    for (const holding of holdings) {
      const history = await fetchETFHistory(holding.etfCode, 30)
      const closes = history.map(h => h.close)
      const rsi = calculateRSI(closes, 14)

      if (rsi !== null) {
        let signal = 'neutral'
        let strength = 5
        if (rsi < 30) { signal = 'oversold'; strength = Math.min(10, Math.round((30 - rsi) / 30 * 10)) }
        else if (rsi > 70) { signal = 'overbought'; strength = Math.min(10, Math.round((rsi - 70) / 30 * 10)) }

        const rsiIndicator = await prisma.technicalIndicator.create({
          data: {
            indicatorType: 'RSI',
            targetEtf: holding.etfCode,
            value: rsi,
            signal,
            timeframe: 'daily',
            strength,
            description: `RSI(14) = ${rsi.toFixed(1)} — ${signal === 'oversold' ? '超卖' : signal === 'overbought' ? '超买' : '中性'}`,
          },
        })
        results.push(rsiIndicator)
      }
    }

    return successResponse(results)
  } catch (err) {
    return errorResponse('Failed to calculate technical indicators', 500, err)
  }
}
