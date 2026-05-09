'use client'

import { useEditor, EditorContent, Editor, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import YoutubeExtension from '@tiptap/extension-youtube'
import { PageHeader } from '@/components/layout/PageHeader'


// ---------------------------------------------------------------------------
// @tiptap/extension-image shim — run: npm install @tiptap/extension-image
// ---------------------------------------------------------------------------
import type { AnyExtension } from '@tiptap/core'
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: { setImage(options: { src: string; alt?: string; title?: string }): ReturnType }
  }
}
let TiptapImage: AnyExtension
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  TiptapImage = require('@tiptap/extension-image').default
} catch {
  TiptapImage = { name: 'image', type: 'node' } as never
}

import { useEffect, useRef, useState } from 'react'
import { readItem, readItems } from '@directus/sdk'
import { directus, getAssetUrl } from '@/lib/directus'
import { createArticleAction, updateArticleAction, uploadThumbnailAction } from '../_actions'
import { useRouter } from '@/hooks/useRouter'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NewsArticle, NewsCategory } from '@/types/directus'
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus, Link as IconLink,
  Youtube as YoutubeIcon, Image as ImageIcon, Eye, X, FileCode,
  RefreshCcw
} from 'lucide-react'
import { YoutubeDialog, GDriveDialog, PreviewModal } from './_modals'

// ---------------------------------------------------------------------------
// CodeMirror 6 — raw HTML editor
// run: npm install codemirror @codemirror/lang-html
// ---------------------------------------------------------------------------
import { EditorView, lineNumbers, drawSelection, highlightActiveLine, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { html as cmHtml } from '@codemirror/lang-html'
import { syntaxHighlighting, HighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// --- Constants -------------------------------------------------

const CATEGORY_OPTIONS: { value: NewsCategory; label: string }[] = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'result',       label: 'Result'        },
  { value: 'news',         label: 'News'          },
  { value: 'update',       label: 'Update'        },
]

const PUBLISHED_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day:      'numeric',
  month:    'long',
  year:     'numeric',
  hour:     '2-digit',
  minute:   '2-digit',
  timeZone: 'Asia/Jakarta',
}

// --- Helpers ---------------------------------------------------

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

/**
 * Client-side HTML sanitizer for raw-mode input.
 *
 * Defence-in-depth: Tiptap's ProseMirror parser already drops any node/mark not
 * in the schema, but we strip the most dangerous vectors *before* calling
 * setContent so nothing slips through during the parse step.
 *
 * Stripped:  <script>, <style>, <object>, <embed>, <form>, <meta>, <link>, <base>
 * Removed:   all on* event-handler attributes
 * Removed:   javascript: / data: / vbscript: in href / src / action
 */
function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const BANNED_TAGS = ['script', 'style', 'object', 'embed', 'form', 'meta', 'link', 'base']
  BANNED_TAGS.forEach((tag) => doc.querySelectorAll(tag).forEach((el) => el.remove()))

  const UNSAFE_PROTO = /^\s*(javascript|data|vbscript):/i
  const URL_ATTRS    = ['href', 'src', 'action', 'formaction']

  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on')) { el.removeAttribute(attr.name); return }
      if (URL_ATTRS.includes(attr.name) && UNSAFE_PROTO.test(attr.value)) {
        el.removeAttribute(attr.name)
      }
    })
  })

  return doc.body.innerHTML
}

/**
 * Adds indented line-breaks to a flat HTML string so raw mode is human-readable.
 * Block-level tags each get their own line; inline content stays inline.
 * This is intentionally lightweight — it's a display aid, not a full formatter.
 */
function prettyHtml(html: string): string {
  const BLOCK = /^(p|div|section|article|header|footer|main|aside|nav|h[1-6]|ul|ol|li|blockquote|pre|figure|figcaption|table|thead|tbody|tfoot|tr|th|td|hr|br|img|iframe|youtube-component)$/i

  // Tokenise into tags and text runs
  const tokens = html.match(/(<[^>]+>|[^<]+)/g) ?? []
  let out    = ''
  let indent = 0

  for (const token of tokens) {
    const tagMatch = token.match(/^<(\/?)([\w-]+)/)
    if (!tagMatch) {
      // Text node — emit inline, trimming pure-whitespace chunks
      const t = token.replace(/\s+/g, ' ')
      if (t.trim()) out += t
      continue
    }

    const [, closing, tag] = tagMatch
    if (!tag) continue                  // regex guarantees this, but TS doesn't know that
    const isBlock   = BLOCK.test(tag)
    const selfClose = /\/>$/.test(token) || /^(hr|br|img|input|meta|link)$/i.test(tag)

    if (isBlock) {
      if (closing) {
        indent = Math.max(0, indent - 1)
        out += `\n${'  '.repeat(indent)}${token}`
      } else {
        out += `\n${'  '.repeat(indent)}${token}`
        if (!selfClose) indent++
      }
    } else {
      out += token
    }
  }

  return out.trim()
}

