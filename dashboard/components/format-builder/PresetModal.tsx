'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useFormatBuilder } from '@/stores/formatBuilder'
import { PRESETS } from '@/lib/formatPresets'

// --- Types -------------------------------------------------------------------

interface PresetModalProps {
  isOpen: boolean
  onClose: () => void
}

// --- Shared label style (same across all modals) ------------------------------

const labelCls =
  'block text-[10px] font-bold uppercase tracking-widest text-zinc-400'

// --- Component ----------------------------------------------------------------

export function PresetModal({ isOpen, onClose }: PresetModalProps) {
  const { loadFromExisting }    = useFormatBuilder()
  const [searchQuery, setSearchQuery]       = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Filtered presets
  const filteredPresets = useMemo(() => {
    return PRESETS.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [searchQuery, selectedCategory])

  const categories = ['All', ...Array.from(new Set(PRESETS.map((p) => p.category)))]

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose]
  )
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 ease-out"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-5xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">

        {/* -- Header -- */}
        <div className="px-6 pt-6 pb-5 border-b border-zinc-100 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Choose a Preset</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Pick a predefined configuration - {PRESETS.length} presets available.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* -- Search & Filter -- */}
        <div className="px-6 py-3 border-b border-zinc-100 flex flex-col sm:flex-row gap-2 items-center shrink-0">
          {/* Search input */}
          <div className="relative w-full flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              autoFocus
              type="text"
              placeholder="Search presets… (e.g. basket, marathon)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-sm font-semibold text-zinc-900 outline-none transition-all placeholder:text-zinc-300 focus:border-zinc-900 focus:bg-white"
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-0.5 sm:pb-0 shrink-0 [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-9 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors border ${
                  selectedCategory === cat
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* -- Cards Grid -- */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/40">
          {filteredPresets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    loadFromExisting({
                      id: '',
                      event_id: '',
                      name: preset.name,
                      match_type: preset.matchType,
                      modules: preset.modules as any,
                    })
                    onClose()
                  }}
                  className="group text-left bg-white p-4 border border-zinc-200 rounded-xl hover:border-zinc-900 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 flex flex-col h-full"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                        {preset.name}
                      </h3>
                      <span className="shrink-0 mt-0.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-400">
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                      {preset.description}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-500">
                      {preset.matchType.replace(/_/g, ' ')}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-500">
                      {preset.modules[0]?.type?.replace(/_/g, ' ') || 'No Engine'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg className="h-8 w-8 text-zinc-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <p className="text-sm font-semibold text-zinc-400">
                No presets match &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All') }}
                className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}