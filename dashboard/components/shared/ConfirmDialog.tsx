'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

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
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !loading && setOpen(false)}
        >
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">

            {/* -- Header -- */}
            <div className="px-6 pt-6 pb-5 border-b border-zinc-100">
              <h2 className="text-base font-bold text-zinc-900">{title}</h2>
              <p className="mt-1 text-sm text-zinc-500 leading-relaxed break-words">{description}</p>
            </div>

            {/* -- Footer -- */}
            <div className="px-6 pb-5 pt-4 border-t border-zinc-100 flex justify-end gap-2">
              <Button
                variant="noBorder"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant={variant}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Loading...' : confirmLabel}
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}