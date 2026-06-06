'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

interface HoldingsPanelProps {
  holdings: any[]
}

export default function HoldingsPanel({ holdings }: HoldingsPanelProps) {
  const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0)

  return (
    <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
      <h3 className="text-white font-semibold text-sm mb-3">持仓ETF</h3>
      <div className="space-y-2">
        {holdings.slice(0, 10).map((holding: any) => {
          const pnl = holding.marketValue - holding.costBasis
          const pnlPct = holding.costBasis > 0 ? (pnl / holding.costBasis) * 100 : 0

          return (
            <div key={holding.etfCode} className="flex items-center justify-between py-2 border-b border-[#2A3A5C]/50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">{holding.etfCode}</span>
                  <span className="text-[#5A6A86] text-[10px] truncate">{holding.etfName}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[#7A8FA6]">{(holding.currentWeight * 100).toFixed(1)}%</span>
                  <span className="text-[10px] text-[#5A6A86]">${holding.lastPrice?.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white text-sm font-medium">
                  ${holding.marketValue?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className={`flex items-center justify-end gap-0.5 text-[10px] ${pnl >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {holdings.length > 10 && (
        <p className="text-[#5A6A86] text-[10px] text-center mt-2">+{holdings.length - 10} more</p>
      )}
    </div>
  )
}
