'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="h-full min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-zinc-200 p-10 rounded-xl shadow-xl text-center space-y-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 text-amber-500">
          <AlertTriangle size={40} />
        </div>
        
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Dashboard Error</h2>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">
            There was an issue loading this part of the dashboard. This can happen due to a temporary connection drop or unexpected data format.
          </p>
          {error.digest && (
            <div className="inline-block px-3 py-1 bg-zinc-100 rounded-md text-[10px] font-mono text-zinc-400 mt-2">
              REF: {error.digest}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            <RotateCcw size={18} />
            <span>Retry</span>
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-zinc-50 text-zinc-900 font-bold rounded-xl border border-zinc-200 transition-all active:scale-95"
          >
            <LayoutDashboard size={18} />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
