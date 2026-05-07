'use client'

import { useState, useEffect } from 'react'
import { readItems } from '@directus/sdk'
import { directus } from '@/lib/directus'
// --- IMPORT ACTION DI SINI ---
import { createParticipantAction } from '../_actions' 

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type InstitutionOption = { id: string; name: string }
type CategoryOption = { id: string; name: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  eventId: string
  onSuccess: () => void
  preselectedCategoryId?: string
}

export default function AddParticipantModal({
  isOpen,
  onClose,
  eventId,
  onSuccess,
  preselectedCategoryId,
}: Props) {
  const [name, setName] = useState('')
  const [institutionId, setInstitutionId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>(preselectedCategoryId || '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [institutions, setInstitutions] = useState<InstitutionOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])

  // Fetch data (Read) tetap pakai SDK Client karena Public Policy sudah di-set READ
  useEffect(() => {
    if (!isOpen) return
    const fetchData = async () => {
      const [insts, cats] = await Promise.all([
        directus.request(
          readItems('institutions', {
            filter: { event_id: { _eq: eventId } },
            fields: ['id', 'name'],
            limit: -1,
          })
        ),
        directus.request(
          readItems('competition_categories', {
            filter: { event_id: { _eq: eventId } },
            fields: ['id', 'name'],
            limit: -1,
          })
        ),
      ])
      setInstitutions(insts as InstitutionOption[])
      setCategories(cats as CategoryOption[])
    }
    fetchData()
  }, [isOpen, eventId])

  useEffect(() => {
    if (isOpen) {
      setName('')
      setInstitutionId('')
      setNotes('')
      setCategoryId(preselectedCategoryId || '')
    }
  }, [isOpen, preselectedCategoryId])

  // --- BAGIAN YANG DIUBAH TOTAL ---
  const handleSubmit = async () => {
    if (!name.trim() || !categoryId) return
    setSaving(true)
    
    try {
      // Panggil Server Action, bukan directus.request!
      const res = await createParticipantAction({
        competition_category_id: categoryId,
        institution_id: (!institutionId || institutionId === 'none') ? null : institutionId,
        name: name.trim(),
        notes: notes.trim() || '',
      })

      if (res.success) {
        onSuccess()
        onClose()
      } else {
        // Jika Server Action return error (misal auth gagal)
        alert(res.error)
      }
    } catch (error) {
      console.error('Failed to add participant:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Peserta</DialogTitle>
          <DialogDescription>
            Tambahkan peserta ke kategori yang dipilih.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Kategori</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Nama Peserta</Label>
            <Input
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama peserta atau tim"
            />
          </div>
          
          <div>
            <Label>Institusi</Label>
            <Select value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pilih institusi (opsional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa institusi</SelectItem>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Catatan</Label>
            <Input
              className="mt-1.5"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="noBorder" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim() || !categoryId}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}