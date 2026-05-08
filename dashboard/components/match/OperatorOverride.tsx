'use client'

import { useState, useEffect, useRef } from 'react'
import type { LiveState } from '@/types/directus'

// ---------------------------------------------------------------------------
// Diff Algorithm — Simple DP to find changed lines (like Git diff)
// ---------------------------------------------------------------------------
function computeDiff(oldStr: string, newStr: string): ('unchanged' | 'changed')[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  
  const dp: number[][] = Array.from({ length: oldLines.length + 1 }, () => Array(newLines.length + 1).fill(0))
  
  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
      }
    }
  }

  let i = oldLines.length, j = newLines.length
  const statuses: ('unchanged' | 'changed')[] = Array(newLines.length).fill('changed')

  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      statuses[j - 1] = 'unchanged'
      i--
      j--
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--
    } else {
      j--
    }
  }
  return statuses
}

// ---------------------------------------------------------------------------
// JSON syntax highlighter — "Cute Pastel" Theme + Diff Backgrounds
// ---------------------------------------------------------------------------
function highlight(raw: string, diffStatuses?: ('unchanged' | 'changed')[]): string {
  const lines = raw.split('\n')
  
  return lines.map((line, idx) => {
    // 1. Escape HTML
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // 2. Syntax Colorize
    const colorized = escaped.replace(
      /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          // Key vs String
          return /:$/.test(match)
            ? `<span style="color:#8b5cf6; font-weight: 500;">${match}</span>` // Lilac
            : `<span style="color:#ec4899;">${match}</span>`                   // Pink
        }
        if (match === 'true' || match === 'false' || match === 'null') {
          return `<span style="color:#0ea5e9; font-weight: 600;">${match}</span>` // Sky Blue
        }
        return `<span style="color:#14b8a6; font-weight: 500;">${match}</span>`   // Mint Teal
      }
    )

    // 3. Diff styling
    const status = diffStatuses?.[idx] ?? 'unchanged'
    const isChanged = status === 'changed'
    
    // Using inline styles to strictly enforce structural dimensions 
    const bg = isChanged ? 'background-color: rgba(234, 179, 8, 0.15);' : ''
    const shadow = isChanged ? 'box-shadow: inset 3px 0 0 #eab308;' : ''

    // padding: 0 12px 0 16px strictly matches the textarea's pl-4 pr-3
    // height: 20px strictly matches leading-5 to prevent empty lines collapsing
    return `<div style="min-width: 100%; width: max-content; padding: 0 12px 0 16px; height: 20px; ${bg} ${shadow}">${colorized}</div>`
  }).join('')
}

