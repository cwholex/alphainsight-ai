'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Check, TrendingUp, TrendingDown } from 'lucide-react'

export default function RebalancingPage() {
  const queryClient = useQueryClient()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const { data: events = [] } = useQuery({
    queryKey: ['rebalancing'],
    queryFn: async () => {
      const res = await fetch('/api/rebalancing')
      const data = await res.json()
      return data.data || []
    },
  })

  const { data: holdings = [] } = useQuery({
    queryKey: ['holdings'],
    queryFn: async () => {
      const res = await fetch('/api/holdings')
      const data = await res.json()
      return data.data || []
    },
  })

  const handleConfirm = async (id: string) => {
    setConfirmingId(id)
    try {
      const res = await fetch('/api/rebalancing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'confirmed' }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['rebalancing'] })
        queryClient.invalidateQueries({ queryKey: ['holdings'] })
      }
    } finally {
      setConfirmingId(null)
    }
  }

  const suggested = events.filter((e: any) => e.status === 'suggested')

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-[#7A8FA6] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">调仓建议</h1>
            <p className="text-sm text-[#7A8FA6] mt-0.5">基于专家信号的 Black-Litterman 优化</p>
          </div>
        </div>

        {/* Suggested Events */}
        {suggested.length === 0 && (
          <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-8 text-center">
            <p className="text-[#5A6A86] text-sm">暂无待处理调仓建议</p>
          </div>
        )}

        {suggested.map((event: any) => (
          <div key={event.id} className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-semibold">调仓事件 #{event.id.slice(-6)}</p>
                <p className="text-[#7A8FA6] text-xs">{new Date(event.eventDate).toLocaleString('zh-CN')}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#F59E0B] text-sm font-medium">待确认</span>
                <button
                  onClick={() => handleConfirm(event.id)}
                  disabled={confirmingId === event.id}
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] disabled:bg-[#2A3A5C] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  {confirmingId === event.id ? '确认中...' : '确认执行'}
                </button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-[#0F1629] rounded-lg p-3">
                <p className="text-[#5A6A86] text-[10px]">预期净收益</p>
                <p className={`text-lg font-bold ${event.expectedNetReturn >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {event.expectedNetReturn >= 0 ? '+' : ''}{event.expectedNetReturn?.toFixed(2)}%
                </p>
              </div>
              <div className="bg-[#0F1629] rounded-lg p-3">
                <p className="text-[#5A6A86] text-[10px]">总换手率</p>
                <p className="text-lg font-bold text-white">{event.totalTurnoverRate?.toFixed(1)}%</p>
              </div>
              <div className="bg-[#0F1629] rounded-lg p-3">
                <p className="text-[#5A6A86] text-[10px]">预计交易成本</p>
                <p className="text-lg font-bold text-white">${event.totalEstimatedTca?.toFixed(0)}</p>
              </div>
            </div>

            {/* Actions Table */}
            <h3 className="text-white font-medium text-sm mb-2">调仓明细</h3>
            <div className="space-y-2">
              {(event.rebalancingActions || []).map((action: any, i: number) => {
                const holding = holdings.find((h: any) => h.etfCode === action.etfCode)
                return (
                  <div key={i} className="bg-[#0F1629] rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        action.weightChange > 0 ? 'bg-[#10B981]/20' : 'bg-[#EF4444]/20'
                      }`}>
                        {action.weightChange > 0 ? (
                          <TrendingUp className="w-4 h-4 text-[#10B981]" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{action.etfCode}</p>
                        <p className="text-[#5A6A86] text-[10px]">{holding?.etfName || ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${action.weightChange > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        {action.weightChange > 0 ? '+' : ''}{(action.weightChange * 100).toFixed(2)}%
                      </p>
                      <p className="text-[#5A6A86] text-[10px]">
                        {(action.oldWeight * 100).toFixed(1)}% → {(action.newWeight * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
