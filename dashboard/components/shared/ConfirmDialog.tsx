'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// --- Types -------------------------------------------------------------------

type Props = {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel?: string
  variant?: 'destructive' | 'filled'
  onConfirm: () => void | Promise<void>
}

// --- Component ----------------------------------------------------------------

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'destructive',
  onConfirm,
}: Props) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) },
    []
  )
  useEffect(() => {
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Trigger - rendered inline, opens dialog on click */}
      <div onClick={() => setOpen(true)} className="contents cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 ease-out"
          onClick={(e) => e.target === e.currentTarget && !loading && setOpen(false)}
        >
          <div className="bg-white w-full max-w-[440px] rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* -- Header Content -- */}
            <div className="p-6 sm:p-8 text-left">
              <h2 className="text-lg font-bold text-zinc-900 leading-tight whitespace-normal break-words">
                {title}
              </h2>
              <p className="mt-2.5 text-sm text-zinc-500 leading-relaxed whitespace-normal break-words">
                {description}
              </p>
            </div>

            {/* -- Footer Actions -- */}
            <div className="px-6 py-5 sm:px-8 bg-zinc-50/50 border-t border-zinc-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button
                variant="noBorder"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="w-full sm:w-auto font-semibold text-sm text-zinc-500 hover:text-zinc-900"
              >
                Cancel
              </Button>
              <Button
                variant={variant}
                onClick={handleConfirm}
                disabled={loading}
                className={cn(
                  "w-full sm:w-auto font-bold text-sm px-8 h-10",
                  variant === 'destructive' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md shadow-red-500/10' : ''
                )}
              >
                {loading ? 'Processing...' : confirmLabel}
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}