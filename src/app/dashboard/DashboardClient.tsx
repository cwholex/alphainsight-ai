'use client'

import { useState, useEffect } from 'react'
import PortfolioSummary from '@/components/PortfolioSummary'
import ExpertGrid from '@/components/ExpertGrid'
import SignalFeed from '@/components/SignalFeed'
import HoldingsPanel from '@/components/HoldingsPanel'
import TechnicalPanel from '@/components/TechnicalPanel'
import ManualInjectionPanel from '@/components/ManualInjectionPanel'
import SuggestedETFPanel from '@/components/SuggestedETFPanel'

export default function DashboardPage() {
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null)
  const [experts, setExperts] = useState<any[]>([])
  const [signals, setSignals] = useState<any[]>([])
  const [holdings, setHoldings] = useState<any[]>([])
  const [technical, setTechnical] = useState<any[]>([])
  const [rebalancing, setRebalancing] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    async function loadData() {
      try {
        const holdingsRes = await fetch('/api/holdings')
        const holdingsData = await holdingsRes.json()
        setDebugInfo(`Status: ${holdingsRes.status}, Data: ${holdingsData.data?.length || 0} items`)
        
        const [expertsRes, signalsRes, technicalRes, rebalancingRes] = await Promise.all([
          fetch('/api/experts').then(r => r.json()),
          fetch('/api/signals').then(r => r.json()),
          fetch('/api/technical').then(r => r.json()),
          fetch('/api/rebalancing').then(r => r.json()),
        ])

        setExperts(expertsRes.data || [])
        setSignals(signalsRes.data || [])
        setHoldings(holdingsData.data || [])
        setTechnical(technicalRes.data || [])
        setRebalancing(rebalancingRes.data || [])
      } catch (e: any) {
        console.error('Failed to load data:', e)
        setError(e.message || 'Unknown error')
        setDebugInfo(`Error: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredSignals = selectedExpert
    ? signals.filter((s: any) => s.expertId === selectedExpert)
    : signals

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="text-[#EF4444]">错误: {error}</div>
      </div>
    )
  }

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
            {debugInfo && (
              <span className="text-[#F59E0B] text-xs font-mono">
                {debugInfo}
              </span>
            )}
          </div>
        </div>
      </header>

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