// --- Node Views ------------------------------------------------

/**
 * Renders Drive images inside the editor with a hover-activated delete button.
 * onMouseDown + preventDefault keeps editor focus so deleteNode() works reliably.
 */
function DriveImageNodeView({ node, deleteNode, editor, getPos }: NodeViewProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <NodeViewWrapper>
      <div
        className="relative my-4"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string) ?? ''}
          title={(node.attrs.title as string) ?? undefined}
          className="rounded-xl max-w-full w-full block"
        />
        {hovered && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onMouseDown={(e) => { 
                e.preventDefault()
                // Safely check getPos for TypeScript
                if (typeof getPos === 'function') {
                  const pos = getPos()
                  if (typeof pos === 'number') {
                    editor.chain().setNodeSelection(pos).run()
                  }
                }
                window.dispatchEvent(new CustomEvent('open-gdrive'))
              }}
              className="rounded p-1.5 text-white/90 transition-colors hover:bg-black/50 hover:text-white"
              title="Change image link"
            >
              <RefreshCcw size={14} />
            </button>
            <div className="h-4 w-px bg-white/20" />
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); deleteNode() }}
              className="rounded p-1.5 text-white/90 transition-colors hover:bg-black/50 hover:text-red-400"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

/**
 * Renders YouTube iframes inside the editor with a hover-activated delete button.
 * `node.attrs.src` is already the full embed URL built by the YouTube extension.
 */
function YoutubeNodeView({ node, deleteNode }: NodeViewProps) {
  const [hovered, setHovered] = useState(false)
  const width  = (node.attrs.width  as number) || 640
  const height = (node.attrs.height as number) || 360

  return (
    <NodeViewWrapper>
      <div
        className="relative my-4"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="w-full overflow-hidden rounded-lg bg-zinc-100"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <iframe
            src={node.attrs.src as string}
            width={width}
            height={height}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        {hovered && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); deleteNode() }}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
            title="Remove video"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  )
}

// --- CodeMirror: Catppuccin Latte theme + HTML highlight --------------------
// https://github.com/catppuccin/catppuccin

const latteTheme = EditorView.theme({
  // Base
  '&': { 
    background: '#eff1f5', 
    color: '#4c4f69',
    maxWidth: '100%', // Prevent the editor from pushing the parent's width
  },
  '.cm-content': {
    caretColor:  '#1e66f5',
    fontFamily:  "'JetBrains Mono', monospace",
    fontSize:    '13px',
    lineHeight:  '1.65',
    padding:     '16px 0',
    whiteSpace:  'pre', // This allows horizontal scrolling instead of wrapping
  },
  '.cm-scroller': { 
    overflowX: 'auto', // Enable horizontal scroll
    overflowY: 'visible', // Allow the container to grow vertically
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-line': { padding: '0 16px' },
  // Cursor & selection
  '.cm-cursor, .cm-dropCursor':   { borderLeftColor: '#1e66f5' },
  '.cm-selectionBackground':      { background: '#bcc0cc' },
  '&.cm-focused .cm-selectionBackground': { background: '#acb0be' },
  '.cm-selectionMatch':           { background: '#ccd0da' },
  // Gutters (line numbers)
  '.cm-gutters': {
    background:  '#e6e9ef',
    color:       '#9ca0b0',
    border:      'none',
    borderRight: '1px solid #ccd0da',
    fontFamily:  "'JetBrains Mono', monospace",
    fontSize:    '12px',
    paddingRight:'4px',
  },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '36px', textAlign: 'right' },
  '.cm-activeLineGutter': { background: '#dce0e8' },
  '.cm-activeLine':       { background: 'rgba(220,224,232,0.45)' },
  // Bracket matching
  '.cm-matchingBracket':    { background: '#bcc0cc', outline: '1px solid #9ca0b0' },
  '.cm-nonmatchingBracket': { background: '#f38ba822' },
}, { dark: false })

