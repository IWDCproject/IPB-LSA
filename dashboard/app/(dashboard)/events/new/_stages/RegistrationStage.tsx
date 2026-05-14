// Tahap 3: Pendaftaran & Kontak
// Ngumpulin link pendaftaran, guidebook, sosmed, dan info CP

import { ExternalLink, FileText, Globe, Instagram, Youtube, User, Mail, Link as LinkIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SectionCard, FieldGroup } from '../_components'
import type { EventForm } from '../_types'

interface Props {
  form: EventForm
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onChange: (key: keyof EventForm) => (value: string) => void
  onBlur: (key: string) => void
}

export function RegistrationStage({ form, errors, touched, onChange, onBlur }: Props) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Link & Resources */}
      <SectionCard title="Tautan & Sumber Daya">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-6">
          
          <FieldGroup 
            label="URL Pendaftaran*" 
            description="Link pendaftaran eksternal (GForm, dll)"
            error={touched.registration_url ? errors.registration_url : null}
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                <ExternalLink size={12} />
              </div>
              <Input 
                className="pl-8 placeholder:italic placeholder:text-zinc-400" 
                placeholder="https://google.form/..." 
                value={form.registration_url}
                onChange={e => onChange('registration_url')(e.target.value)}
                onBlur={() => onBlur('registration_url')}
              />
            </div>
          </FieldGroup>

          <FieldGroup 
            label="URL Guidebook / TOR" 
            description="Link ke file PDF atau Drive"
            error={touched.guidebook_url ? errors.guidebook_url : null}
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                <FileText size={12} />
              </div>
              <Input 
                className="pl-8 placeholder:italic placeholder:text-zinc-400" 
                placeholder="masukkan link guidebook" 
                value={form.guidebook_url}
                onChange={e => onChange('guidebook_url')(e.target.value)}
                onBlur={() => onBlur('guidebook_url')}
              />
            </div>
          </FieldGroup>

          <FieldGroup 
            label="Website Event" 
            description="Homepage resmi event"
            error={touched.website_url ? errors.website_url : null}
          >
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                <Globe size={12} />
              </div>
              <Input 
                className="pl-8 placeholder:italic placeholder:text-zinc-400" 
                placeholder="https://website-event.com" 
                value={form.website_url}
                onChange={e => onChange('website_url')(e.target.value)}
                onBlur={() => onBlur('website_url')}
              />
            </div>
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup 
              label="Instagram URL"
              description="Untuk tombol redirect ke akun Instagram"
            >
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                  <Instagram size={12} />
                </div>
                <Input 
                  className="pl-8 placeholder:italic placeholder:text-zinc-400" 
                  placeholder="https://instagram.com/username" 
                  value={form.instagram_url}
                  onChange={e => onChange('instagram_url')(e.target.value)}
                  onBlur={() => onBlur('instagram_url')}
                />
              </div>
            </FieldGroup>
            <FieldGroup 
              label="YouTube Video URL"
              description="Untuk menampilkan video/live stream di page event"
              error={touched.url_youtube ? errors.url_youtube : null}
            >
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                  <Youtube size={12} />
                </div>
                <Input 
                  className="pl-8 placeholder:italic placeholder:text-zinc-400" 
                  placeholder="https://youtube.com/watch?v=..." 
                  value={form.url_youtube}
                  onChange={e => onChange('url_youtube')(e.target.value)}
                  onBlur={() => onBlur('url_youtube')}
                />
              </div>
            </FieldGroup>
          </div>
        </div>
      </SectionCard>

      {/* Contact Person */}
      <SectionCard title="Contact Person">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <FieldGroup label="Nama Kontak" error={touched.contact_person_name ? errors.contact_person_name : null}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                <User size={12} />
              </div>
              <Input 
                className="pl-8 h-9 text-xs" 
                placeholder="Nama Penanggung Jawab" 
                value={form.contact_person_name}
                onChange={e => onChange('contact_person_name')(e.target.value)}
                onBlur={() => onBlur('contact_person_name')}
              />
            </div>
          </FieldGroup>

          <FieldGroup label="Email" error={touched.contact_person_email ? errors.contact_person_email : null}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                <Mail size={12} />
              </div>
              <Input 
                className="pl-8 h-9 text-xs" 
                placeholder="email@kampus.id" 
                value={form.contact_person_email}
                onChange={e => onChange('contact_person_email')(e.target.value)}
                onBlur={() => onBlur('contact_person_email')}
              />
            </div>
          </FieldGroup>

          <FieldGroup label="Link WA / No HP" error={touched.contact_person_link ? errors.contact_person_link : null}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-zinc-900 transition-colors">
                <LinkIcon size={12} />
              </div>
              <Input 
                className="pl-8 h-9 text-xs" 
                placeholder="wa.me/628..." 
                value={form.contact_person_link}
                onChange={e => onChange('contact_person_link')(e.target.value)}
                onBlur={() => onBlur('contact_person_link')}
              />
            </div>
          </FieldGroup>
        </div>
      </SectionCard>
    </div>
  )
}
