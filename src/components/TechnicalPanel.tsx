'use client'

import { Activity, AlertTriangle } from 'lucide-react'

interface TechnicalPanelProps {
  indicators: any[]
}

export default function TechnicalPanel({ indicators }: TechnicalPanelProps) {
  const vix = indicators.find((i: any) => i.indicatorType === 'VIX')
  const rsiList = indicators.filter((i: any) => i.indicatorType === 'RSI').slice(0, 5)

  const vixColor = (value: number) => {
    if (value > 30) return 'text-[#EF4444]'
    if (value < 15) return 'text-[#10B981]'
    return 'text-[#F59E0B]'
  }

  const vixLabel = (value: number) => {
    if (value > 30) return '极端恐惧'
    if (value > 25) return '恐慌'
    if (value < 15) return '极端贪婪'
    if (value < 20) return '平静'
    return '中性'
  }

  const rsiColor = (value: number) => {
    if (value > 70) return 'text-[#EF4444]'
    if (value < 30) return 'text-[#10B981]'
    return 'text-[#3B82F6]'
  }

  return (
    <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
      <h3 className="text-white font-semibold text-sm mb-3">技术指标</h3>

      {/* VIX */}
      {vix && (
        <div className="mb-4 p-3 bg-[#0F1629] rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#7A8FA6] text-xs">VIX 波动率</span>
            <Activity className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-2xl font-bold ${vixColor(vix.value)}`}>{vix.value.toFixed(2)}</span>
            <span className={`text-xs ${vixColor(vix.value)}`}>{vixLabel(vix.value)}</span>
          </div>
          <div className="w-full bg-[#2A3A5C] rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${vix.value > 30 ? 'bg-[#EF4444]' : vix.value < 15 ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`}
              style={{ width: `${Math.min(100, (vix.value / 40) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* RSI List */}
      <div className="space-y-2">
        {rsiList.map((rsi: any) => (
          <div key={rsi.id} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-medium">{rsi.targetEtf}</span>
              <span className="text-[10px] text-[#5A6A86]">RSI(14)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${rsiColor(rsi.value)}`}>{rsi.value.toFixed(1)}</span>
              {rsi.value > 70 && <AlertTriangle className="w-3 h-3 text-[#EF4444]" />}
              {rsi.value < 30 && <AlertTriangle className="w-3 h-3 text-[#10B981]" />}
            </div>
          </div>
        ))}
      </div>

      {indicators.length === 0 && (
        <p className="text-[#5A6A86] text-xs text-center py-4">暂无技术指标数据</p>
      )}
    </div>
  )
}
