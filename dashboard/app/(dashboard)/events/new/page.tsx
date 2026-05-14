'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from '@/hooks/useRouter'
import { createEventWithAssetsAction } from '../_actions'
import { Info, Calendar, Save, ShieldAlert, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'

import { StageBtn } from './_components'
import { IdentityStage } from './_stages/IdentityStage'
import { VisualsStage } from './_stages/VisualsStage'
import { RegistrationStage } from './_stages/RegistrationStage'
import { TimelineStage } from './_stages/TimelineStage'
import type { EventForm, Phase } from './_types'

// ─── Konfigurasi tahapan wizard ────────────────────────────────────────────────

const STAGES = [
  { id: 'identity', label: '1. Identitas',       sub: 'Nama, Lokasi & Deskripsi', icon: Info       },
  { id: 'visuals',  label: '2. Visual Media',     sub: 'Banner & Poster Event',    icon: ImageIcon  },
  { id: 'links',    label: '3. Tautan & Kontak',  sub: 'Registrasi & Media Sosial', icon: LinkIcon   },
  { id: 'timeline', label: '4. Timeline & Jadwal', sub: 'Atur Tahapan Kegiatan',   icon: Calendar   },
]

const INITIAL_FORM: EventForm = {
  name: '', slug: '', type: 'sport',
  location: '', description: '',
  start_date: '', end_date: '',
  registration_url: '', guidebook_url: '', website_url: '',
  instagram_url: '', url_youtube: '',
  contact_person_name: '', contact_person_email: '', contact_person_link: '',
}

const INITIAL_PHASES: Phase[] = [
  { id: crypto.randomUUID(), label: 'Pendaftaran', date_start: '', time_start: '08:00', status: 'upcoming' },
  { id: crypto.randomUUID(), label: 'Opening',     date_start: '', time_start: '08:00', status: 'upcoming' },
  { id: crypto.randomUUID(), label: 'Closing',     date_start: '', time_start: '08:00', status: 'upcoming' },
]

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

// ─── Validasi per field ────────────────────────────────────────────────────────

function validateField(name: string, value: string): string | null {
  if (name === 'name' && (!value || value.length < 3))
    return 'Nama minimal 3 karakter'

  if (name === 'slug') {
    if (!value || value.length < 3) return 'Slug minimal 3 karakter'
    if (!/^[a-z0-9-]+$/.test(value)) return 'Slug hanya huruf kecil, angka, dan tanda hubung'
  }

  if (name === 'location' && (!value || value.length < 3))
    return 'Lokasi minimal 3 karakter'

  if (name === 'description' && (!value || value.length < 10))
    return 'Deskripsi minimal 10 karakter'

  if ((name === 'start_date' || name === 'end_date') && !value)
    return 'Tanggal wajib diisi'

  if (['registration_url', 'guidebook_url', 'website_url', 'instagram_url', 'url_youtube'].includes(name) && value) {
    try { 
      new URL(value) 
      if (name === 'url_youtube') {
        const isChannel = value.includes('/c/') || value.includes('/channel/') || value.includes('/user/') || value.includes('/@')
        if (isChannel) return 'Harus link video, bukan channel'
        if (!value.includes('youtube.com') && !value.includes('youtu.be')) return 'Harus link YouTube valid'
      }
    } catch { return 'URL tidak valid (harus https://...)' }
  }

  if (name === 'contact_person_email' && value) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email tidak valid'
  }

  return null
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function NewEventPage() {
  const router = useRouter()

  // State navigasi wizard
  const [stageIndex, setStageIndex] = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  // State form
  const [form,   setForm]   = useState<EventForm>(INITIAL_FORM)
  const [phases, setPhases] = useState<Phase[]>(INITIAL_PHASES)

  // Validasi per-field
  const [errors,  setErrors]  = useState<Record<string, string | null>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // State upload gambar
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [cardFile,   setCardFile]   = useState<File | null>(null)
  const [drag, setDrag] = useState({ banner: false, card: false })
  const bannerRef = useRef<HTMLInputElement>(null)
  const cardRef   = useRef<HTMLInputElement>(null)

  // ─── Handler form ──────────────────────────────────────────────────────────

  // Set nilai field sekaligus validasi kalau udah pernah di-touch
  const handleChange = (key: keyof EventForm) => (value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    if (touched[key]) {
      setErrors(prev => ({ ...prev, [key]: validateField(key, value) }))
    }
  }

  // Tandai field sudah di-touch dan langsung validasi
  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    setErrors(prev => ({ ...prev, [name]: validateField(name, (form as any)[name]) }))
  }

  // Auto-generate slug dari nama event (selama slug belum diubah manual)
  useEffect(() => {
    if (!form.name || touched.slug) return
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    setForm(prev => ({ ...prev, slug }))
    if (touched.name) setErrors(prev => ({ ...prev, slug: validateField('slug', slug) }))
  }, [form.name, touched.slug, touched.name])

  // ─── Handler phase manager ─────────────────────────────────────────────────

  const handleAddPhase = () =>
    setPhases(ps => [...ps, { id: crypto.randomUUID(), label: '', date_start: '', time_start: '08:00' }])

  const handleRemovePhase = (id: string) =>
    setPhases(ps => ps.length > 2 ? ps.filter(p => p.id !== id) : ps) // minimal 2 fase

  const handleUpdatePhase = (id: string, patch: Partial<Phase>) =>
    setPhases(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p))

  // ─── Handler upload gambar ─────────────────────────────────────────────────

  const handleFile = (key: 'banner' | 'card', file: File | null) => {
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors(prev => ({ ...prev, [key]: 'Format tidak didukung (JPG/PNG/WebP)' }))
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setErrors(prev => ({ ...prev, [key]: 'Ukuran terlalu besar (maks. 5MB)' }))
      return
    }

    setErrors(prev => ({ ...prev, [key]: null }))
    key === 'banner' ? setBannerFile(file) : setCardFile(file)
  }

  const handleDragChange = (key: 'banner' | 'card', active: boolean) =>
    setDrag(d => ({ ...d, [key]: active }))

  const handleDrop = (key: 'banner' | 'card', e: React.DragEvent) => {
    const file = e.dataTransfer.files[0]
    if (file) handleFile(key, file)
  }

  // ─── Navigasi antar tahap ──────────────────────────────────────────────────

  // Cek apakah tahap saat ini sudah valid untuk lanjut
  const isStageValid = (): boolean => {
    if (stageIndex === 0) {
      return !!(form.name && form.slug && form.location && form.description
        && !errors.name && !errors.slug && !errors.location && !errors.description)
    }
    if (stageIndex === 1) {
      return !!(bannerFile && cardFile && !errors.banner && !errors.card)
    }
    if (stageIndex === 2) {
      return !errors.registration_url && !errors.guidebook_url && !errors.website_url && !errors.contact_person_email
    }
    return true
  }

  const handleNext = () => {
    // Touch semua field di tahap ini supaya error langsung muncul
    const stageFields: Record<number, string[]> = {
      0: ['name', 'slug', 'location', 'description'],
      2: ['registration_url', 'guidebook_url', 'website_url', 'contact_person_email']
    }

    const fields = stageFields[stageIndex] || []
    if (fields.length > 0) {
      const newTouched = { ...touched }
      const newErrors  = { ...errors }
      fields.forEach(f => {
        newTouched[f] = true
        newErrors[f]  = validateField(f, (form as any)[f])
      })
      setTouched(newTouched)
      setErrors(newErrors)
    }

    if (isStageValid()) {
      setGlobalError(null)
      setStageIndex(i => i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setGlobalError('Harap lengkapi semua field yang wajib diisi.')
    }
  }

  const handleBack = () => {
    if (stageIndex === 0) router.push('/events')
    else setStageIndex(i => i - 1)
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setLoading(true)
    setGlobalError(null)

    // Kumpulin semua data ke FormData (server action butuh format ini)
    const data = new FormData()
    Object.entries(form).forEach(([k, v]) => data.append(k, v))
    if (bannerFile) data.append('banner_image', bannerFile)
    if (cardFile)   data.append('card_image', cardFile)
    data.append('phases', JSON.stringify(phases))

    try {
      const res = await createEventWithAssetsAction(data)

      if (res.success) {
        // Langsung redirect ke settings event yang baru dibuat
        router.push(`/events/${res.data.slug}/settings`)
      } else {
        setGlobalError(res.error || 'Gagal membuat event')
        // Kalau error slug duplikat, balik ke tahap 1 dan highlight fieldnya
        if (res.error?.toLowerCase().includes('slug')) {
          setStageIndex(0)
          setErrors(prev => ({ ...prev, slug: 'Slug sudah digunakan, pilih yang lain' }))
        }
      }
    } catch {
      setGlobalError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Tombol navigasi (Batal/Kembali + Lanjut/Submit) ─────────────────────

  const isLastStage = stageIndex === STAGES.length - 1
  const canSubmit   = !loading && !!form.start_date && !!form.end_date

  const ActionButtons = () => (
    <div className="flex items-center gap-2">
      {/* Default punya border foreground bawaan, cocok buat tombol sekunder */}
      <Button
        variant="default"
        onClick={handleBack}
        disabled={loading}
        className="h-8 text-xs px-4"
      >
        {stageIndex === 0 ? 'Batal' : 'Kembali'}
      </Button>

      {!isLastStage ? (
        <Button variant="filled" onClick={handleNext} className="h-8 px-6 text-xs">
          Lanjut
        </Button>
      ) : (
        <Button
          variant="filled"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-8 px-8 text-xs active:scale-95 transition-all"
        >
          {loading
            ? <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save size={14} />
          }
          {loading ? 'Memproses...' : 'Buat Event'}
        </Button>
      )}
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header utama — copy pola dari Access Control page */}
      <div className="-mx-6 -mt-6">
        <div className="pb-2">
          <PageHeader
            breadcrumbs={[{ label: 'Events', href: '/events' }, { label: 'New Event' }]}
            title="Create New Event"
          />
          <p className="text-sm italic text-zinc-500 ml-6 -mt-3">Siapkan ruang kompetisi baru anda</p>
        </div>
      </div>

      {/* Baris tombol navigasi */}
      <div className="flex justify-end mt-3 mb-3">
        <ActionButtons />
      </div>

      {/* Layout utama: sidebar + divider + konten */}
      <div className="flex items-stretch w-full min-h-[calc(100vh-220px)]">

        {/* Sidebar navigasi tahap */}
        <aside className="w-[240px] shrink-0 flex flex-col gap-2 pr-6">
          <div className="space-y-2">
            {STAGES.map((s, i) => (
              <StageBtn
                key={s.id}
                icon={s.icon}
                title={s.label}
                subtext={s.sub}
                active={stageIndex === i}
                isDone={i < stageIndex}
                onClick={() => {
                  // Boleh klik tahap sebelumnya atau yang saat ini valid
                  if (i < stageIndex || isStageValid()) setStageIndex(i)
                }}
              />
            ))}
          </div>

          {/* Error global tampil di bawah sidebar */}
          {globalError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5 mt-2 animate-in fade-in slide-in-from-left-2">
              <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={14} />
              <p className="text-[10px] font-bold text-red-700 leading-tight">{globalError}</p>
            </div>
          )}
        </aside>

        {/* Garis pembatas vertikal */}
        <div className="w-px bg-zinc-200 self-stretch shrink-0" />

        {/* Area konten tahap aktif */}
        <main className="flex-1 min-w-0 pl-6 space-y-6 pb-20">
          {stageIndex === 0 && (
            <IdentityStage
              form={form}
              errors={errors}
              touched={touched}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          )}

          {stageIndex === 1 && (
            <VisualsStage
              bannerFile={bannerFile}
              cardFile={cardFile}
              drag={drag}
              errors={errors}
              onFile={handleFile}
              onDragChange={handleDragChange}
              onDrop={handleDrop}
              bannerRef={bannerRef}
              cardRef={cardRef}
            />
          )}

          {stageIndex === 2 && (
            <RegistrationStage
              form={form}
              errors={errors}
              touched={touched}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          )}

          {stageIndex === 3 && (
            <TimelineStage
              form={form}
              cardFile={cardFile}
              phases={phases}
              errors={errors}
              touched={touched}
              onChange={handleChange}
              onBlur={handleBlur}
              onAddPhase={handleAddPhase}
              onRemovePhase={handleRemovePhase}
              onUpdatePhase={handleUpdatePhase}
            />
          )}
        </main>

      </div>
    </div>
  )
}
