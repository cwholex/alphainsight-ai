'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function ExpertTrackerPage() {
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null)

  const { data: experts = [] } = useQuery({
    queryKey: ['experts'],
    queryFn: async () => {
      const res = await fetch('/api/experts')
      const data = await res.json()
      return data.data || []
    },
  })

  const { data: signals = [] } = useQuery({
    queryKey: ['signals'],
    queryFn: async () => {
      const res = await fetch('/api/signals')
      const data = await res.json()
      return data.data || []
    },
  })

  const expertStats = experts.map((expert: any) => {
    const expertSignals = signals.filter((s: any) => s.expertId === expert.id)
    const bullish = expertSignals.filter((s: any) => s.sentimentDirection === 'bullish').length
    const bearish = expertSignals.filter((s: any) => s.sentimentDirection === 'bearish').length
    const verified = expertSignals.filter((s: any) => s.sourceVerificationStatus === 'verified' || s.isManualInjection).length
    const verifiedPct = expertSignals.length > 0 ? verified / expertSignals.length : 0

    return {
      ...expert,
      totalSignals: expertSignals.length,
      bullish,
      bearish,
      verifiedPct,
    }
  })

  const selected = selectedExpert ? expertStats.find((e: any) => e.id === selectedExpert) : null

  const credColor = (score: number) => {
    if (score >= 0.8) return 'text-[#10B981]'
    if (score >= 0.6) return 'text-[#3B82F6]'
    if (score >= 0.4) return 'text-[#F59E0B]'
    return 'text-[#EF4444]'
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[#7A8FA6] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">专家表现追踪器</h1>
              <p className="text-sm text-[#7A8FA6] mt-0.5">历史预测准确度 · 动态信用分 · 来源验证</p>
            </div>
          </div>
        </div>

        {/* Expert Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {expertStats.map((e: any) => (
            <button
              key={e.id}
              onClick={() => setSelectedExpert(selectedExpert === e.id ? null : e.id)}
              className={`text-left bg-[#1A2340] rounded-xl border p-4 transition-all hover:border-[#3B82F6] ${
                selectedExpert === e.id ? 'border-[#3B82F6]' : 'border-[#2A3A5C]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-bold text-base shrink-0">
                    {e.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{e.name}</p>
                    <p className="text-[#5A6A86] text-[10px]">{e.institution || '独立分析师'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${credColor(e.credibilityScore)}`}>
                    {(e.credibilityScore * 100).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-[#5A6A86]">信用分</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-white text-sm font-bold">{e.totalSignals}</p>
                  <p className="text-[10px] text-[#5A6A86]">总信号</p>
                </div>
                <div>
                  <p className="text-[#10B981] text-sm font-bold">{e.bullish}</p>
                  <p className="text-[10px] text-[#5A6A86]">看多</p>
                </div>
                <div>
                  <p className="text-[#EF4444] text-sm font-bold">{e.bearish}</p>
                  <p className="text-[10px] text-[#5A6A86]">看空</p>
                </div>
              </div>

              {/* Verified ratio */}
              {e.verifiedPct !== null && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-[#5A6A86]">已验证来源比例</span>
                    <span className={`text-[9px] font-mono ${e.verifiedPct >= 0.7 ? 'text-[#10B981]' : e.verifiedPct >= 0.4 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                      {(e.verifiedPct * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0F1629] rounded-full h-1">
                    <div
                      className={`h-1 rounded-full ${e.verifiedPct >= 0.7 ? 'bg-[#10B981]' : e.verifiedPct >= 0.4 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`}
                      style={{ width: `${e.verifiedPct * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Selected Expert Detail */}
        {selected && (
          <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-6">
            <h2 className="text-white font-bold text-lg mb-4">{selected.name} · 详细分析</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-[#7A8FA6] text-xs mb-2">最新信号</h3>
                <div className="space-y-2">
                  {signals
                    .filter((s: any) => s.expertId === selected.id)
                    .slice(0, 5)
                    .map((sig: any) => (
                      <div key={sig.id} className="bg-[#0F1629] rounded-lg p-3 flex items-start gap-3">
                        <div className="shrink-0">
                          {sig.sentimentDirection === 'bullish' ? (
                            <TrendingUp className="w-4 h-4 text-[#10B981]" />
                          ) : sig.sentimentDirection === 'bearish' ? (
                            <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                          ) : (
                            <Minus className="w-4 h-4 text-[#F59E0B]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium">{sig.etfCode || sig.etfTickers?.[0] || 'N/A'}</p>
                          <p className="text-[#7A8FA6] text-[10px] line-clamp-2">{sig.rawSummary || '无摘要'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[#3B82F6] text-xs font-bold">{((sig.confidenceScore || 0) * 100).toFixed(0)}%</p>
                          <p className="text-[#5A6A86] text-[10px]">{new Date(sig.signalTimestamp).toLocaleDateString('zh-CN')}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h3 className="text-[#7A8FA6] text-xs mb-2">来源配置</h3>
                <div className="space-y-2">
                  {(selected.contentSources as any[])?.map((source: any, i: number) => (
                    <div key={i} className="bg-[#0F1629] rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#7A8FA6]">
                          {source.type === 'youtube_channel' ? '▶ YouTube' :
                           source.type === 'rss_feed' ? '📡 RSS' :
                           source.type === 'twitter_handle' ? '𝕏 Twitter' :
                           source.type === 'newsletter_url' ? '📰 Newsletter' : source.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#5A6A86] truncate max-w-[200px]">{source.identifier}</span>
                    </div>
                  )) || <p className="text-[#5A6A86] text-xs">未配置来源</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
