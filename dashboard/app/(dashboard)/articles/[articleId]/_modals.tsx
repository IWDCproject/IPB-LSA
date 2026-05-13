'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { getAssetUrl } from '@/lib/directus'
import type { NewsCategory } from '@/types/directus'
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'

// --- Shared Constants ------------------------------------------

const labelCls = 'block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5'

// --- Helpers ---------------------------------------------------

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

function extractGdriveId(url: string): string | null {
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1] ?? null
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return m2?.[1] ?? null
}

// --- YouTube Embed Dialog --------------------------------------

export function YoutubeDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [videoId, setVideoId] = useState<string | null>(null)
  const [thumbOk, setThumbOk] = useState<boolean | null>(null)
  const [checked, setChecked] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleCheck = () => {
    const id = extractYoutubeId(url.trim())
    setVideoId(id)
    setThumbOk(null)
    setChecked(true)
  }

  const handleInsert = () => {
    if (!videoId) return
    editor.chain().focus().setYoutubeVideo({
      src: `https://www.youtube.com/watch?v=${videoId}`,
      width: 640,
      height: 360,
    }).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-[480px] rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 border-b border-zinc-100 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Embed YouTube Video</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Add a video player to your article content.</p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className={labelCls}>Video URL</label>
            <div className="flex gap-2">
              <input
                autoFocus
                type="url"
                placeholder="Paste URL..."
                value={url}
                onChange={(e) => { setUrl(e.target.value); setVideoId(null); setThumbOk(null); setChecked(false) }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                className="flex-1 h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition-all placeholder:text-zinc-300 focus:border-zinc-900 focus:bg-white"
              />
              <Button variant="default" className="h-10 px-4 font-bold uppercase tracking-widest text-[10px] border-zinc-200" onClick={handleCheck} disabled={!url.trim()}>
                Check
              </Button>
            </div>
            {checked && !videoId && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-red-500 uppercase tracking-tighter">
                <AlertCircle size={14} /> Invalid Link
              </p>
            )}
          </div>

          {videoId && (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-xl bg-zinc-100 aspect-video flex items-center justify-center border border-zinc-100">
                {thumbOk === null && <Loader2 size={24} className="animate-spin text-zinc-300" />}
                <img
                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                  alt="Preview"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${thumbOk ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setThumbOk(true)}
                  onError={() => setThumbOk(false)}
                />
              </div>
              <div className="flex items-center gap-2">
                {thumbOk === true && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-[10px] font-bold uppercase tracking-widest text-green-600 border border-green-100">
                    <CheckCircle2 size={12} /> Accessible
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
          <Button variant="noBorder" onClick={onClose} className="font-bold uppercase tracking-widest text-[10px] text-zinc-400 hover:text-zinc-900">Cancel</Button>
          <Button variant="filled" onClick={handleInsert} disabled={!videoId} className="bg-zinc-900 text-white font-bold uppercase tracking-widest text-[10px] px-6">
            Insert
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Google Drive Image Dialog ---------------------------------

export function GDriveDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [fileId, setFileId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [checkCount, setCheckCount] = useState(0)

  const embedSrc = fileId ? `/api/drive?id=${fileId}&t=${checkCount}` : null

  useEffect(() => {
    if (editor.isActive('image')) {
      const attrs = editor.getAttributes('image')
      const src = attrs.src as string | undefined
      if (src?.includes('/api/drive?id=')) {
        const extractedId = src.split('id=')[1]?.split('&')[0]
        if (extractedId) {
          setUrl(`https://drive.google.com/file/d/${extractedId}/view`)
          setFileId(extractedId)
          setStatus('checking')
        }
      }
    }
  }, [editor])

  const handleCheck = () => {
    const id = extractGdriveId(url.trim())
    if (!id) { setFileId(null); setStatus('error'); return }
    setFileId(id)
    setCheckCount((c) => c + 1)
    setStatus('checking')
  }

  const handleInsert = () => {
    if (!fileId || status !== 'ok') return
    const cleanSrc = `/api/drive?id=${fileId}`
    editor.chain().focus().setImage({ src: cleanSrc } as any).run()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-[480px] rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 border-b border-zinc-100 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Google Drive Image</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Embed images shared from Google Drive.</p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
            <p className="text-[11px] leading-relaxed text-zinc-500">
              <span className="font-bold text-zinc-900 uppercase tracking-tighter mr-1">Public Access:</span> File must be set to <span className="font-bold text-zinc-700">&quot;Anyone with the link &rarr; Viewer&quot;</span>.
            </p>
          </div>

          <div>
            <label className={labelCls}>File URL</label>
            <div className="flex gap-2">
              <input
                autoFocus
                type="url"
                placeholder="https://drive.google.com/..."
                value={url}
                onChange={(e) => { setUrl(e.target.value); setFileId(null); setStatus('idle') }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                className="flex-1 h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition-all focus:border-zinc-900 focus:bg-white"
              />
              <Button variant="default" className="h-10 border border-zinc-200 font-bold uppercase tracking-widest text-[10px]" onClick={handleCheck} disabled={!url.trim()}>
                Check
              </Button>
            </div>
          </div>

          {embedSrc && status !== 'idle' && (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-xl bg-zinc-50 min-h-[140px] flex items-center justify-center border border-zinc-100">
                {status === 'checking' && <Loader2 size={24} className="animate-spin text-zinc-300" />}
                <img
                  key={embedSrc}
                  src={embedSrc}
                  alt="Preview"
                  className={`w-full rounded-lg transition-opacity duration-300 ${status === 'ok' ? 'opacity-100' : 'opacity-0 absolute'}`}
                  onLoad={() => setStatus('ok')}
                  onError={() => setStatus('error')}
                />
                {status === 'error' && (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Inaccessible File</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-2">
          <Button variant="noBorder" onClick={onClose} className="font-bold uppercase tracking-widest text-[10px] text-zinc-400 hover:text-zinc-900">Cancel</Button>
          <Button variant="filled" onClick={handleInsert} disabled={status !== 'ok'} className="bg-zinc-900 text-white font-bold uppercase tracking-widest text-[10px] px-6">
            Insert
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Preview Modal ---------------------------------------------
// EXACT ORIGINAL CONTENT & CSS PRESERVED

export function PreviewModal({ title, content, thumbnailId, category, publishedAt, onClose }: {
  title:       string
  content:     string
  thumbnailId: string | null
  category:    NewsCategory
  publishedAt: string | null
  onClose:     () => void
}) {
  const formattedDate = new Date(publishedAt ?? Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#fafafa]">
      
      {/* Admin Top Bar - Styled to reference but separate from content */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-200 bg-white/95 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-zinc-900 px-3 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase">
            PREVIEW
          </span>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter">Live Article View</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <X size={18} />
        </button>
      </div>

      {/* 
        Inject exact styles from NewsDetail.module.css. 
        Scoped specifically to .pub-preview to avoid affecting the admin layout. 
      */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&display=swap');

        .pub-preview {
          font-family: 'Plus Jakarta Sans', sans-serif;
          max-width: 720px;
          margin: 0 auto;
          padding: 48px 16px 96px;
        }

        .pub-title {
          font-size: clamp(26px, 5vw, 40px);
          font-weight: 800;
          color: #06125C;
          line-height: 1.2;
          margin: 0 0 20px;
        }

        .pub-byline { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
        .pub-byline-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .pub-author { font-size: 14px; font-weight: 800; color: #374151; }
        .pub-byline-dot { color: #9CA3AF; font-size: 14px; line-height: 1; }
        .pub-date { font-size: 14px; font-weight: 500; color: #6B7280; }
        
        .pub-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: #06125C;
          background: #ffffff;
          border: 1.5px solid #E5E7EB;
          border-radius: 100px;
          padding: 4px 12px;
        }

        .pub-divider { height: 1px; background: #D1D5DB; width: 100%; margin-bottom: 32px; }

        .pub-hero-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 40px;
          background: #E5E7EB;
        }
        .pub-hero-img { width: 100%; height: 100%; object-fit: cover; object-position: center; }

        .pub-body { font-size: 16px; line-height: 1.75; color: #374151; }
        .pub-body h1, .pub-body h2, .pub-body h3, .pub-body h4 { font-weight: 800; color: #06125C; margin-top: 2em; margin-bottom: 0.6em; line-height: 1.3; }
        .pub-body h2 { font-size: 1.5rem; }
        .pub-body h3 { font-size: 1.25rem; }
        .pub-body h4 { font-size: 1.1rem; }
        .pub-body p { margin-top: 0; margin-bottom: 1.4em; }
        .pub-body a { color: #0D26C2; text-decoration: underline; text-underline-offset: 3px; }
        .pub-body a:hover { opacity: 0.75; }
        .pub-body ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.4em; }
        .pub-body ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1.4em; }
        .pub-body li { margin-bottom: 0.4em; }
        .pub-body li p { margin-top: 0; margin-bottom: 0; }
        .pub-body blockquote { border-left: 3px solid #FFC936; margin: 1.6em 0; padding: 0.2em 1.2em; color: #4B5563; font-style: italic; }
        .pub-body code { font-size: 0.875em; background: #F3F4F6; border-radius: 4px; padding: 2px 6px; }
        .pub-body img { max-width: 100%; border-radius: 8px; margin: 1.6em 0; }
        .pub-body hr { border: none; border-top: 1px solid #e4e5e7; margin: 2em 0; }
        .pub-body iframe { width: 100%; border-radius: 8px; margin: 1.6em 0; }
        
        .pub-body table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 1.6em 0; }
        .pub-body th { background: #F9FAFB; color: #06125C; font-weight: 800; text-align: left; padding: 10px 14px; border-bottom: 2px solid #e4e5e7; }
        .pub-body td { padding: 10px 14px; border-bottom: 1px solid #e4e5e7; color: #374151; vertical-align: top; }
        .pub-body tr:hover td { background: #FAFAFA; }
        .pub-body figcaption { font-size: 13px; color: #9CA3AF; text-align: center; margin-top: 8px; font-style: italic; }
      `}</style>

      {/* Recreated Public Layout */}
      <div className="pub-preview">
        <header>
          <h1 className="pub-title">
            {title || <span style={{ color: '#D1D5DB', fontStyle: 'italic', fontWeight: 400 }}>Untitled article</span>}
          </h1>

          <div className="pub-byline">
            <div className="pub-byline-left">
              <span className="pub-author">IPB LSA</span>
              <span className="pub-byline-dot" aria-hidden="true">·</span>
              <time className="pub-date">{formattedDate}</time>
              {category && (
                <span className="pub-badge">{category}</span>
              )}
            </div>
          </div>

          <div className="pub-divider" />
        </header>

        <div className="pub-hero-wrap">
          {thumbnailId ? (
            <img
              src={getAssetUrl(thumbnailId) ?? ''}
              alt={title}
              className="pub-hero-img"
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)' }} />
          )}
        </div>

        <div
          className="pub-body"
          dangerouslySetInnerHTML={{ __html: content || '<p style="color:#a1a1aa">No content yet.</p>' }}
        />
      </div>
    </div>
  )
}