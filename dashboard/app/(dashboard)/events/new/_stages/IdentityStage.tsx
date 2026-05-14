// Tahap 1: Identitas Event
// User ngisi nama, deskripsi, slug, lokasi, dan tipe event di sini

import { Type, AlignLeft, MapPin, Activity } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { SectionCard, FieldGroup, TEXTAREA } from '../_components'
import type { EventForm } from '../_types'

interface Props {
  form: EventForm
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onChange: (key: keyof EventForm) => (value: string) => void
  onBlur: (key: string) => void
}

export function IdentityStage({ form, errors, touched, onChange, onBlur }: Props) {
  return (
    <div className="animate-in fade-in duration-500">
      <SectionCard title="Informasi Dasar & Identitas">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-6">

          {/* Kolom kiri: Nama + Deskripsi */}
          <div className="space-y-6">
            <FieldGroup
              label="Nama Event*"
              description="Gunakan nama resmi kompetisi"
              error={touched.name ? errors.name : null}
            >
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                  <Type size={12} />
                </div>
                <Input
                  className="pl-8 placeholder:italic placeholder:text-zinc-300"
                  placeholder="Contoh: IPB Sport Championship 2024"
                  value={form.name}
                  onChange={e => onChange('name')(e.target.value)}
                  onBlur={() => onBlur('name')}
                />
              </div>
            </FieldGroup>

            <FieldGroup
              label="Deskripsi*"
              description="Ceritakan tentang event ini"
              error={touched.description ? errors.description : null}
            >
              <div className="relative group">
                <div className="absolute top-2.5 left-2.5 pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                  <AlignLeft size={12} />
                </div>
                <textarea
                  className={cn(TEXTAREA, 'h-40 pl-8 pt-2')}
                  placeholder="Tuliskan detail event anda di sini..."
                  value={form.description}
                  onChange={e => onChange('description')(e.target.value)}
                  onBlur={() => onBlur('description')}
                />
              </div>
            </FieldGroup>
          </div>

          {/* Kolom kanan: Slug + Lokasi + Tipe */}
          <div className="space-y-6">
            <FieldGroup
              label="URL Slug*"
              description="Pastikan unik (lowercase & dash)"
              error={touched.slug ? errors.slug : null}
            >
              {/* Input slug dengan prefix /event/ */}
              <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50/50 overflow-hidden focus-within:bg-white focus-within:ring-1 focus-within:ring-zinc-400 transition-all">
                <span className="pl-2.5 pr-1 text-[10px] font-bold text-zinc-500 shrink-0 select-none">/event/</span>
                <input
                  className="flex-1 bg-transparent py-2 pr-3 text-sm font-semibold outline-none md:text-xs/relaxed lowercase"
                  value={form.slug}
                  onChange={e => onChange('slug')(e.target.value)}
                  onBlur={() => onBlur('slug')}
                />
              </div>
            </FieldGroup>

            <FieldGroup
              label="Lokasi / Venue*"
              description="Tempat fisik pelaksanaan"
              error={touched.location ? errors.location : null}
            >
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                  <MapPin size={12} />
                </div>
                <Input
                  className="pl-8 placeholder:italic placeholder:text-zinc-300"
                  placeholder="Gedung Gymnasium IPB, Bogor"
                  value={form.location}
                  onChange={e => onChange('location')(e.target.value)}
                  onBlur={() => onBlur('location')}
                />
              </div>
            </FieldGroup>

            <FieldGroup label="Tipe Event*" description="Kategori induk kegiatan">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                  <Activity size={12} />
                </div>
                <Select value={form.type} onValueChange={onChange('type')}>
                  <SelectTrigger className="pl-8 h-9 text-sm bg-zinc-50/50 border-zinc-200">
                    <SelectValue placeholder="Pilih Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sport">Sport / Olahraga</SelectItem>
                    <SelectItem value="arts">Arts / Seni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FieldGroup>
          </div>

        </div>
      </SectionCard>
    </div>
  )
}
