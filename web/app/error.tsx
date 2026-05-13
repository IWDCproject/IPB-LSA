'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
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
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#11194C] border border-blue-800/40 p-8 rounded-2xl shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle size={32} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bebas text-white tracking-wide">Something went wrong!</h2>
          <p className="text-sm text-white/60 font-jakarta leading-relaxed">
            We encountered an unexpected error. Don&apos;t worry, our team has been notified.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-white/30 mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
          >
            <RefreshCcw size={18} />
            <span>Try Again</span>
          </button>
          
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all active:scale-95"
          >
            <Home size={18} />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
