'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

interface ExpertGridProps {
  experts: any[]
  signals: any[]
  selectedExpert: string | null
  onSelectExpert: (id: string | null) => void
}

const AVATAR_COLORS = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-600', 'bg-pink-600', 'bg-cyan-600', 'bg-red-600', 'bg-yellow-600']

export default function ExpertGrid({ experts, signals, selectedExpert, onSelectExpert }: ExpertGridProps) {
  const expertStats = experts.map((expert, i) => {
    const expertSignals = signals.filter((s: any) => s.expertId === expert.id)
    const bullish = expertSignals.filter((s: any) => s.sentimentDirection === 'bullish').length
    const bearish = expertSignals.filter((s: any) => s.sentimentDirection === 'bearish').length
    const verified = expertSignals.filter((s: any) => s.sourceVerificationStatus === 'verified' || s.isManualInjection).length
    const openCollection = expertSignals.filter((s: any) => s.sourceVerificationStatus === 'open_collection_verified').length
    const verifiedPct = expertSignals.length > 0 ? verified / expertSignals.length : 0

    return {
      ...expert,
      colorClass: AVATAR_COLORS[i % AVATAR_COLORS.length],
      totalSignals: expertSignals.length,
      bullish,
      bearish,
      verifiedPct,
      openCollection,
    }
  })

  const credColor = (score: number) => {
    if (score >= 0.8) return 'text-[#10B981]'
    if (score >= 0.6) return 'text-[#3B82F6]'
    if (score >= 0.4) return 'text-[#F59E0B]'
    return 'text-[#EF4444]'
  }

  return (
    <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
      <h3 className="text-white font-semibold text-sm mb-3">投资专家</h3>
      <div className="space-y-2">
        {expertStats.map((e: any) => (
          <button
            key={e.id}
            onClick={() => onSelectExpert(selectedExpert === e.id ? null : e.id)}
            className={`w-full text-left rounded-lg p-3 transition-all border ${
              selectedExpert === e.id
                ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                : 'border-transparent hover:bg-[#2A3A5C]/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full ${e.colorClass} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                {e.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium truncate">{e.name}</p>
                  <p className={`text-sm font-bold ${credColor(e.credibilityScore)}`}>
                    {(e.credibilityScore * 100).toFixed(0)}
                  </p>
                </div>
                <p className="text-[#5A6A86] text-[10px]">
                  {e.title ? `${e.title} · ` : ''}{e.institution || '独立分析师'}
                  {e.nameEn ? ` · ${e.nameEn}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#7A8FA6]">{e.totalSignals} 信号</span>
                  {e.bullish > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[#10B981]">
                      <TrendingUp className="w-3 h-3" />{e.bullish}
                    </span>
                  )}
                  {e.bearish > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[#EF4444]">
                      <TrendingDown className="w-3 h-3" />{e.bearish}
                    </span>
                  )}
                  {e.openCollection > 0 && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-[#8B5CF6]/20 text-[#8B5CF6]">
                      开放式 {e.openCollection}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
