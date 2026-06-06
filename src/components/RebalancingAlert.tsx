'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'

interface RebalancingAlertProps {
  events: any[]
}

export default function RebalancingAlert({ events }: RebalancingAlertProps) {
  const suggested = events.filter((e: any) => e.status === 'suggested')
  if (!suggested.length) return null

  const latest = suggested[0]

  return (
    <div className="max-w-[1600px] mx-auto px-4 mt-4">
      <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">调仓建议待处理</p>
            <p className="text-[#7A8FA6] text-xs">
              预期净收益 +{latest.expectedNetReturn?.toFixed(2)}% · 换手率 {latest.totalTurnoverRate?.toFixed(1)}% · 涉及 {latest.rebalancingActions?.length || 0} 个 ETF
            </p>
          </div>
        </div>
        <a
          href="/rebalancing"
          className="flex items-center gap-1 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0F1E] text-sm font-medium rounded-lg transition-colors"
        >
          查看详情 <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