// ---------------------------------------------------------------------------
// Validate JSON — returns error string or null
// ---------------------------------------------------------------------------
function validateJson(raw: string): string | null {
  if (!raw.trim()) return 'Empty input'
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
      return 'Root value must be a JSON object'
    }
    return null
  } catch (e: any) {
    const msg = e?.message ?? 'Invalid JSON'
    return msg.length > 80 ? msg.slice(0, 80) + '...' : msg
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Props = {
  liveState: LiveState
  onPatch:   (partial: Partial<LiveState>) => Promise<void>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function OperatorOverride({ liveState, onPatch }: Props) {
  const [open,            setOpen]            = useState(false)
  const [editing,         setEditing]         = useState(false)
  const[draft,           setDraft]           = useState('')
  const [parseError,      setParseError]      = useState<string | null>(null)
  const [applyError,      setApplyError]      = useState<string | null>(null)
  const [isApplying,      setIsApplying]      = useState(false)
  const[lastSavedAt,     setLastSavedAt]     = useState<string | null>(null)
  const[externalUpdate,  setExternalUpdate]  = useState(false)

  const preRef = useRef<HTMLPreElement>(null)
  const editingRef = useRef(editing)
  
  useEffect(() => { editingRef.current = editing }, [editing])

  const canonical = JSON.stringify(liveState, null, 2)
  const isDirty   = editing && draft !== canonical
  
  // Diff computation runs efficiently inline
  const diffStatuses = editing ? computeDiff(canonical, draft) : undefined

  // Sync view when live state changes externally
  useEffect(() => {
    if (!editingRef.current) {
      setDraft(canonical)
    } else {
      setExternalUpdate(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonical])

  // ---- scroll sync ----------------------------------------------------------

  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop
      preRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // ---- open/close -----------------------------------------------------------

  function handleToggle() {
    if (open) {
      if (isDirty) return 
      setOpen(false)
      setEditing(false)
    } else {
      setDraft(canonical)
      setParseError(null)
      setApplyError(null)
      setExternalUpdate(false)
      setOpen(true)
    }
  }

  // ---- edit mode ------------------------------------------------------------

  function startEdit() {
    setDraft(canonical)
    setParseError(null)
    setApplyError(null)
    setExternalUpdate(false)
    setEditing(true)
  }

  function handleDraftChange(val: string) {
    setDraft(val)
    setApplyError(null)
    setParseError(validateJson(val))
  }

  function handleRevert() {
    setDraft(canonical)
    setParseError(null)
    setApplyError(null)
    setExternalUpdate(false)
  }

  function discardEdit() {
    setDraft(canonical)
    setParseError(null)
    setApplyError(null)
    setExternalUpdate(false)
    setEditing(false)
  }

  // ---- apply ----------------------------------------------------------------

  async function handleApply() {
    const err = validateJson(draft)
    if (err) { setParseError(err); return }

    setIsApplying(true)
    setApplyError(null)
    try {
      const parsed = JSON.parse(draft) as Partial<LiveState>
      await onPatch(parsed)
      setLastSavedAt(new Date().toLocaleTimeString())
      setEditing(false)
      setExternalUpdate(false)
    } catch (e: any) {
      setApplyError(e?.message ?? 'Server error — changes not saved')
    } finally {
      setIsApplying(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const canApply = !parseError && !isApplying && isDirty
  const computedRows = Math.max(3, draft.split('\n').length)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden flex flex-col w-full max-w-full">
      {/* ── Header ── */}
      <button
        onClick={handleToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-50 transition-colors bg-white relative z-20"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">Operator Override</span>
          {isDirty && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 leading-none">
              UNSAVED
            </span>
          )}
          {externalUpdate && !isDirty && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border border-sky-200 bg-sky-50 text-sky-700 leading-none">
              LIVE UPDATED
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-400 shrink-0 ml-3 font-normal">
          {isDirty
            ? 'unsaved changes...'
            : lastSavedAt
              ? `saved ${lastSavedAt}`
              : 'edit live_state directly'}
          <span className="ml-2 font-medium">{open ? '[Collapse]' : '[Expand]'}</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-zinc-100 flex flex-col w-full max-w-full relative">

          {/* ── External-update warning ── */}
          {externalUpdate && editing && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-sky-50 border-b border-sky-100">
              <p className="text-xs text-sky-800 font-medium">
                Notice: Live state was updated from another source while you were editing.
              </p>
              <button
                onClick={handleRevert}
                className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded bg-white text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
              >
                Load latest
              </button>
            </div>
          )}

          {/* ── JSON view / edit ── */}
          <div className="relative bg-white w-full max-w-full">
            {!editing ? (
              <div className="relative w-full overflow-hidden">
                <pre
                  className="m-0 py-3 text-xs font-mono leading-5 overflow-auto max-h-[500px] text-zinc-800 select-text whitespace-pre block w-full max-w-full bg-white"
                  dangerouslySetInnerHTML={{ __html: highlight(canonical) }}
                />
                <button
                  onClick={startEdit}
                  className="absolute top-3 right-4 text-[10px] font-medium px-2.5 py-1 rounded bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200 transition-colors shadow-sm z-20"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="relative w-full max-w-full">
                
                {/* Parse Error Left Indicator */}
                {parseError && (
                  <div className="absolute inset-y-0 left-0 w-1 bg-red-500 z-20 pointer-events-none" />
                )}

                {/* Background syntax & diff layer */}
                <pre
                  ref={preRef}
                  className="m-0 absolute inset-0 py-3 text-xs font-mono leading-5 text-zinc-800 overflow-hidden whitespace-pre pointer-events-none select-none border-none z-0"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: highlight(draft, diffStatuses) }}
                />

                {/* Foreground editing layer (transparent text with visible caret/selection) */}
                <textarea
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onScroll={handleScroll}
                  rows={computedRows}
                  style={{ maxHeight: '500px' }}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  wrap="off"
                  className="m-0 relative block w-full max-w-full pl-4 pr-3 py-3 text-xs font-mono leading-5 bg-transparent text-transparent caret-zinc-900 selection:bg-zinc-200 selection:text-zinc-900 resize-none focus:outline-none whitespace-pre overflow-auto border-none z-10"
                />
              </div>
            )}
          </div>

          {/* ── Error bar ── */}
          {(parseError || applyError) && (
            <div className="flex items-start gap-2 px-4 py-2 bg-red-50 border-t border-red-100">
              <span className="shrink-0 text-[10px] font-bold mt-px px-1.5 py-0.5 rounded bg-red-100 text-red-600 leading-none">Error</span>
              <span className="text-xs text-red-600 font-mono break-all font-medium mt-px">
                {parseError ?? applyError}
              </span>
            </div>
          )}

          {/* ── Action bar ── */}
          <div className="px-4 py-3 bg-white flex items-center justify-end gap-3 flex-wrap border-t border-zinc-100">
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={handleRevert}
                    disabled={!isDirty && !externalUpdate}
                    title="Reset draft to current live state"
                    className="text-xs font-medium px-3 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40 transition-colors"
                  >
                    Revert
                  </button>
                  <button
                    onClick={discardEdit}
                    title="Exit edit mode without applying"
                    className="text-xs font-medium px-3 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!canApply}
                    title={parseError ? parseError : !isDirty ? 'No changes to apply' : 'Apply to server'}
                    className="text-xs font-medium px-4 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    {isApplying ? 'Applying...' : 'Apply'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium px-3 py-1.5 rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}