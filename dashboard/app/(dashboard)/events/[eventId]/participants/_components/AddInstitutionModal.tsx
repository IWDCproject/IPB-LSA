'use client'

import { useState, useEffect, useCallback } from 'react'
import { createInstitutionAction, updateInstitutionAction } from '../_actions'
import { Button } from '@/components/ui/button'

// --- Types -------------------------------------------------------------------

type Props = {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onSuccess: () => void
  editingInstitution?: { id: string; name: string; color?: string | null; logo?: string | null } | null
}

// --- Shared field styles ------------------------------------------------------

const labelCls =
  'block text-[10px] font-bold uppercase tracking-widest text-zinc-400'

const inputCls =
  'mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition-all placeholder:text-zinc-300 focus:border-zinc-900 focus:bg-white'

// --- Component ----------------------------------------------------------------

export default function AddInstitutionModal({ isOpen, onClose, eventId, onSuccess, editingInstitution }: Props) {
  const [name, setName]         = useState('')
  const [color, setColor]       = useState('#1A3D6E')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving]     = useState(false)

  // Populate fields in edit mode
  useEffect(() => {
    if (isOpen && editingInstitution) {
      setName(editingInstitution.name)
      setColor(editingInstitution.color || '#1A3D6E')
      setLogoFile(null) // Can't pre-populate file input
    } else if (isOpen && !editingInstitution) {
      setName('')
      setColor('#1A3D6E')
      setLogoFile(null)
    }
  }, [isOpen, editingInstitution])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose]
  )
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('eventId', eventId)
      formData.append('color', color)
      if (logoFile) formData.append('logo', logoFile)
      if (editingInstitution) formData.append('institutionId', editingInstitution.id)

      const res = editingInstitution
        ? await updateInstitutionAction(formData)
        : await createInstitutionAction(formData)
        
      if (res.success) {
        setName('')
        setLogoFile(null)
        setColor('#1A3D6E')
        onSuccess()
        onClose()
      } else {
        alert(res.error)
      }
    } catch (error) {
      console.error('Failed to save institution:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">

        {/* -- Header -- */}
        <div className="px-6 pt-6 pb-5 border-b border-zinc-100">
          <h2 className="text-base font-bold text-zinc-900">
            {editingInstitution ? 'Edit Institusi' : 'Tambah Institusi'}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            {editingInstitution ? 'Ubah data institusi.' : 'Isi data institusi untuk event ini.'}
          </p>
        </div>

        {/* -- Body -- */}
        <div className="px-6 py-5 space-y-4">

          {/* Nama Institusi */}
          <div>
            <label htmlFor="inst-name" className={labelCls}>Nama Institusi</label>
            <input
              id="inst-name"
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Universitas Indonesia"
            />
          </div>

          {/* Warna */}
          <div>
            <label htmlFor="inst-color" className={labelCls}>Warna (Hex)</label>
            <div className="mt-1.5 flex items-center gap-2">
              {/* Color preview swatch */}
              <div
                className="h-10 w-10 shrink-0 rounded-lg border border-zinc-200"
                style={{ backgroundColor: color }}
              />
              <input
                id="inst-color"
                className={`${inputCls} mt-0 flex-1`}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#1A3D6E"
              />
            </div>
          </div>

          {/* Logo */}
          <div>
            <label htmlFor="inst-logo" className={labelCls}>Logo</label>
            <label
              htmlFor="inst-logo"
              className="mt-1.5 flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 text-sm font-semibold text-zinc-400 transition-colors hover:border-zinc-400 hover:bg-white"
            >
              <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className={logoFile ? 'text-zinc-700' : ''}>
                {logoFile ? logoFile.name : 'Pilih gambar…'}
              </span>
              <input
                id="inst-logo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        {/* -- Footer -- */}
        <div className="px-6 pb-5 pt-4 border-t border-zinc-100 flex justify-end gap-2">
          <Button variant="noBorder" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="filled"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
          >
            {saving ? 'Menyimpan...' : (editingInstitution ? 'Perbarui' : 'Simpan')}
          </Button>
        </div>

      </div>
    </div>
  )
}