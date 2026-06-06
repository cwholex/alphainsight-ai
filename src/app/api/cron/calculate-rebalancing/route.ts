import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'

const INITIAL_CAPITAL = 1000000
const BL_K = 0.08
const MAX_EXPERT_WEIGHT = 0.30
const CASH_BUFFER = 0.05

function timeDecayFactor(signalTimestamp: Date, timeHorizon: string): number {
  const daysElapsed = (Date.now() - signalTimestamp.getTime()) / 86400000
  const halfLife: Record<string, number> = {
    immediate: 3, '1w': 7, '1m': 10, '3m': 30, '6m': 60, '1y': 90, structural: 180
  }
  const hl = halfLife[timeHorizon] || 30
  return Math.exp(-daysElapsed * Math.LN2 / hl)
}

export async function GET(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return errorResponse('Unauthorized', 401)
  }

  try {
    // Get active signals
    const signals = await prisma.signal.findMany({
      where: {
        expiresAt: { gt: new Date() },
        sentimentDirection: { in: ['bullish', 'bearish'] },
        isCalibrated: true,
      },
      include: { expert: true },
    })

    // Get current holdings
    const holdings = await prisma.eTFHolding.findMany()
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0) || INITIAL_CAPITAL

    // Calculate ETF view scores
    const etfScores: Record<string, number> = {}

    for (const signal of signals) {
      for (const ticker of signal.etfTickers) {
        if (!etfScores[ticker]) etfScores[ticker] = 0

        const decay = timeDecayFactor(signal.signalTimestamp, signal.timeHorizon)
        const expertWeight = signal.expert?.credibilityScore || 0.5
        const sentiment = signal.normalizedSentiment || signal.rawSentiment
        const score = sentiment * (signal.convictionScore / 10) * decay * expertWeight

        etfScores[ticker] += score
      }
    }

    // Calculate target weights using simplified Black-Litterman
    const currentWeights: Record<string, number> = {}
    for (const h of holdings) {
      currentWeights[h.etfCode] = totalValue > 0 ? h.marketValue / totalValue : 0
    }

    const targetWeights: Record<string, number> = {}
    let totalScore = 0
    for (const [ticker, score] of Object.entries(etfScores)) {
      const pi = currentWeights[ticker] || 0
      targetWeights[ticker] = Math.max(0, pi + BL_K * score)
      totalScore += targetWeights[ticker]
    }

    // Normalize and apply constraints
    const normalizedWeights: Record<string, number> = {}
    for (const [ticker, weight] of Object.entries(targetWeights)) {
      normalizedWeights[ticker] = totalScore > 0 ? weight / totalScore : 0
    }

    // Apply cash buffer
    const investableWeight = 1 - CASH_BUFFER
    let finalWeights: Record<string, number> = {}
    let currentTotal = 0
    for (const [ticker, weight] of Object.entries(normalizedWeights).sort((a, b) => b[1] - a[1])) {
      const allocated = Math.min(weight * investableWeight, investableWeight - currentTotal)
      if (allocated > 0.01) {
        finalWeights[ticker] = allocated
        currentTotal += allocated
      }
    }

    // Calculate rebalancing actions
    const actions = []
    for (const [ticker, targetWeight] of Object.entries(finalWeights)) {
      const currentWeight = currentWeights[ticker] || 0
      const weightChange = targetWeight - currentWeight
      if (Math.abs(weightChange) > 0.01) {
        actions.push({
          etfCode: ticker,
          oldWeight: currentWeight,
          newWeight: targetWeight,
          weightChange,
          estimatedTransactionCost: Math.abs(weightChange) * totalValue * 0.001,
        })
      }
    }

    const totalTurnover = actions.reduce((sum, a) => sum + Math.abs(a.weightChange), 0)
    const expectedReturn = actions.reduce((sum, a) => {
      const score = etfScores[a.etfCode] || 0
      return sum + a.weightChange * score * 100
    }, 0)

    // Create rebalancing event
    const event = await prisma.rebalancingEvent.create({
      data: {
        triggerSignals: signals.map(s => s.id),
        rebalancingActions: actions,
        totalTurnoverRate: totalTurnover,
        totalEstimatedTca: actions.reduce((sum, a) => sum + a.estimatedTransactionCost, 0),
        expectedNetReturn: expectedReturn,
        status: 'suggested',
      },
    })

    return successResponse({
      event,
      actions,
      totalTurnover,
      expectedReturn,
    })
  } catch (err) {
    return errorResponse('Failed to calculate rebalancing', 500, err)
  }
}
