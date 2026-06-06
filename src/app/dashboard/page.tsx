'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import PortfolioSummary from '@/components/PortfolioSummary'
import ExpertGrid from '@/components/ExpertGrid'
import SignalFeed from '@/components/SignalFeed'
import HoldingsPanel from '@/components/HoldingsPanel'
import TechnicalPanel from '@/components/TechnicalPanel'
import ManualInjectionPanel from '@/components/ManualInjectionPanel'
import SuggestedETFPanel from '@/components/SuggestedETFPanel'

export default function DashboardPage() {
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

  const { data: holdings = [] } = useQuery({
    queryKey: ['holdings'],
    queryFn: async () => {
      const res = await fetch('/api/holdings')
      const data = await res.json()
      return data.data || []
    },
  })

  const { data: technical = [] } = useQuery({
    queryKey: ['technical'],
    queryFn: async () => {
      const res = await fetch('/api/technical')
      const data = await res.json()
      return data.data || []
    },
  })

  const { data: rebalancing = [] } = useQuery({
    queryKey: ['rebalancing'],
    queryFn: async () => {
      const res = await fetch('/api/rebalancing')
      const data = await res.json()
      return data.data || []
    },
  })

  const filteredSignals = selectedExpert
    ? signals.filter((s: any) => s.expertId === selectedExpert)
    : signals

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      {/* Header */}
      <header className="bg-[#0F1629] border-b border-[#2A3A5C] px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h1 className="text-white font-bold text-lg">AlphaInsight AI</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#7A8FA6] text-xs">专家校准的语义投资组合智能</span>
          </div>
        </div>
      </header>

      {/* Rebalancing Alert */}
      <RebalancingAlert events={rebalancing} />

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        {/* Portfolio Summary */}
        <PortfolioSummary holdings={holdings} experts={experts} signals={signals} />

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-5">
          {/* Left: Expert Grid */}
          <div className="space-y-5">
            <ExpertGrid
              experts={experts}
              signals={signals}
              selectedExpert={selectedExpert}
              onSelectExpert={setSelectedExpert}
            />
          </div>

          {/* Center: Signal Feed */}
          <div className="min-w-0">
            {selectedExpert && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-[#7A8FA6]">已筛选:</span>
                <span className="text-xs text-white font-semibold">
                  {experts.find((e: any) => e.id === selectedExpert)?.name}
                </span>
                <button
                  onClick={() => setSelectedExpert(null)}
                  className="text-xs text-[#3B82F6] hover:underline"
                >
                  清除
                </button>
              </div>
            )}
            <SignalFeed signals={filteredSignals} experts={experts} />
          </div>

          {/* Right: Holdings + Technical */}
          <div className="space-y-5">
            <HoldingsPanel holdings={holdings} />
            <TechnicalPanel indicators={technical} />
            <SuggestedETFPanel />
            <ManualInjectionPanel />
          </div>
        </div>
      </main>
    </div>
  )
}