const latteHighlight = HighlightStyle.define([
  // HTML structure
  { tag: t.tagName,          color: '#1e66f5', fontWeight: '500' }, // blue   — <p>, <div>…
  { tag: t.angleBracket,     color: '#04a5e5' },                    // sky    — < >
  { tag: t.attributeName,    color: '#8839ef' },                    // mauve  — href, class…
  { tag: t.attributeValue,   color: '#40a02b' },                    // green  — "value"
  { tag: t.string,           color: '#40a02b' },                    // green  — quoted strings
  // Entities & special
  { tag: t.character,             color: '#fe640b' },                    // peach  — &amp; &nbsp;
  { tag: t.processingInstruction, color: '#e64553', fontStyle: 'italic' }, // red  — <!DOCTYPE>
  // Comments
  { tag: t.comment,          color: '#9ca0b0', fontStyle: 'italic' }, // overlay2
  // Fallback text
  { tag: t.content,          color: '#4c4f69' },
  { tag: t.punctuation,      color: '#6c6f85' },
])

// --- HtmlCodeEditor ------------------------------------------------------------

/**
 * CodeMirror 6 editor used in raw-HTML mode.
 *
 * Height behaviour mirrors the rich editor:
 *  • grows vertically with content (no internal y-scroll, page scrolls)
 *  • scrolls horizontally for long lines
 */
function HtmlCodeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef      = useRef<EditorView | null>(null)
  const onChangeRef  = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          indentOnInput(),
          bracketMatching(),
          cmHtml(),
          latteTheme,
          syntaxHighlighting(latteHighlight),
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString())
          }),
        ],
      }),
      parent: containerRef.current,
    })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const cur = view.state.doc.toString()
    if (cur === value) return
    view.dispatch({ changes: { from: 0, to: cur.length, insert: value } })
  }, [value])

  // Added w-full max-w-full overflow-hidden to prevent horizontal stretching
  return <div ref={containerRef} className="w-full max-w-full overflow-hidden" />
}


// --- ToolbarBtn ------------------------------------------------

