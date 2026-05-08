'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { LiveState } from '@/types/directus'

type Props = {
  liveState: LiveState
  onPatch:   (partial: Partial<LiveState>) => Promise<void>
  disabled?: boolean
}

export function OperatorNotes({ liveState, onPatch, disabled }: Props) {
  const [draft, setDraft] = useState(liveState.notes ?? '')
  const dirty = draft !== (liveState.notes ?? '')

  async function handleSave() {
    await onPatch({ notes: draft })
  }

  return (
    // This div provides the border, shadow, and padding for the card itself
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-zinc-900 mb-2">Operator Notes</p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        rows={4}
        placeholder="Catatan internal operator..."
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 resize-none focus:outline-none focus:border-zinc-900 disabled:opacity-50"
      />
      <div className="flex justify-end mt-3">
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