'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { 
  CompetitionCategory, 
  MatchFormat, 
  ParticipantType 
} from '@/types/directus'

type CategoryFormState = {
  name: string
  participant_type: ParticipantType
  format_id: string
  display_order: number
}

type Props = {
  open: boolean
  onClose: () => void
  onSave: (data: CategoryFormState) => Promise<{ success: boolean; error?: string }>
  formats: MatchFormat[]
  editCategory?: CompetitionCategory | null
}

const DEFAULT_FORM: CategoryFormState = {
  name: '',
  participant_type: 'individual',
  format_id: '',
  display_order: 0,
}

export function CategoryDialog({ open, onClose, onSave, formats, editCategory }: Props) {
  const [form, setForm] = useState<CategoryFormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync form saat editCategory berubah atau dialog dibuka
  useEffect(() => {
    if (open) {
      if (editCategory) {
        setForm({
          name: editCategory.name,
          participant_type: editCategory.participant_type,
          format_id: editCategory.format_id ?? '',
          display_order: editCategory.display_order,
        })
      } else {
        setForm(DEFAULT_FORM)
      }
      setError(null)
    }
  }, [open, editCategory])

  const patch = (partial: Partial<CategoryFormState>) => setForm(p => ({ ...p, ...partial }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await onSave(form)
      if (res.success) onClose()
      else setError(res.error || 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(io) => !io && onClose()}>
      {/* Tambahkan bg-white di sini agar tidak transparan */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editCategory ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded">{error}</p>}

          <div className="space-y-1.5">
            <Label>Nama Kategori</Label>
            <Input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="cth. Vocal Solo Pop"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipe Peserta</Label>
            <Select
              value={form.participant_type}
              onValueChange={(v) => patch({ participant_type: v as ParticipantType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Format Pertandingan (Opsional)</Label>
            <Select
              value={form.format_id || 'none'}
              onValueChange={(v) => patch({ format_id: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih format..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa format</SelectItem>
                {formats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Urutan Tampil</Label>
            <Input
              type="number"
              value={form.display_order}
              onChange={(e) => patch({ display_order: Number(e.target.value) })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="noBorder" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}