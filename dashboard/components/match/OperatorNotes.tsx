'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { LiveState } from '@/types/directus'

const MAX_NOTES_LENGTH = 500

type Props = {
  liveState: LiveState
  onPatch:   (partial: Partial<LiveState>) => Promise<void>
  disabled?: boolean
}

export function OperatorNotes({ liveState, onPatch, disabled }: Props) {
  const externalNotes = liveState.notes ?? ''
  const [draft, setDraft] = useState(externalNotes)

  const lastExternalRef = useRef(externalNotes)

  useEffect(() => {
    const hasLocalEdits = draft !== lastExternalRef.current
    if (!hasLocalEdits) {
      setDraft(externalNotes)
    }
    lastExternalRef.current = externalNotes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalNotes])

  const dirty = draft !== externalNotes

  function handleChange(val: string) {
    // FIX: enforce the server-side 500-char limit on the client so the user
    // gets immediate feedback instead of a silent validation rejection from Zod.
    if (val.length > MAX_NOTES_LENGTH) return
    setDraft(val)
  }

  async function handleSave() {
    await onPatch({ notes: draft })
    // Sync the ref so the next external update sees no local edits.
    lastExternalRef.current = draft
  }

  const remaining = MAX_NOTES_LENGTH - draft.length

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-zinc-900 mb-2">Operator Notes</p>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        rows={4}
        maxLength={MAX_NOTES_LENGTH}
        placeholder="Catatan internal operator..."
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 resize-none focus:outline-none focus:border-zinc-900 disabled:opacity-50"
      />
      <div className="flex items-center justify-between mt-3">
        {/* FIX: show remaining chars so operators know they're approaching the limit */}
        <span className={`text-xs tabular-nums ${remaining <= 50 ? 'text-amber-500' : 'text-zinc-300'}`}>
          {remaining} left
        </span>
        <Button
          onClick={handleSave}
          disabled={disabled || !dirty}
          className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-8 px-4"
        >
          Save &amp; Broadcast
        </Button>
      </div>
    </div>
  )
}