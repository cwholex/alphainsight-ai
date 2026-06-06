'use client'

import { TrendingUp, TrendingDown, Users, Radio, Wallet } from 'lucide-react'

interface PortfolioSummaryProps {
  holdings: any[]
  experts: any[]
  signals: any[]
}

export default function PortfolioSummary({ holdings, experts, signals }: PortfolioSummaryProps) {
  const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0)
  const totalCost = holdings.reduce((sum, h) => sum + (h.costBasis || 0), 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  const recentSignals = signals.filter((s: any) => {
    const days = (Date.now() - new Date(s.signalTimestamp).getTime()) / 86400000
    return days <= 7
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Value */}
      <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#7A8FA6] text-xs">持仓市值</span>
          <Wallet className="w-4 h-4 text-[#3B82F6]" />
        </div>
        <p className="text-2xl font-bold text-white">
          ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        <div className={`flex items-center gap-1 mt-1 ${totalPnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
          {totalPnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="text-sm font-semibold">
            {totalPnl >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
          </span>
          <span className="text-[#7A8FA6] text-xs">
            ({totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
          </span>
        </div>
      </div>

      {/* Holdings Count */}
      <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#7A8FA6] text-xs">持仓ETF</span>
          <TrendingUp className="w-4 h-4 text-[#10B981]" />
        </div>
        <p className="text-2xl font-bold text-white">{holdings.length}</p>
        <p className="text-[#7A8FA6] text-xs mt-1">{holdings.filter((h: any) => h.currentWeight > 0.05).length} 个主要仓位</p>
      </div>

      {/* Expert Count */}
      <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#7A8FA6] text-xs">追踪专家</span>
          <Users className="w-4 h-4 text-[#A78BFA]" />
        </div>
        <p className="text-2xl font-bold text-white">{experts.filter((e: any) => e.isActive).length}</p>
        <p className="text-[#7A8FA6] text-xs mt-1">{experts.filter((e: any) => e.credibilityScore >= 0.8).length} 位高信用专家</p>
      </div>

      {/* Signal Count */}
      <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#7A8FA6] text-xs">近7日信号</span>
          <Radio className="w-4 h-4 text-[#F59E0B]" />
        </div>
        <p className="text-2xl font-bold text-white">{recentSignals.length}</p>
        <p className="text-[#7A8FA6] text-xs mt-1">
          {recentSignals.filter((s: any) => s.sentimentDirection === 'bullish').length} 看多 / {recentSignals.filter((s: any) => s.sentimentDirection === 'bearish').length} 看空
        </p>
      </div>
    </div>
  )
}
