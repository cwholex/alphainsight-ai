'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Check, X, ExternalLink } from 'lucide-react'

export default function SuggestedETFPanel() {
  const queryClient = useQueryClient()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['suggested-etfs'],
    queryFn: async () => {
      const res = await fetch('/api/suggested-etfs')
      const data = await res.json()
      return (data.data || []).filter((s: any) => s.status === 'pending')
    },
    refetchInterval: 30000,
  })

  const approveMutation = useMutation({
    mutationFn: async (params: any) => {
      const res = await fetch('/api/suggested-etfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggested-etfs'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      setApprovingId(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/suggested-etfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'reject' }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggested-etfs'] })
    },
  })

  if (isLoading) {
    return (
      <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
          新资产发现
        </h3>
        <p className="text-[#5A6A86] text-xs">加载中...</p>
      </div>
    )
  }

  if (!suggestions.length) {
    return (
      <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
        <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
          新资产发现
        </h3>
        <p className="text-[#5A6A86] text-xs">
          系统会自动检测专家提到但尚未覆盖的 ETF/资产。当专家观点涉及新资产时，将在此显示。
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
      <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
        新资产发现
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B]">
          {suggestions.length} 待处理
        </span>
      </h3>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {suggestions.map((s: any) => (
          <div key={s.id} className="bg-[#0F1629] rounded-lg p-3 border border-[#2A3A5C]/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{s.ticker}</p>
                <p className="text-[#5A6A86] text-[10px]">
                  由 {s.mentionedBy} 提到 · {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {approvingId === s.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="ETF 名称"
                      className="bg-[#1A2340] border border-[#2A3A5C] rounded px-2 py-1 text-xs text-white w-32"
                      value={formData[s.id]?.etfName || ''}
                      onChange={(e) => setFormData({ ...formData, [s.id]: { ...formData[s.id], etfName: e.target.value } })}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => approveMutation.mutate({
                          id: s.id,
                          action: 'approve',
                          etfName: formData[s.id]?.etfName || s.ticker,
                          sector: formData[s.id]?.sector || '其他',
                        })}
                        className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] hover:bg-[#10B981]/30"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setApprovingId(null)}
                        className="px-2 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] text-[10px] hover:bg-[#EF4444]/30"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setApprovingId(s.id)}
                      className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] hover:bg-[#10B981]/30"
                    >
                      采纳
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(s.id)}
                      className="px-2 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] text-[10px] hover:bg-[#EF4444]/30"
                    >
                      忽略
                    </button>
                  </>
                )}
              </div>
            </div>
            {s.reason && (
              <p className="text-[#7A8FA6] text-[10px] mt-1 line-clamp-2">{s.reason}</p>
            )}
            {s.sourceUrl && (
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#3B82F6] hover:underline flex items-center gap-0.5 mt-1"
              >
                查看来源 <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
