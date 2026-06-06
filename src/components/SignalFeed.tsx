'use client'

import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'

interface SignalFeedProps {
  signals: any[]
  experts: any[]
}

export default function SignalFeed({ signals, experts }: SignalFeedProps) {
  const getExpert = (expertId: string) => experts.find((e: any) => e.id === expertId)

  const dirIcon = (direction: string) => {
    if (direction === 'bullish') return <TrendingUp className="w-4 h-4 text-[#10B981]" />
    if (direction === 'bearish') return <TrendingDown className="w-4 h-4 text-[#EF4444]" />
    return <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
  }

  const dirColor = (direction: string) => {
    if (direction === 'bullish') return 'text-[#10B981]'
    if (direction === 'bearish') return 'text-[#EF4444]'
    return 'text-[#F59E0B]'
  }

  const verBadge = (status: string) => {
    if (status === 'verified') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981]">已验证</span>
    if (status === 'open_collection_verified') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#8B5CF6]">开放式</span>
    if (status === 'indirect') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B]">间接</span>
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444]">未验证</span>
  }

  return (
    <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">最新专家观点</h3>
        <span className="text-[#7A8FA6] text-xs">{signals.length} 条信号</span>
      </div>

      <div className="space-y-3">
        {signals.slice(0, 20).map((signal: any) => {
          const expert = getExpert(signal.expertId)
          const age = Math.round((Date.now() - new Date(signal.signalTimestamp).getTime()) / 86400000)

          return (
            <div key={signal.id} className="bg-[#0F1629] rounded-lg p-3 border border-[#2A3A5C]/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {expert?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{expert?.name || '未知专家'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {verBadge(signal.sourceVerificationStatus)}
                      <span className="text-[10px] text-[#5A6A86]">{age}天前</span>
                      {signal.isManualInjection && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-[#3B82F6]/20 text-[#3B82F6]">人工</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1">
                    {dirIcon(signal.sentimentDirection)}
                    <span className={`text-sm font-bold ${dirColor(signal.sentimentDirection)}`}>
                      {signal.sentimentDirection === 'bullish' ? '看多' : signal.sentimentDirection === 'bearish' ? '看空' : '中性'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#5A6A86] mt-0.5">确信度 {signal.convictionScore}/10</p>
                </div>
              </div>

              <p className="text-[#7A8FA6] text-xs mt-2 line-clamp-2">{signal.rawSummary || '无摘要'}</p>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {signal.etfTickers?.map((ticker: string) => (
                    <span key={ticker} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A3A5C] text-[#7A8FA6]">
                      {ticker}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {signal.sourceVerificationStatus === 'open_collection_verified' && (
                    <span className="text-[10px] text-[#8B5CF6]">
                       via {signal.sourcePlatform === 'rss' ? 'RSS' : signal.sourcePlatform === 'podcast_rss' ? 'Podcast' : signal.sourcePlatform}
                    </span>
                  )}
                  {signal.sourceUrl && (
                    <a
                      href={signal.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#3B82F6] hover:underline flex items-center gap-0.5"
                    >
                      查看来源 <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Calibration info */}
              {signal.isCalibrated && signal.normalizedSentiment !== null && (
                <div className="mt-2 pt-2 border-t border-[#2A3A5C]/50">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[#5A6A86]">Raw:</span>
                    <span className={signal.rawSentiment > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                      {signal.rawSentiment > 0 ? '+' : ''}{signal.rawSentiment.toFixed(2)}
                    </span>
                    <span className="text-[#5A6A86]">→ 校准:</span>
                    <span className={signal.normalizedSentiment > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                      {signal.normalizedSentiment > 0 ? '+' : ''}{signal.normalizedSentiment.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