function ToolbarBtn({
  onClick, active, title, children,
}: {
  onClick:  () => void
  active?:  boolean
  title?:   string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-zinc-200 text-zinc-900'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
      }`}
    >
      {children}
    </button>
  )
}

// --- EditorToolbar ---------------------------------------------

function EditorToolbar({ editor, onYoutube, onGDrive, rawMode, onToggleRaw }: {
  editor:       Editor | null
  onYoutube:    () => void
  onGDrive:     () => void
  rawMode:      boolean
  onToggleRaw:  () => void
}) {
  if (!editor) return null

  const handleSetLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url  = window.prompt('URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    if (/^javascript:/i.test(url.trim())) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
      
      {/* Rich-text controls — wrapped in a flex container so opacity/disabled state works */}
      <div className={`flex flex-wrap items-center gap-0.5 transition-all duration-200 ${
        rawMode ? 'opacity-30 grayscale pointer-events-none select-none' : ''
      }`}>
        <ToolbarBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </ToolbarBtn>

        <div className="mx-1 h-4 w-px bg-zinc-200" />

        <ToolbarBtn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={14} />
        </ToolbarBtn>

        <div className="mx-1 h-4 w-px bg-zinc-200" />

        <ToolbarBtn title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Ordered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Inline Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={14} />
        </ToolbarBtn>

        <div className="mx-1 h-4 w-px bg-zinc-200" />

        <ToolbarBtn title="Link" active={editor.isActive('link')} onClick={handleSetLink}>
          <IconLink size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Horizontal Rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={14} />
        </ToolbarBtn>

        <div className="mx-1 h-4 w-px bg-zinc-200" />

        <ToolbarBtn title="Embed YouTube Video" active={false} onClick={onYoutube}>
          <YoutubeIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="Embed Google Drive Image" active={false} onClick={onGDrive}>
          <ImageIcon size={14} />
        </ToolbarBtn>
      </div>

      {/* Raw HTML toggle — fully opaque and interactive on the right side */}
      <div className="ml-auto">
        <ToolbarBtn
          title={rawMode ? 'Back to rich editor' : 'Edit raw HTML'}
          active={rawMode}
          onClick={onToggleRaw}
        >
          <FileCode size={14} />
        </ToolbarBtn>
      </div>
    </div>
  )
}

// --- Main component --------------------------------------------

export default function ArticleEditorPage({ params }: { params: { articleId: string } }) {
  const { articleId } = params
  const isNew         = articleId === 'new'
  const router        = useRouter()

  const [title,              setTitle]              = useState('')
  const [slug,               setSlug]               = useState('')
  const [slugLocked,         setSlugLocked]         = useState(false)
  const [excerpt,            setExcerpt]            = useState('')
  const [category,           setCategory]           = useState<NewsCategory>('news')
  const [eventId,            setEventId]            = useState('__none__')
  const [thumbnailId,        setThumbnailId]        = useState<string | null>(null)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [events,             setEvents]             = useState<{ id: string; name: string }[]>([])
  const [saving,             setSaving]             = useState(false)
  const [loadedArticle,      setLoadedArticle]      = useState<NewsArticle | null>(null)
  const [initialContent,     setInitialContent]     = useState<string | null>(null)

  // Dialogs
  const [previewOpen,  setPreviewOpen]  = useState(false)
  const [youtubeOpen,  setYoutubeOpen]  = useState(false)
  const [gdriveOpen,   setGdriveOpen]   = useState(false)

  // Raw HTML mode
  const [rawMode, setRawMode] = useState(false)
  const [rawHtml, setRawHtml] = useState('')

  useEffect(() => {
    const handler = () => setGdriveOpen(true)
    window.addEventListener('open-gdrive', handler)
    return () => window.removeEventListener('open-gdrive', handler)
  }, [])

  const handleToggleRaw = () => {
    if (!rawMode) {
      // Snapshot current rich content into the textarea
      setRawHtml(prettyHtml(editor?.getHTML() ?? ''))
      setRawMode(true)
    } else {
      // Sanitize then apply back to the rich editor
      const clean = sanitizeHtml(rawHtml)
      editor?.commands.setContent(clean)
      setRawMode(false)
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage
        .extend({
          addAttributes(): Record<string, unknown> {
            return {
              src:   { default: null },
              alt:   { default: null },
              title: { default: null },
              // Preserve any style attribute present in existing saved HTML
              style: {
                default:    null,
                parseHTML:  (el: HTMLElement) => el.getAttribute('style'),
                renderHTML: (attrs: Record<string, string | null>) =>
                  attrs.style ? { style: attrs.style } : {},
              },
            }
          },
          addNodeView() {
            return ReactNodeViewRenderer(DriveImageNodeView)
          },
        })
        .configure({ HTMLAttributes: { class: 'rounded-xl max-w-full' } }),
      YoutubeExtension
        .extend({
          addNodeView() {
            return ReactNodeViewRenderer(YoutubeNodeView)
          },
        })
        .configure({ width: 640, height: 360, nocookie: true }),
    ],
    editorProps: {
      attributes: {
        // No prose class — custom <style> block below avoids Tailwind preflight fights.
        class: 'editor-content min-h-[480px] p-4 focus:outline-none',
      },
    },
  })

  // Set editor content once the async article load resolves
  useEffect(() => {
    if (editor && initialContent !== null) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  // Load events list.
  // Cancellation flag prevents setState on an unmounted component.
  useEffect(() => {
    let cancelled = false
    directus
      .request(readItems('events', { fields: ['id', 'name'], sort: ['name'], limit: -1 }))
      .then((res) => { if (!cancelled) setEvents(res as { id: string; name: string }[]) })
      .catch(() => { /* non-critical — events dropdown stays empty */ })
    return () => { cancelled = true }
  }, [])

  // Load existing article.
  // Cancellation flag prevents setState on an unmounted component.
  useEffect(() => {
    if (isNew) return
    let cancelled = false
    directus
      .request(readItem('news', articleId, {
        fields: [
          'id', 'title', 'slug', 'excerpt', 'category',
          'event_id', 'thumbnail', 'content', 'is_published', 'published_at',
        ],
      }))
      .then((res) => {
        if (cancelled) return
        const a = res as NewsArticle
        setLoadedArticle(a)
        setTitle(a.title)
        setSlug(a.slug)
        setSlugLocked(true)
        setExcerpt(a.excerpt ?? '')
        setCategory(a.category)
        setEventId(a.event_id ?? '__none__')
        setThumbnailId(a.thumbnail ?? null)
        setInitialContent(a.content ?? '')
      })
    return () => { cancelled = true }
  }, [isNew, articleId])

  useEffect(() => {
    if (!slugLocked) setSlug(toSlug(title))
  }, [title, slugLocked])

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const result = await uploadThumbnailAction(form)
      if (result.success) setThumbnailId(result.id)
    } finally {
      setThumbnailUploading(false)
    }
  }

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const resolvedSlug        = slug.trim() || toSlug(title)
      const existingPublishedAt = loadedArticle?.published_at ?? null
      const publishedAt         = publish
        ? (existingPublishedAt ?? new Date().toISOString())
        : existingPublishedAt

      const payload = {
        title:        title.trim(),
        slug:         resolvedSlug,
        excerpt:      excerpt.trim() || null,
        category,
        event_id:     eventId === '__none__' ? null : eventId,
        thumbnail:    thumbnailId,
        content:      editor?.getHTML() ?? null,
        is_published: publish,
        published_at: publishedAt,
      }

      if (isNew) {
        const result = await createArticleAction(payload)
        if (result.success) router.push(`/articles/${result.article.id}`)
      } else {
        const result = await updateArticleAction(articleId, payload)
        if (result.success) setLoadedArticle((prev) => (prev ? { ...prev, ...payload } : null))
      }
    } finally {
      setSaving(false)
    }
  }

  const isPublished = loadedArticle?.is_published ?? false

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" />
      <style>{`
        .editor-content ul  { list-style-type: disc;    padding-left: 1.5rem; margin: 0.5rem 0; }
        .editor-content ol  { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .editor-content li  { margin: 0.2rem 0; }
        .editor-content li p { margin: 0; }
        .editor-content blockquote { border-left: 3px solid #d4d4d8; padding-left: 1rem; margin: 1rem 0; color: #71717a; font-style: italic; }
        .editor-content h2 { font-size: 1.5rem; font-weight: 700; margin: 1.25rem 0 0.4rem; line-height: 1.3; }
        .editor-content h3 { font-size: 1.2rem;  font-weight: 600; margin: 1rem 0 0.3rem;   line-height: 1.3; }
        .editor-content a  { color: #2563eb; text-decoration: underline; }
        .editor-content a:hover { color: #1d4ed8; }
        .editor-content p  { margin: 0.5rem 0; }
        .editor-content p:first-child { margin-top: 0; }
        .editor-content code { background: #f4f4f5; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875em; font-family: ui-monospace, monospace; }
        .editor-content hr  { border-color: #e4e4e7; margin: 1.5rem 0; }
        .editor-content img { border-radius: 0.75rem; max-width: 100%; margin: 1rem 0; }
        .editor-content iframe { width: 100%; border-radius: 0.5rem; margin: 1rem 0; }
      `}</style>

      <div>
				{/* 1. COMPACT HEADER */}
				<div className="-mx-6 -mt-6">
					<PageHeader
						breadcrumbs={[
							{ label: 'Articles', href: '/articles' },
							{ label: isNew ? 'New Article' : (loadedArticle?.title ?? '...') }
						]}
						actions={
							<div className="flex items-center gap-2">
								<Button variant="default" onClick={() => setPreviewOpen(true)}>
									<Eye size={14} className="mr-1.5 -ml-0.5" /> Preview
								</Button>
								<Button 
									variant="default" 
									disabled={saving || !title.trim()} 
									onClick={() => handleSave(false)}
								>
									Save Draft
								</Button>
								<Button 
									variant="filled" 
									disabled={saving || !title.trim()} 
									onClick={() => handleSave(true)}
								>
									{isPublished ? 'Update' : 'Publish'}
								</Button>
							</div>
						}
					/>
				</div>

				<div className="pt-6">
					{/* 2. TITLE AREA: Placed above the grid to align sidebar with editor below */}
					<div className="mb-6 max-w-[calc(100%-312px)] px-1"> 
						<input
							type="text"
							placeholder="Article Title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="w-full border-0 bg-transparent text-4xl font-extrabold tracking-tight text-zinc-900 placeholder:text-zinc-200 focus:outline-none"
						/>
						<div className="mt-1 flex items-center gap-2 text-xs">
							<span className="font-bold uppercase tracking-wider text-zinc-400">Slug</span>
							<input
								type="text"
								value={slug}
								onChange={(e) => { setSlug(e.target.value); setSlugLocked(true) }}
								style={{ width: `${Math.max(slug.length, 5) + 2}ch` }}
								className="border-0 border-b border-transparent bg-transparent font-mono text-zinc-500 hover:border-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
							/>
						</div>
					</div>

					{/* 3. CONTENT GRID: Editor and Sidebar start at the same vertical level */}
					<div className="grid grid-cols-[1fr_280px] items-start gap-8">
						
						{/* LEFT COLUMN: Editor */}
						<div className="min-w-0">
							<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
								<EditorToolbar
									editor={editor}
									onYoutube={() => setYoutubeOpen(true)}
									onGDrive={() => setGdriveOpen(true)}
									rawMode={rawMode}
									onToggleRaw={handleToggleRaw}
								/>
								{rawMode ? (
									<div className="min-h-[480px]">
										<div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/50 px-4 py-2 text-[11px] text-amber-700 font-medium">
											<span className="text-amber-500">⚠</span>
											<span>Raw HTML mode enabled. Foreign tags will be stripped on save.</span>
										</div>
										<HtmlCodeEditor value={rawHtml} onChange={setRawHtml} />
									</div>
								) : (
									<EditorContent editor={editor} />
								)}
							</div>
						</div>

						{/* RIGHT COLUMN: Sidebar (Sticky) */}
						<aside className="sticky top-6 space-y-4">
							<div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-5 shadow-sm">
								<div className="space-y-2">
									<p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category</p>
									<Select value={category} onValueChange={(v) => setCategory(v as NewsCategory)}>
										<SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
										<SelectContent>
											{CATEGORY_OPTIONS.map((o) => (
												<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Link to Event</p>
									<Select value={eventId} onValueChange={setEventId}>
										<SelectTrigger className="h-9"><SelectValue placeholder="No event" /></SelectTrigger>
										<SelectContent>
											<SelectItem value="__none__">None</SelectItem>
											{events.map((e) => (
												<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Excerpt</p>
									<textarea
										value={excerpt}
										onChange={(e) => setExcerpt(e.target.value)}
										rows={4}
										placeholder="Summarize this article..."
										className="w-full resize-none rounded-md border border-zinc-200 p-3 text-sm focus:border-zinc-400 focus:outline-none"
									/>
								</div>

								<div className="space-y-3">
									<p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Thumbnail</p>
									{thumbnailId && (
										<div className="relative group overflow-hidden rounded-lg border border-zinc-200">
											<img src={getAssetUrl(thumbnailId) ?? ''} alt="Thumbnail" className="aspect-video w-full object-cover" />
											<button 
												onClick={() => setThumbnailId(null)}
												className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<X size={12} />
											</button>
										</div>
									)}
									<label className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 py-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors">
										{thumbnailUploading ? 'Uploading...' : thumbnailId ? 'Replace Image' : 'Upload Image'}
										<input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
									</label>
								</div>
							</div>

							{!isNew && loadedArticle && (
								<div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-2 text-[11px] shadow-sm">
									<div className="flex justify-between items-center text-zinc-500">
										<span className="font-bold uppercase tracking-tighter">Status</span>
										<span className={isPublished ? 'font-bold text-green-600' : 'font-bold text-zinc-900'}>
											{isPublished ? 'Published' : 'Draft'}
										</span>
									</div>
									{loadedArticle.published_at && (
										<div className="flex justify-between items-center text-zinc-500">
											<span className="font-bold uppercase tracking-tighter">Published Date</span>
											<span className="text-zinc-900 font-medium">
												{new Date(loadedArticle.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
											</span>
										</div>
									)}
								</div>
							)}
						</aside>
					</div>
				</div>
			</div>

      {/* Modals */}
      {previewOpen && (
        <PreviewModal
          title={title}
          content={editor?.getHTML() ?? ''}
          thumbnailId={thumbnailId}
          category={category}
          publishedAt={loadedArticle?.published_at ?? null}
          onClose={() => setPreviewOpen(false)}
        />
      )}
      {youtubeOpen && editor && (
        <YoutubeDialog editor={editor} onClose={() => setYoutubeOpen(false)} />
      )}
      {gdriveOpen && editor && (
        <GDriveDialog editor={editor} onClose={() => setGdriveOpen(false)} />
      )}
    </>
  )
}