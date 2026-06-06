'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, Type, Send, AlertCircle, CheckCircle } from 'lucide-react'

export default function ManualInjectionPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [injectionType, setInjectionType] = useState<'url' | 'text'>('url')
  const [inputContent, setInputContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const queryClient = useQueryClient()

  const handleSubmit = async () => {
    if (!inputContent.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/manual-inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputContent,
          injectionType,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || '注入失败')
        return
      }

      setResult(data.data)
      queryClient.invalidateQueries({ queryKey: ['signals'] })
      setInputContent('')
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1A2340] rounded-xl border border-[#2A3A5C] p-4">
      <h3 className="text-white font-semibold text-sm mb-3">人工信号注入</h3>

      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-2.5 px-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          注入新信号
        </button>
      ) : (
        <div className="space-y-3">
          {/* Type Toggle */}
          <div className="flex bg-[#0F1629] rounded-lg p-1">
            <button
              onClick={() => setInjectionType('url')}
              className={`flex-1 py-1.5 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
                injectionType === 'url' ? 'bg-[#3B82F6] text-white' : 'text-[#7A8FA6]'
              }`}
            >
              <Link className="w-3 h-3" /> 链接
            </button>
            <button
              onClick={() => setInjectionType('text')}
              className={`flex-1 py-1.5 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
                injectionType === 'text' ? 'bg-[#3B82F6] text-white' : 'text-[#7A8FA6]'
              }`}
            >
              <Type className="w-3 h-3" /> 文本
            </button>
          </div>

          {/* Input */}
          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder={injectionType === 'url' ? '粘贴文章或视频链接...' : '粘贴专家观点文本...'}
            className="w-full h-24 bg-[#0F1629] border border-[#2A3A5C] rounded-lg p-3 text-white text-xs placeholder:text-[#5A6A86] resize-none focus:outline-none focus:border-[#3B82F6]"
          />

          {/* Error */}
          {error && (
            <div className="p-2 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
              <p className="text-[#EF4444] text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="p-2 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg">
              <p className="text-[#10B981] text-xs flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                成功注入 {result.signalsCreated} 条信号 ({result.expertName})
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { setIsOpen(false); setError(''); setResult(null) }}
              className="flex-1 py-2 text-xs text-[#7A8FA6] hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !inputContent.trim()}
              className="flex-1 py-2 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-[#2A3A5C] disabled:text-[#5A6A86] text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              {loading ? '分析中...' : '分析并注入'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
