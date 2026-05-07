// app/(dashboard)/events/[eventId]/participants/_components/AddInstitutionModal.tsx
'use client'

import { useState } from 'react'
import { createInstitutionAction } from '../_actions' // Import action baru
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onSuccess: () => void
}

export default function AddInstitutionModal({ isOpen, onClose, eventId, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#1A3D6E')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)

    try {
      // Gunakan FormData untuk mengirim file dan teks sekaligus
      const formData = new FormData()
      formData.append('name', name)
      formData.append('eventId', eventId)
      formData.append('color', color)
      if (logoFile) {
        formData.append('logo', logoFile)
      }

      const res = await createInstitutionAction(formData)

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
      console.error('Failed to add institution:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Tambahkan bg-white */}
      <DialogContent className="bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Institusi</DialogTitle>
          <DialogDescription>
            Isi data institusi untuk event ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="inst-name">Nama Institusi</Label>
            <Input
              id="inst-name"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Universitas Indonesia"
            />
          </div>
          <div>
            <Label htmlFor="inst-color">Warna (Hex)</Label>
            <Input
              id="inst-color"
              className="mt-1.5"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#1A3D6E"
            />
          </div>
          <div>
            <Label htmlFor="inst-logo">Logo</Label>
            <Input
              id="inst-logo"
              className="mt-1.5"
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="noBorder" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}